-- La règle de la nuit (novembre 2026). Elle remplace « 15 questions,
-- 3 fouilles, des points » :
--   - une horloge : la nuit commence à l'heure du crime et finit à l'aube ;
--     chaque geste coûte des minutes (question 10, relance 5, montrer une
--     pièce 5, fouille 30) ;
--   - des interrogatoires en arbre : questions d'ouverture, relances qui
--     apparaissent après une réponse, pistes ouvertes par un indice ;
--   - la patience des suspects : une question qui fâche coûte un cran ; à
--     zéro, le suspect se braque. Une vraie preuve contre lui peut le faire
--     craquer, une seule fois ;
--   - des événements à heure fixe (un suspect part, un lieu est lavé) ;
--   - un dossier (coupable, mobile, occasion, preuve) et un verdict :
--     condamné, relâché faute de preuves ou erreur judiciaire. À plusieurs,
--     le meilleur verdict gagne, puis le plus tôt signé dans la nuit.
--
-- Les affaires de l'ancienne règle restent en base (regle = 1) pour les
-- archives, mais ne sont plus jamais proposées. Les nouvelles (regle = 2)
-- sont de nouvelles lignes : tout le monde peut les jouer, même ceux qui
-- avaient lu l'ancienne version.
--
-- Rien n'est stocké en plus du journal : l'état de la nuit (heure, patience,
-- indices) se recalcule en rejouant le journal dans l'ordre (enquete_nuit).

alter table enquete_affaires add column regle smallint not null default 1 check (regle in (1, 2));

alter table enquete_participants
  add column accuse_occasion text,
  add column accuse_minutes int,
  add column verdict text check (verdict in ('condamne', 'relache', 'erreur')),
  -- Pour départager : verdict d'abord, puis minutes d'avance sur l'aube.
  add column classement int;

alter table enquete_journal drop constraint enquete_journal_type_check;
alter table enquete_journal add constraint enquete_journal_type_check check (type in ('question', 'fouille', 'montrer'));

-- ---------------------------------------------------------------------------
-- Outils
-- ---------------------------------------------------------------------------

-- « 02:30 » → 150.
create function enquete_hhmm(p text)
returns int
language sql immutable set search_path = public
as $$
  select split_part(p, ':', 1)::int * 60 + split_part(p, ':', 2)::int;
$$;

-- Minutes écoulées depuis le début de la nuit à cette heure-là, en passant
-- minuit si besoin (22:50 → 00:30 = 100).
create function enquete_depuis(p_debut text, p_heure text)
returns int
language sql immutable set search_path = public
as $$
  select (enquete_hhmm(p_heure) - enquete_hhmm(p_debut) + 1440) % 1440;
$$;

create function enquete_regle(p_partie bigint)
returns smallint
language sql stable security definer set search_path = public
as $$
  select a.regle from enquete_parties p join enquete_affaires a on a.id = p.affaire_id where p.id = p_partie;
$$;

-- Les affaires de l'ancienne règle comptent comme « déjà lues » : plus
-- aucune partie ne les propose.
create or replace function enquete_deja_lue(p_affaire bigint, p_users uuid[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select regle = 1 from enquete_affaires where id = p_affaire), true)
    or exists (
      select 1 from enquete_parties p
      join enquete_participants pa on pa.partie_id = p.id
      where p.affaire_id = p_affaire and p.lancee_at is not null and pa.user_id = any (p_users)
    );
$$;

-- Le suspect est-il parti, à cette minute de la nuit ?
create function enquete_absent(p_pub jsonb, p_suspect text, p_minutes int)
returns boolean
language sql immutable set search_path = public
as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(p_pub -> 'evenements', '[]')) e
    where e ->> 'suspect_absent' = p_suspect
      and enquete_depuis(p_pub -> 'horloge' ->> 'debut', e ->> 'heure') <= p_minutes
  );
$$;

-- ---------------------------------------------------------------------------
-- La nuit d'un joueur, rejouée depuis son journal
-- ---------------------------------------------------------------------------

create function enquete_nuit(p_partie bigint, p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_pub jsonb;
  v_sec jsonb;
  v_aube int;
  v_couts jsonb;
  v_t int := 0;
  v_pat jsonb;
  v_braques text[] := '{}';
  v_craques text[] := '{}';
  v_trouves text[] := '{}';
  v_indices jsonb := '[]';
  v_entrees jsonb := '[]';
  v_posees text[] := '{}';
  v_montrees text[] := '{}';
  v_fouilles text[] := '{}';
  j record;
  q jsonb;
  r jsonb;
  e jsonb;
  v_s text;
  v_piece text;
  v_cout int;
  v_ind text;
  v_fache boolean;
  v_perdu boolean;
begin
  select a.public, s.secret into v_pub, v_sec
  from enquete_parties p
  join enquete_affaires a on a.id = p.affaire_id
  join enquete_affaires_secret s on s.affaire_id = a.id
  where p.id = p_partie;

  v_aube := enquete_depuis(v_pub -> 'horloge' ->> 'debut', v_pub -> 'horloge' ->> 'aube');
  v_couts := v_pub -> 'horloge' -> 'couts';
  select coalesce(jsonb_object_agg(s ->> 'id', (s ->> 'patience')::int), '{}') into v_pat
  from jsonb_array_elements(v_pub -> 'suspects') s;

  for j in
    select * from enquete_journal where partie_id = p_partie and user_id = p_user order by id
  loop
    v_fache := false;
    v_s := null;

    if j.type = 'question' then
      select x into q from jsonb_array_elements(v_pub -> 'questions') x where x ->> 'id' = j.ref;
      v_s := q ->> 'suspect';
      v_cout := (v_couts ->> case when q ->> 'genre' = 'relance' then 'relance' else 'question' end)::int;
      r := v_sec -> 'questions' -> j.ref;
      v_fache := coalesce((r ->> 'fache')::boolean, false);
      v_posees := v_posees || j.ref;
      e := jsonb_build_object('type', 'question', 'ref', j.ref, 'suspect', v_s, 'question', q ->> 'texte', 'genre', q ->> 'genre');

    elsif j.type = 'montrer' then
      v_s := split_part(j.ref, ':', 1);
      v_piece := split_part(j.ref, ':', 2);
      v_cout := (v_couts ->> 'montrer')::int;
      v_montrees := v_montrees || j.ref;
      e := jsonb_build_object('type', 'montrer', 'ref', j.ref, 'suspect', v_s,
             'piece', jsonb_build_object('id', v_piece, 'texte', v_sec -> 'indices' -> v_piece ->> 'texte'));
      if v_s = any (v_braques) then
        if v_sec -> 'craque' -> v_s is not null and not (v_s = any (v_craques))
           and (v_sec -> 'craque' -> v_s -> 'pieces') ? v_piece then
          -- La bonne pièce : il craque, une seule fois, et retrouve un cran.
          r := v_sec -> 'craque' -> v_s;
          v_braques := array_remove(v_braques, v_s);
          v_craques := v_craques || v_s;
          v_pat := jsonb_set(v_pat, array[v_s], '1');
          e := e || '{"craque": true}';
        else
          r := jsonb_build_object('texte', v_sec -> 'ricane' ->> v_s);
          e := e || '{"ricane": true}';
        end if;
      else
        r := coalesce(v_sec -> 'montrer' -> v_s -> v_piece, v_sec -> 'montrer' -> v_s -> '_defaut');
        v_fache := coalesce((r ->> 'fache')::boolean, false);
      end if;

    else
      v_cout := (v_couts ->> 'fouille')::int;
      v_fouilles := v_fouilles || j.ref;
      v_perdu := exists (
        select 1 from jsonb_array_elements(coalesce(v_pub -> 'evenements', '[]')) ev
        where ev ->> 'lieu_perdu' = j.ref and enquete_depuis(v_pub -> 'horloge' ->> 'debut', ev ->> 'heure') <= v_t
      );
      r := v_sec -> 'fouilles' -> j.ref;
      if v_perdu then
        r := jsonb_build_object('texte', r ->> 'apres_evenement');
      end if;
      e := jsonb_build_object('type', 'fouille', 'ref', j.ref, 'perdu', v_perdu);
    end if;

    e := e || jsonb_build_object('minute', v_t, 'at', j.created_at, 'texte', r ->> 'texte', 'didascalie', r ->> 'didascalie');

    v_ind := r ->> 'indice';
    if v_ind is not null and not (v_ind = any (v_trouves)) then
      v_trouves := v_trouves || v_ind;
      v_indices := v_indices || jsonb_build_object(
        'id', v_ind,
        'texte', v_sec -> 'indices' -> v_ind ->> 'texte',
        'minute', v_t,
        'type', case when j.type = 'fouille' then 'fouille' else 'question' end,
        'cible', case when j.type = 'fouille' then j.ref else v_s end);
      e := e || jsonb_build_object('indice', jsonb_build_object('id', v_ind, 'texte', v_sec -> 'indices' -> v_ind ->> 'texte'));
    end if;

    if v_fache then
      v_pat := jsonb_set(v_pat, array[v_s], to_jsonb(greatest(0, (v_pat ->> v_s)::int - 1)));
      e := e || '{"fache": true}';
      if (v_pat ->> v_s)::int = 0 and not (v_s = any (v_braques)) then
        v_braques := v_braques || v_s;
        e := e || jsonb_build_object('braque', v_sec -> 'braque' ->> v_s);
      end if;
    end if;

    v_entrees := v_entrees || e;
    v_t := least(v_aube, v_t + v_cout);
  end loop;

  return jsonb_build_object(
    'minutes', v_t,
    'aube', v_aube,
    'patience', v_pat,
    'braques', to_jsonb(v_braques),
    'craques', to_jsonb(v_craques),
    'trouves', to_jsonb(v_trouves),
    'indices', v_indices,
    'entrees', v_entrees,
    'posees', to_jsonb(v_posees),
    'montrees', to_jsonb(v_montrees),
    'fouilles', to_jsonb(v_fouilles)
  );
end;
$$;

-- Les questions qu'on peut poser maintenant.
create function enquete_ouvertes(p_pub jsonb, p_nuit jsonb)
returns text[]
language sql immutable set search_path = public
as $$
  select coalesce(array_agg(q ->> 'id'), '{}')
  from jsonb_array_elements(p_pub -> 'questions') q
  where not (p_nuit -> 'posees' ? (q ->> 'id'))
    and not (p_nuit -> 'braques' ? (q ->> 'suspect'))
    and not enquete_absent(p_pub, q ->> 'suspect', (p_nuit ->> 'minutes')::int)
    and (q ->> 'genre' = 'ouverture'
         or (q ->> 'genre' = 'relance' and p_nuit -> 'posees' ? (q ->> 'apres'))
         or (q ->> 'genre' = 'piste' and p_nuit -> 'trouves' ? (q ->> 'requiert')));
$$;

create or replace function enquete_indices_trouves(p_partie bigint, p_user uuid)
returns text[]
language plpgsql stable security definer set search_path = public
as $$
begin
  if enquete_regle(p_partie) = 2 then
    return array(select jsonb_array_elements_text(enquete_nuit(p_partie, p_user) -> 'trouves'));
  end if;
  return (
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
    where t.indice is not null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Clôture : verdicts et classement
-- ---------------------------------------------------------------------------

create or replace function enquete_cloturer(p_partie bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_partie enquete_parties;
  v_sol jsonb;
  v_pub jsonb;
  v_regle smallint;
  v_aube int;
begin
  select * into v_partie from enquete_parties where id = p_partie for update;
  if not found or v_partie.revelee_at is not null or v_partie.lancee_at is null then
    return;
  end if;

  if exists (select 1 from enquete_participants where partie_id = p_partie and accuse_at is null)
     and (v_partie.echeance is null or v_partie.echeance > now()) then
    return;
  end if;

  select s.secret -> 'solution', a.public, a.regle into v_sol, v_pub, v_regle
  from enquete_affaires a join enquete_affaires_secret s on s.affaire_id = a.id
  where a.id = v_partie.affaire_id;

  if v_regle = 1 then
    -- Ancienne règle : les points.
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
  else
    v_aube := enquete_depuis(v_pub -> 'horloge' ->> 'debut', v_pub -> 'horloge' ->> 'aube');
    update enquete_participants pa
    set verdict = v.verdict,
        classement = case v.verdict when 'condamne' then 3000 when 'relache' then 2000 when 'erreur' then 1000 else 0 end
                     + case when v.verdict is null then 0 else greatest(0, v_aube - coalesce(pa.accuse_minutes, v_aube)) end
    from (
      select user_id,
             case
               when accuse_suspect is null then null
               when accuse_suspect <> v_sol ->> 'coupable' then 'erreur'
               when accuse_preuve is not null and v_sol -> 'preuves' ? accuse_preuve then 'condamne'
               else 'relache'
             end as verdict
      from enquete_participants where partie_id = p_partie
    ) v
    where pa.partie_id = p_partie and pa.user_id = v.user_id;
  end if;

  update enquete_parties set revelee_at = now() where id = p_partie;
end;
$$;

-- ---------------------------------------------------------------------------
-- L'état d'une partie
-- ---------------------------------------------------------------------------

create or replace function enquete_etat(p_partie bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partie enquete_parties;
  v_moi enquete_participants;
  v_affaire enquete_affaires;
  v_secret jsonb;
  v_nuit jsonb;
  v_autres jsonb;
  v_revelation jsonb;
  v_minutes int;
begin
  if not exists (select 1 from enquete_participants where partie_id = p_partie and user_id = v_uid) then
    raise exception 'Partie introuvable.';
  end if;

  perform enquete_cloturer(p_partie);

  select * into v_partie from enquete_parties where id = p_partie;
  if v_partie.lancee_at is null then
    raise exception 'Le dossier n''est pas encore ouvert.';
  end if;
  select * into v_moi from enquete_participants where partie_id = p_partie and user_id = v_uid;
  select * into v_affaire from enquete_affaires where id = v_partie.affaire_id;
  select secret into v_secret from enquete_affaires_secret where affaire_id = v_affaire.id;

  -- Ancienne règle : seule la une reste consultable, une fois l'affaire close.
  if v_affaire.regle = 1 then
    if v_partie.revelee_at is null then
      raise exception 'Cette enquête suivait l''ancienne règle : elle a été rangée aux archives.';
    end if;
    return jsonb_build_object(
      'regle', 1,
      'partie', jsonb_build_object('id', v_partie.id, 'mode', v_partie.mode, 'echeance', v_partie.echeance, 'revelee', true),
      'affaire', jsonb_build_object('id', v_affaire.id, 'titre', v_affaire.titre, 'public', v_affaire.public),
      'revelation', jsonb_build_object(
        'solution', v_secret -> 'solution',
        'joueurs', (
          select jsonb_agg(jsonb_build_object('nom', jo.pseudo, 'moi', pa.user_id = v_uid, 'suspect', pa.accuse_suspect, 'score', pa.score)
                           order by pa.score desc nulls last)
          from enquete_participants pa join enquete_joueurs jo on jo.user_id = pa.user_id
          where pa.partie_id = p_partie
        )
      )
    );
  end if;

  v_nuit := enquete_nuit(p_partie, v_uid);
  v_minutes := (v_nuit ->> 'minutes')::int;

  select coalesce(jsonb_agg(jsonb_build_object(
           'nom', jo.pseudo,
           'a_accuse', pa.accuse_at is not null,
           'accuse_at', pa.accuse_at
         ) order by pa.accuse_at nulls last), '[]'::jsonb)
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
                 'nom', jo.pseudo,
                 'moi', pa.user_id = v_uid,
                 'suspect', pa.accuse_suspect,
                 'mobile', pa.accuse_mobile,
                 'occasion', pa.accuse_occasion,
                 'preuve', pa.accuse_preuve,
                 'minutes', pa.accuse_minutes,
                 'verdict', pa.verdict,
                 'braques', jsonb_array_length(n -> 'braques') + jsonb_array_length(n -> 'craques'),
                 'indices', n -> 'trouves'
               ) order by pa.classement desc nulls last, pa.accuse_at nulls last)
        from enquete_participants pa
        join enquete_joueurs jo on jo.user_id = pa.user_id
        cross join lateral (select enquete_nuit(p_partie, pa.user_id) as n) x
        where pa.partie_id = p_partie
      )
    );
  end if;

  return jsonb_build_object(
    'regle', 2,
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
                           'occasion', v_moi.accuse_occasion,
                           'preuve', v_moi.accuse_preuve,
                           'minutes', v_moi.accuse_minutes,
                           'at', v_moi.accuse_at)
                    end,
      'verdict', v_moi.verdict
    ),
    'nuit', jsonb_build_object(
      'minutes', v_minutes,
      'aube', v_nuit -> 'aube',
      'patience', v_nuit -> 'patience',
      'braques', v_nuit -> 'braques',
      'craques', v_nuit -> 'craques',
      'montrees', v_nuit -> 'montrees',
      'ouvertes', to_jsonb(enquete_ouvertes(v_affaire.public, v_nuit)),
      'absents', (select coalesce(jsonb_agg(s ->> 'id'), '[]')
                  from jsonb_array_elements(v_affaire.public -> 'suspects') s
                  where enquete_absent(v_affaire.public, s ->> 'id', v_minutes))
    ),
    'journal', v_nuit -> 'entrees',
    'indices', v_nuit -> 'indices',
    'autres', v_autres,
    'revelation', v_revelation
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Les gestes de la nuit
-- ---------------------------------------------------------------------------

-- Lève une erreur si la nuit ne permet plus d'agir ; renvoie la nuit.
create function enquete_nuit_active(p_partie bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nuit jsonb;
begin
  perform enquete_verifier_actif(p_partie);
  if enquete_regle(p_partie) <> 2 then
    raise exception 'Cette enquête suivait l''ancienne règle.';
  end if;
  v_nuit := enquete_nuit(p_partie, auth.uid());
  if (v_nuit ->> 'minutes')::int >= (v_nuit ->> 'aube')::int then
    raise exception 'C''est l''heure : il ne reste qu''à signer ton dossier.';
  end if;
  return v_nuit;
end;
$$;

create or replace function enquete_poser_question(p_partie bigint, p_question text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nuit jsonb := enquete_nuit_active(p_partie);
  v_pub jsonb;
begin
  select a.public into v_pub from enquete_parties p join enquete_affaires a on a.id = p.affaire_id where p.id = p_partie;
  if not (p_question = any (enquete_ouvertes(v_pub, v_nuit))) then
    raise exception 'Cette question ne se pose pas, ou plus.';
  end if;
  insert into enquete_journal (partie_id, user_id, type, ref)
  values (p_partie, auth.uid(), 'question', p_question)
  on conflict do nothing;
  return enquete_etat(p_partie);
end;
$$;

create function enquete_montrer(p_partie bigint, p_suspect text, p_piece text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nuit jsonb := enquete_nuit_active(p_partie);
  v_pub jsonb;
begin
  select a.public into v_pub from enquete_parties p join enquete_affaires a on a.id = p.affaire_id where p.id = p_partie;
  if not exists (select 1 from jsonb_array_elements(v_pub -> 'suspects') s where s ->> 'id' = p_suspect) then
    raise exception 'Suspect inconnu.';
  end if;
  if enquete_absent(v_pub, p_suspect, (v_nuit ->> 'minutes')::int) then
    raise exception 'Trop tard : il n''est plus là.';
  end if;
  if not (v_nuit -> 'trouves' ? p_piece) then
    raise exception 'Tu ne peux montrer qu''une pièce de ton mur.';
  end if;
  if v_nuit -> 'montrees' ? (p_suspect || ':' || p_piece) then
    raise exception 'Tu lui as déjà montré cette pièce.';
  end if;
  insert into enquete_journal (partie_id, user_id, type, ref)
  values (p_partie, auth.uid(), 'montrer', p_suspect || ':' || p_piece);
  return enquete_etat(p_partie);
end;
$$;

create or replace function enquete_fouiller(p_partie bigint, p_lieu text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_nuit jsonb := enquete_nuit_active(p_partie);
begin
  if not exists (
    select 1
    from enquete_parties p
    join enquete_affaires a on a.id = p.affaire_id
    cross join lateral jsonb_array_elements(a.public -> 'lieux') l
    where p.id = p_partie and l ->> 'id' = p_lieu
  ) then
    raise exception 'Lieu inconnu.';
  end if;
  if v_nuit -> 'fouilles' ? p_lieu then
    raise exception 'Tu as déjà fouillé ici.';
  end if;
  insert into enquete_journal (partie_id, user_id, type, ref)
  values (p_partie, auth.uid(), 'fouille', p_lieu);
  return enquete_etat(p_partie);
end;
$$;

drop function enquete_accuser(bigint, text, text, text);

-- Signer le dossier. L'occasion et la preuve sont des pièces du mur, ou
-- rien (null) : on peut signer un dossier vide, à l'aube par exemple.
create function enquete_accuser(p_partie bigint, p_suspect text, p_mobile text, p_occasion text, p_preuve text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_public jsonb;
  v_nuit jsonb;
begin
  perform enquete_verifier_actif(p_partie);
  if enquete_regle(p_partie) <> 2 then
    raise exception 'Cette enquête suivait l''ancienne règle.';
  end if;
  v_nuit := enquete_nuit(p_partie, auth.uid());

  select a.public into v_public
  from enquete_parties p join enquete_affaires a on a.id = p.affaire_id
  where p.id = p_partie;

  if not exists (select 1 from jsonb_array_elements(v_public -> 'suspects') s where s ->> 'id' = p_suspect) then
    raise exception 'Suspect inconnu.';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_public -> 'mobiles') m where m ->> 'id' = p_mobile) then
    raise exception 'Mobile inconnu.';
  end if;
  if (p_occasion is not null and not (v_nuit -> 'trouves' ? p_occasion))
     or (p_preuve is not null and not (v_nuit -> 'trouves' ? p_preuve)) then
    raise exception 'Le dossier ne peut contenir que des pièces de ton mur.';
  end if;

  update enquete_participants
  set accuse_suspect = p_suspect, accuse_mobile = p_mobile, accuse_occasion = p_occasion, accuse_preuve = p_preuve,
      accuse_minutes = (v_nuit ->> 'minutes')::int, accuse_at = now()
  where partie_id = p_partie and user_id = auth.uid();

  -- Première accusation à plusieurs : les autres ont 24 h.
  update enquete_parties
  set echeance = now() + interval '24 hours'
  where id = p_partie and mode = 'groupe' and echeance is null
    and exists (select 1 from enquete_participants where partie_id = p_partie and accuse_at is null);

  return enquete_etat(p_partie);
end;
$$;

-- ---------------------------------------------------------------------------
-- L'accueil : verdicts au lieu des points
-- ---------------------------------------------------------------------------

create or replace function enquete_accueil()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_moi enquete_joueurs;
begin
  perform enquete_exiger_joueur();
  select * into v_moi from enquete_joueurs where user_id = v_uid;

  perform enquete_cloturer(p.id)
  from enquete_parties p
  join enquete_participants pa on pa.partie_id = p.id
  where pa.user_id = v_uid and p.revelee_at is null and p.echeance < now();

  return jsonb_build_object(
    'moi', jsonb_build_object(
      'pseudo', v_moi.pseudo,
      'admin', v_moi.admin,
      'resolues', (select count(*) from enquete_participants pa join enquete_parties p on p.id = pa.partie_id
                   where pa.user_id = v_uid and p.revelee_at is not null
                     and coalesce(pa.verdict = 'condamne', pa.score >= 50, false)),
      'classees', (select count(*) from enquete_participants pa join enquete_parties p on p.id = pa.partie_id
                   where pa.user_id = v_uid and p.revelee_at is not null
                     and not coalesce(pa.verdict = 'condamne', pa.score >= 50, false)),
      -- Le plus tôt dans la nuit qu'on ait fait condamner quelqu'un.
      -- (minute du jour : 3 h 55 = 235 ; après minuit, compte comme une nuit qui a commencé tôt)
      'record', (select min((enquete_hhmm(a.public -> 'horloge' ->> 'debut') + pa.accuse_minutes) % 1440)
                 from enquete_participants pa
                 join enquete_parties p on p.id = pa.partie_id
                 join enquete_affaires a on a.id = p.affaire_id
                 where pa.user_id = v_uid and pa.verdict = 'condamne')
    ),
    'parties', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select p.id, p.mode, p.echeance, p.lancee_at as created_at,
               p.revelee_at is not null as revelee,
               a.regle,
               a.titre, a.public -> 'cadre' as cadre, a.public -> 'horloge' as horloge,
               pa.accuse_at is not null as a_accuse,
               pa.score, pa.verdict, pa.accuse_minutes,
               case when a.regle = 2 and p.revelee_at is null then (enquete_nuit(p.id, v_uid) ->> 'minutes')::int end as minutes,
               cardinality(enquete_indices_trouves(p.id, v_uid)) as indices,
               (select jsonb_agg(jsonb_build_object(
                         'nom', jo.pseudo,
                         'a_accuse', o.accuse_at is not null,
                         'score', case when p.revelee_at is not null then o.score end,
                         'verdict', case when p.revelee_at is not null then o.verdict end,
                         'minutes', case when p.revelee_at is not null then o.accuse_minutes end,
                         'classement', case when p.revelee_at is not null then o.classement end)
                       order by o.classement desc nulls last, o.score desc nulls last)
                from enquete_participants o
                join enquete_joueurs jo on jo.user_id = o.user_id
                where o.partie_id = p.id and o.user_id <> v_uid) as autres,
               pa.classement
        from enquete_parties p
        join enquete_participants pa on pa.partie_id = p.id and pa.user_id = v_uid
        join enquete_affaires a on a.id = p.affaire_id
        -- Les enquêtes de l'ancienne règle en cours sont rangées.
        where p.lancee_at is not null and (a.regle = 2 or p.revelee_at is not null)
      ) x
    ), '[]'::jsonb),
    'bureaux', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'hote', h.pseudo,
               'moi_hote', p.cree_par = v_uid,
               'mon_statut', pa.statut,
               'presents', (select count(*) from enquete_participants o where o.partie_id = p.id and o.statut = 'present'),
               'attendus', (select count(*) from enquete_participants o where o.partie_id = p.id and o.statut <> 'decline'),
               'autres', (select jsonb_agg(jo.pseudo order by lower(jo.pseudo))
                          from enquete_participants o join enquete_joueurs jo on jo.user_id = o.user_id
                          where o.partie_id = p.id and o.user_id not in (v_uid, p.cree_par) and o.statut <> 'decline')
             ) order by p.created_at desc)
      from enquete_parties p
      join enquete_participants pa on pa.partie_id = p.id and pa.user_id = v_uid and pa.statut <> 'decline'
      join enquete_joueurs h on h.user_id = p.cree_par
      where p.lancee_at is null
    ), '[]'::jsonb),
    'demandes_associes', (select count(*) from enquete_amities where a = v_uid and acceptee_at is null),
    'a_des_associes', exists (select enquete_associes_de(v_uid)),
    'restantes_solo', (select count(*) from enquete_affaires a where not enquete_deja_lue(a.id, array[v_uid])),
    'demande_en_cours', exists (select 1 from enquete_demandes where statut in ('en_attente', 'en_cours'))
  );
end;
$$;

-- Le bilan entre associés compare le classement (ou les points jadis).
create or replace function enquete_associes()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform enquete_exiger_joueur();
  return jsonb_build_object(
    'amis', coalesce((
      select jsonb_agg(jsonb_build_object(
               'pseudo', j.pseudo,
               'ensemble', s.ensemble,
               'moi_devant', s.moi_devant,
               'lui_devant', s.lui_devant
             ) order by lower(j.pseudo))
      from enquete_associes_de(v_uid) ami(id)
      join enquete_joueurs j on j.user_id = ami.id
      cross join lateral (
        select count(*) as ensemble,
               count(*) filter (where coalesce(moi.classement, moi.score) > coalesce(lui.classement, lui.score)) as moi_devant,
               count(*) filter (where coalesce(lui.classement, lui.score) > coalesce(moi.classement, moi.score)) as lui_devant
        from enquete_parties p
        join enquete_participants moi on moi.partie_id = p.id and moi.user_id = v_uid
        join enquete_participants lui on lui.partie_id = p.id and lui.user_id = ami.id
        where p.revelee_at is not null
      ) s
    ), '[]'::jsonb),
    'recues', coalesce((
      select jsonb_agg(j.pseudo order by f.created_at)
      from enquete_amities f join enquete_joueurs j on j.user_id = f.de
      where f.a = v_uid and f.acceptee_at is null
    ), '[]'::jsonb),
    'envoyees', coalesce((
      select jsonb_agg(j.pseudo order by f.created_at)
      from enquete_amities f join enquete_joueurs j on j.user_id = f.a
      where f.de = v_uid and f.acceptee_at is null
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Les tampons, adaptés aux verdicts (ceux déjà gagnés restent acquis)
-- ---------------------------------------------------------------------------

create or replace function enquete_tampons()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_vus text[];
begin
  perform enquete_exiger_joueur();
  select tampons_vus into v_vus from enquete_joueurs where user_id = v_uid;

  return (
    with jouees as (
      select p.id as partie, p.mode, p.lancee_at, p.revelee_at, pa.accuse_at, a.regle,
             coalesce(pa.classement, pa.score) as rang_valeur,
             coalesce(pa.verdict = 'condamne', pa.score >= 50, false) as resolue,
             -- Dossier parfait : coupable, mobile, occasion et preuve justes (ou 90 points jadis).
             case when a.regle = 1 then coalesce(pa.score, 0) >= 90
                  else pa.verdict = 'condamne' and pa.accuse_mobile = s.secret -> 'solution' ->> 'mobile'
                       and coalesce(s.secret -> 'solution' -> 'occasion' ? pa.accuse_occasion, false) end as parfait,
             -- Rapide : 5 questions ou moins jadis, 1 h 30 de nuit ou moins aujourd'hui.
             case when a.regle = 1 then (select count(*) from enquete_journal j where j.partie_id = p.id and j.user_id = v_uid and j.type = 'question') <= 5
                  else pa.accuse_minutes <= 90 end as rapide,
             (select count(*) from enquete_journal j where j.partie_id = p.id and j.user_id = v_uid and j.type = 'fouille') as fouilles,
             (select count(*) from enquete_participants o where o.partie_id = p.id) as joueurs,
             (select max(coalesce(o.classement, o.score)) from enquete_participants o where o.partie_id = p.id and o.user_id <> v_uid) as meilleur_autre
      from enquete_participants pa
      join enquete_parties p on p.id = pa.partie_id
      join enquete_affaires a on a.id = p.affaire_id
      join enquete_affaires_secret s on s.affaire_id = a.id
      where pa.user_id = v_uid and p.revelee_at is not null
    ),
    -- Séries de résolues : chaque affaire ratée ouvre un nouveau groupe.
    rangees as (
      select *, sum(case when resolue then 0 else 1 end) over (order by revelee_at, partie) as groupe
      from jouees
    ),
    series as (
      select *, row_number() over (partition by groupe order by revelee_at, partie) as rang
      from rangees where resolue
    ),
    resolues as (
      select *, row_number() over (order by revelee_at, partie) as n from jouees where resolue
    ),
    toutes as (
      select *, row_number() over (order by revelee_at, partie) as n from jouees
    ),
    amis as (
      select acceptee_at, row_number() over (order by acceptee_at) as n
      from enquete_amities where (de = v_uid or a = v_uid) and acceptee_at is not null
    ),
    gagnes (cle, partie, obtenu_at) as (
      select 'premiere', partie, revelee_at from resolues where n = 1
      union all (select 'flair', partie, revelee_at from jouees where parfait order by revelee_at limit 1)
      union all (select 'econome', partie, revelee_at from jouees where resolue and rapide order by revelee_at limit 1)
      union all (select 'sans_fouiller', partie, revelee_at from jouees where resolue and fouilles = 0 order by revelee_at limit 1)
      union all (select 'eclair', partie, revelee_at from jouees where resolue and accuse_at - lancee_at < interval '1 hour' order by revelee_at limit 1)
      union all (select 'noctambule', partie, revelee_at from jouees
                 where resolue and extract(hour from accuse_at at time zone 'Europe/Paris') < 5 order by revelee_at limit 1)
      union all (select 'serie', partie, revelee_at from series where rang = 3 order by revelee_at limit 1)
      union all select 'dix', partie, revelee_at from resolues where n = 10
      union all (select 'premier_table', partie, revelee_at from jouees
                 where mode = 'groupe' and resolue and rang_valeur > coalesce(meilleur_autre, -1) order by revelee_at limit 1)
      union all (select 'tablee', partie, revelee_at from jouees where joueurs >= 4 order by revelee_at limit 1)
      union all select 'associes', null::bigint, acceptee_at from amis where n = 3
      union all select 'pilier', partie, revelee_at from toutes where n = 25
    ),
    definitions (ordre, cle, sur) as (
      values (1, 'premiere', null::int), (2, 'flair', null), (3, 'econome', null), (4, 'sans_fouiller', null),
             (5, 'eclair', null), (6, 'noctambule', null), (7, 'serie', 3), (8, 'dix', 10),
             (9, 'premier_table', null), (10, 'tablee', null), (11, 'associes', 3), (12, 'pilier', 25)
    )
    select jsonb_agg(jsonb_build_object(
             'cle', d.cle,
             'obtenu_at', g.obtenu_at,
             'partie', g.partie,
             'vu', d.cle = any (v_vus),
             'progres', case d.cle
                          when 'serie' then (select coalesce(max(rang), 0) from series)
                          when 'dix' then (select count(*) from resolues)
                          when 'associes' then (select count(*) from amis)
                          when 'pilier' then (select count(*) from jouees)
                        end,
             'sur', d.sur
           ) order by d.ordre)
    from definitions d left join gagnes g on g.cle = d.cle
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------

revoke execute on function
  enquete_hhmm(text),
  enquete_depuis(text, text),
  enquete_regle(bigint),
  enquete_absent(jsonb, text, int),
  enquete_nuit(bigint, uuid),
  enquete_ouvertes(jsonb, jsonb),
  enquete_nuit_active(bigint),
  enquete_montrer(bigint, text, text),
  enquete_accuser(bigint, text, text, text, text)
from public, anon, authenticated;

grant execute on function
  enquete_montrer(bigint, text, text),
  enquete_accuser(bigint, text, text, text, text)
to authenticated;
