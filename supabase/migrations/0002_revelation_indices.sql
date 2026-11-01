-- Révélation : les indices trouvés par chaque joueur (tableau « qui a
-- trouvé quoi »). Accueil : le nombre d'indices de chaque partie.
-- Les deux fonctions sont reprises de 0001 avec un seul champ en plus.

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
                               where j.partie_id = p_partie and j.user_id = pa.user_id and j.type = 'question'),
                 'indices', to_jsonb(enquete_indices_trouves(p_partie, pa.user_id))
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

create or replace function enquete_accueil()
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
               cardinality(enquete_indices_trouves(p.id, v_uid)) as indices,
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
