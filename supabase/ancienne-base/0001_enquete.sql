-- Enquête : jeu d'enquête policière (site djoul75.github.io/enquete).
-- Partage le projet Supabase de la plateforme perso (mêmes comptes, table
-- profiles, push_subscriptions) mais n'en dépend pas autrement.
--
-- Toutes les tables ont RLS activé SANS policy : le navigateur ne lit ni
-- n'écrit jamais directement. Tout passe par les fonctions enquete_* en
-- security definer ci-dessous, qui vérifient le joueur, comptent les
-- questions et ne révèlent la solution qu'une fois la partie close.
-- Le worker du VPS utilise la clé service_role (qui ignore RLS).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Qui a le droit de jouer (Jules et Joséphine). En duel, tous les joueurs
-- inscrits participent.
create table enquete_joueurs (
  user_id uuid primary key references profiles (id) on delete cascade,
  nom text not null
);

-- Une affaire = la partie visible (récit, suspects, lieux, intitulés des
-- questions, mobiles) + la partie secrète (réponses, indices, solution),
-- rangée à part pour qu'aucune requête ne puisse la renvoyer par erreur.
create table enquete_affaires (
  id bigint generated always as identity primary key,
  titre text not null,
  public jsonb not null,
  source text not null default 'manuel' check (source in ('manuel', 'hebdo', 'demande')),
  created_at timestamptz not null default now()
);

create table enquete_affaires_secret (
  affaire_id bigint primary key references enquete_affaires (id) on delete cascade,
  secret jsonb not null
);

create table enquete_parties (
  id bigint generated always as identity primary key,
  affaire_id bigint not null references enquete_affaires (id),
  mode text not null check (mode in ('solo', 'duel')),
  cree_par uuid not null references profiles (id),
  -- Duel : fixée à la première accusation (+24 h) pour les autres joueurs.
  echeance timestamptz,
  revelee_at timestamptz,
  notifie_revelation boolean not null default false,
  created_at timestamptz not null default now()
);

create table enquete_participants (
  partie_id bigint not null references enquete_parties (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  notes text not null default '',
  accuse_suspect text,
  accuse_mobile text,
  accuse_preuve text,
  accuse_at timestamptz,
  score int,
  -- Le worker a prévenu les autres que ce joueur a accusé.
  notifie_accusation boolean not null default false,
  -- Le worker a envoyé à ce joueur le rappel « plus que 2 h ».
  notifie_rappel boolean not null default false,
  primary key (partie_id, user_id)
);

-- Ce que chaque joueur a fait : questions posées et lieux fouillés.
create table enquete_journal (
  id bigint generated always as identity primary key,
  partie_id bigint not null,
  user_id uuid not null,
  type text not null check (type in ('question', 'fouille')),
  ref text not null,
  created_at timestamptz not null default now(),
  unique (partie_id, user_id, type, ref),
  foreign key (partie_id, user_id) references enquete_participants (partie_id, user_id) on delete cascade
);

-- Bouton « écrire une nouvelle affaire » : le worker du VPS les traite.
create table enquete_demandes (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'faite', 'erreur')),
  affaire_id bigint references enquete_affaires (id),
  erreur text,
  created_at timestamptz not null default now(),
  traitee_at timestamptz
);

-- Abonnements aux notifications du site Enquête. Séparés de
-- push_subscriptions (plateforme) : chaque site a son propre service worker,
-- et une notification de la plateforme n'a rien à faire sur l'icône du jeu.
create table enquete_abonnements_push (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table enquete_abonnements_push enable row level security;

create policy "un joueur gère ses propres abonnements push"
  on enquete_abonnements_push for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table enquete_joueurs enable row level security;
alter table enquete_affaires enable row level security;
alter table enquete_affaires_secret enable row level security;
alter table enquete_parties enable row level security;
alter table enquete_participants enable row level security;
alter table enquete_journal enable row level security;
alter table enquete_demandes enable row level security;

-- ---------------------------------------------------------------------------
-- Règles du jeu
-- ---------------------------------------------------------------------------
-- 15 questions et 3 fouilles par joueur et par affaire.
-- Score : bon coupable 50 (+ jusqu'à 10 pour les questions économisées),
-- bon mobile 20, bonne preuve 20.

create function enquete_est_joueur()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from enquete_joueurs where user_id = auth.uid());
$$;

create function enquete_indices_trouves(p_partie bigint, p_user uuid)
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(distinct t.indice), '{}')
  from (
    select case j.type
             when 'question' then s.secret -> 'questions' -> j.ref ->> 'indice'
             else s.secret -> 'fouilles' -> j.ref ->> 'indice'
           end as indice
    from enquete_journal j
    join enquete_parties p on p.id = j.partie_id
    join enquete_affaires_secret s on s.affaire_id = p.affaire_id
    where j.partie_id = p_partie and j.user_id = p_user
  ) t
  where t.indice is not null;
$$;

-- Clôt la partie si tout le monde a accusé ou si l'échéance est passée :
-- calcule les scores et ouvre la révélation. Sans effet sinon.
create function enquete_cloturer(p_partie bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_partie enquete_parties;
  v_sol jsonb;
begin
  select * into v_partie from enquete_parties where id = p_partie for update;
  if not found or v_partie.revelee_at is not null then
    return;
  end if;

  if exists (select 1 from enquete_participants where partie_id = p_partie and accuse_at is null)
     and (v_partie.echeance is null or v_partie.echeance > now()) then
    return;
  end if;

  select secret -> 'solution' into v_sol from enquete_affaires_secret where affaire_id = v_partie.affaire_id;

  update enquete_participants pa
  set score = case
    when pa.accuse_suspect is null then 0
    else
      (case when pa.accuse_suspect = v_sol ->> 'coupable'
            then 50 + round(10.0 * greatest(0, 15 - (
                   select count(*) from enquete_journal j
                   where j.partie_id = pa.partie_id and j.user_id = pa.user_id and j.type = 'question'
                 )) / 15)
            else 0 end)
      + (case when pa.accuse_mobile = v_sol ->> 'mobile' then 20 else 0 end)
      + (case when coalesce(v_sol -> 'preuves' ? pa.accuse_preuve, false) then 20 else 0 end)
  end
  where pa.partie_id = p_partie;

  update enquete_parties set revelee_at = now() where id = p_partie;
end;
$$;

-- Lève une erreur si le joueur courant ne peut plus agir sur cette partie.
create function enquete_verifier_actif(p_partie bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform enquete_cloturer(p_partie);
  if not exists (
    select 1
    from enquete_participants pa
    join enquete_parties p on p.id = pa.partie_id
    where pa.partie_id = p_partie and pa.user_id = auth.uid()
      and pa.accuse_at is null and p.revelee_at is null
  ) then
    raise exception 'Cette enquête est close pour toi.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fonctions appelées par le site
-- ---------------------------------------------------------------------------

-- État complet d'une partie, vu par le joueur courant.
create function enquete_etat(p_partie bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partie enquete_parties;
  v_moi enquete_participants;
  v_affaire enquete_affaires;
  v_secret jsonb;
  v_journal jsonb;
  v_autres jsonb;
  v_revelation jsonb;
begin
  if not exists (select 1 from enquete_participants where partie_id = p_partie and user_id = v_uid) then
    raise exception 'Partie introuvable.';
  end if;

  perform enquete_cloturer(p_partie);

  select * into v_partie from enquete_parties where id = p_partie;
  select * into v_moi from enquete_participants where partie_id = p_partie and user_id = v_uid;
  select * into v_affaire from enquete_affaires where id = v_partie.affaire_id;
  select secret into v_secret from enquete_affaires_secret where affaire_id = v_affaire.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'type', j.type,
           'ref', j.ref,
           'at', j.created_at,
           'texte', x.e ->> 'texte',
           'didascalie', x.e ->> 'didascalie',
           'indice', case when x.e ->> 'indice' is null then null
                          else jsonb_build_object(
                            'id', x.e ->> 'indice',
                            'texte', v_secret -> 'indices' -> (x.e ->> 'indice') ->> 'texte')
                     end
         ) order by j.id), '[]'::jsonb)
  into v_journal
  from enquete_journal j
  cross join lateral (
    select case j.type
             when 'question' then v_secret -> 'questions' -> j.ref
             else v_secret -> 'fouilles' -> j.ref
           end as e
  ) x
  where j.partie_id = p_partie and j.user_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nom', jo.nom,
           'a_accuse', pa.accuse_at is not null,
           'accuse_at', pa.accuse_at
         )), '[]'::jsonb)
  into v_autres
  from enquete_participants pa
  join enquete_joueurs jo on jo.user_id = pa.user_id
  where pa.partie_id = p_partie and pa.user_id <> v_uid;

  if v_partie.revelee_at is not null then
    v_revelation := jsonb_build_object(
      'solution', v_secret -> 'solution',
      'indices', v_secret -> 'indices',
      'joueurs', (
        select jsonb_agg(jsonb_build_object(
                 'nom', jo.nom,
                 'moi', pa.user_id = v_uid,
                 'suspect', pa.accuse_suspect,
                 'mobile', pa.accuse_mobile,
                 'preuve', pa.accuse_preuve,
                 'score', pa.score,
                 'questions', (select count(*) from enquete_journal j
                               where j.partie_id = p_partie and j.user_id = pa.user_id and j.type = 'question')
               ) order by pa.score desc nulls last)
        from enquete_participants pa
        join enquete_joueurs jo on jo.user_id = pa.user_id
        where pa.partie_id = p_partie
      )
    );
  end if;

  return jsonb_build_object(
    'partie', jsonb_build_object(
      'id', v_partie.id,
      'mode', v_partie.mode,
      'echeance', v_partie.echeance,
      'revelee', v_partie.revelee_at is not null
    ),
    'affaire', jsonb_build_object('id', v_affaire.id, 'titre', v_affaire.titre, 'public', v_affaire.public),
    'moi', jsonb_build_object(
      'notes', v_moi.notes,
      'accusation', case when v_moi.accuse_at is null then null
                         else jsonb_build_object(
                           'suspect', v_moi.accuse_suspect,
                           'mobile', v_moi.accuse_mobile,
                           'preuve', v_moi.accuse_preuve,
                           'at', v_moi.accuse_at)
                    end,
      'score', v_moi.score
    ),
    'journal', v_journal,
    'autres', v_autres,
    'revelation', v_revelation,
    'limites', jsonb_build_object('questions', 15, 'fouilles', 3)
  );
end;
$$;

create function enquete_poser_question(p_partie bigint, p_question text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_question jsonb;
begin
  perform enquete_verifier_actif(p_partie);

  select q into v_question
  from enquete_parties p
  join enquete_affaires a on a.id = p.affaire_id
  cross join lateral jsonb_array_elements(a.public -> 'questions') q
  where p.id = p_partie and q ->> 'id' = p_question;

  if v_question is null then
    raise exception 'Question inconnue.';
  end if;

  if v_question ->> 'requiert' is not null
     and not (v_question ->> 'requiert' = any (enquete_indices_trouves(p_partie, auth.uid()))) then
    raise exception 'Il te manque un indice pour poser cette question.';
  end if;

  if (select count(*) from enquete_journal
      where partie_id = p_partie and user_id = auth.uid() and type = 'question') >= 15 then
    raise exception 'Tu as posé toutes tes questions.';
  end if;

  insert into enquete_journal (partie_id, user_id, type, ref)
  values (p_partie, auth.uid(), 'question', p_question)
  on conflict do nothing;

  return enquete_etat(p_partie);
end;
$$;

create function enquete_fouiller(p_partie bigint, p_lieu text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  perform enquete_verifier_actif(p_partie);

  if not exists (
    select 1
    from enquete_parties p
    join enquete_affaires a on a.id = p.affaire_id
    cross join lateral jsonb_array_elements(a.public -> 'lieux') l
    where p.id = p_partie and l ->> 'id' = p_lieu
  ) then
    raise exception 'Lieu inconnu.';
  end if;

  if (select count(*) from enquete_journal
      where partie_id = p_partie and user_id = auth.uid() and type = 'fouille') >= 3 then
    raise exception 'Tu as fait toutes tes fouilles.';
  end if;

  insert into enquete_journal (partie_id, user_id, type, ref)
  values (p_partie, auth.uid(), 'fouille', p_lieu)
  on conflict do nothing;

  return enquete_etat(p_partie);
end;
$$;

create function enquete_accuser(p_partie bigint, p_suspect text, p_mobile text, p_preuve text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_public jsonb;
begin
  perform enquete_verifier_actif(p_partie);

  select a.public into v_public
  from enquete_parties p join enquete_affaires a on a.id = p.affaire_id
  where p.id = p_partie;

  if not exists (select 1 from jsonb_array_elements(v_public -> 'suspects') s where s ->> 'id' = p_suspect) then
    raise exception 'Suspect inconnu.';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_public -> 'mobiles') m where m ->> 'id' = p_mobile) then
    raise exception 'Mobile inconnu.';
  end if;
  if not (p_preuve = any (enquete_indices_trouves(p_partie, auth.uid()))) then
    raise exception 'La preuve doit être un indice que tu as trouvé.';
  end if;

  update enquete_participants
  set accuse_suspect = p_suspect, accuse_mobile = p_mobile, accuse_preuve = p_preuve, accuse_at = now()
  where partie_id = p_partie and user_id = auth.uid();

  -- Première accusation d'un duel : les autres ont 24 h.
  update enquete_parties
  set echeance = now() + interval '24 hours'
  where id = p_partie and mode = 'duel' and echeance is null
    and exists (select 1 from enquete_participants where partie_id = p_partie and accuse_at is null);

  return enquete_etat(p_partie);
end;
$$;

create function enquete_sauver_notes(p_partie bigint, p_notes text)
returns void
language sql security definer set search_path = public
as $$
  update enquete_participants
  set notes = left(p_notes, 5000)
  where partie_id = p_partie and user_id = auth.uid();
$$;

-- Ouvre la prochaine affaire que personne parmi les joueurs n'a encore jouée.
create function enquete_nouvelle_partie(p_mode text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_joueurs uuid[];
  v_affaire bigint;
  v_partie bigint;
begin
  if not enquete_est_joueur() then
    raise exception 'Accès refusé.';
  end if;

  if p_mode = 'solo' then
    v_joueurs := array[auth.uid()];
  elsif p_mode = 'duel' then
    select array_agg(user_id) into v_joueurs from enquete_joueurs;
    if coalesce(array_length(v_joueurs, 1), 0) < 2 then
      raise exception 'Personne contre qui jouer.';
    end if;
  else
    raise exception 'Mode inconnu.';
  end if;

  select a.id into v_affaire
  from enquete_affaires a
  where not exists (
    select 1 from enquete_parties p
    join enquete_participants pa on pa.partie_id = p.id
    where p.affaire_id = a.id and pa.user_id = any (v_joueurs)
  )
  order by a.id
  limit 1;

  if v_affaire is null then
    raise exception 'Plus aucune affaire à résoudre : fais-en écrire une nouvelle.';
  end if;

  insert into enquete_parties (affaire_id, mode, cree_par)
  values (v_affaire, p_mode, auth.uid())
  returning id into v_partie;

  insert into enquete_participants (partie_id, user_id)
  select v_partie, unnest(v_joueurs);

  return v_partie;
end;
$$;

create function enquete_accueil()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tous uuid[];
begin
  if not enquete_est_joueur() then
    raise exception 'Accès refusé.';
  end if;

  perform enquete_cloturer(p.id)
  from enquete_parties p
  join enquete_participants pa on pa.partie_id = p.id
  where pa.user_id = v_uid and p.revelee_at is null and p.echeance < now();

  select array_agg(user_id) into v_tous from enquete_joueurs;

  return jsonb_build_object(
    'moi', (select nom from enquete_joueurs where user_id = v_uid),
    'adversaire', (select nom from enquete_joueurs where user_id <> v_uid order by nom limit 1),
    'parties', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select p.id, p.mode, p.echeance, p.created_at,
               p.revelee_at is not null as revelee,
               a.titre, a.public -> 'cadre' as cadre,
               pa.accuse_at is not null as a_accuse,
               pa.score,
               (select count(*) from enquete_journal j
                where j.partie_id = p.id and j.user_id = v_uid and j.type = 'question') as questions,
               (select count(*) from enquete_journal j
                where j.partie_id = p.id and j.user_id = v_uid and j.type = 'fouille') as fouilles,
               (select jsonb_agg(jsonb_build_object(
                         'nom', jo.nom,
                         'a_accuse', o.accuse_at is not null,
                         'score', case when p.revelee_at is not null then o.score end))
                from enquete_participants o
                join enquete_joueurs jo on jo.user_id = o.user_id
                where o.partie_id = p.id and o.user_id <> v_uid) as autres
        from enquete_parties p
        join enquete_participants pa on pa.partie_id = p.id and pa.user_id = v_uid
        join enquete_affaires a on a.id = p.affaire_id
      ) x
    ), '[]'::jsonb),
    'restantes_solo', (
      select count(*) from enquete_affaires a
      where not exists (select 1 from enquete_parties p join enquete_participants pa on pa.partie_id = p.id
                        where p.affaire_id = a.id and pa.user_id = v_uid)
    ),
    'restantes_duel', (
      select count(*) from enquete_affaires a
      where not exists (select 1 from enquete_parties p join enquete_participants pa on pa.partie_id = p.id
                        where p.affaire_id = a.id and pa.user_id = any (v_tous))
    ),
    'demande_en_cours', exists (select 1 from enquete_demandes where statut in ('en_attente', 'en_cours'))
  );
end;
$$;

create function enquete_demander_affaire()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not enquete_est_joueur() then
    raise exception 'Accès refusé.';
  end if;
  if exists (select 1 from enquete_demandes where statut in ('en_attente', 'en_cours')) then
    return;
  end if;
  insert into enquete_demandes (user_id) values (auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits : seules les fonctions « du site » sont appelables, et seulement
-- par un utilisateur connecté. Les helpers internes restent fermés.
-- ---------------------------------------------------------------------------

revoke execute on function
  enquete_est_joueur(),
  enquete_indices_trouves(bigint, uuid),
  enquete_cloturer(bigint),
  enquete_verifier_actif(bigint)
from public, anon, authenticated;

revoke execute on function
  enquete_etat(bigint),
  enquete_poser_question(bigint, text),
  enquete_fouiller(bigint, text),
  enquete_accuser(bigint, text, text, text),
  enquete_sauver_notes(bigint, text),
  enquete_nouvelle_partie(text),
  enquete_accueil(),
  enquete_demander_affaire()
from public, anon;

grant execute on function
  enquete_etat(bigint),
  enquete_poser_question(bigint, text),
  enquete_fouiller(bigint, text),
  enquete_accuser(bigint, text, text, text),
  enquete_sauver_notes(bigint, text),
  enquete_nouvelle_partie(text),
  enquete_accueil(),
  enquete_demander_affaire()
to authenticated;
