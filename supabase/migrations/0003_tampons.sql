-- Les tampons de l'agence (les succès), rangés dans le passeport du compte.
-- Ils se calculent à partir des parties : rien à stocker sauf ceux que le
-- joueur a déjà vu tomber (le coup de tampon animé ne se joue qu'une fois).
--   enquete_tampons()                la liste, dans l'ordre du passeport
--   enquete_tampons_vus(text[])      marque des tampons comme vus

alter table enquete_joueurs add column tampons_vus text[] not null default '{}';

create function enquete_tampons()
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
      select p.id as partie, p.mode, p.lancee_at, p.revelee_at, pa.accuse_at, pa.score,
             coalesce(pa.score, 0) >= 50 as resolue,
             (select count(*) from enquete_journal j where j.partie_id = p.id and j.user_id = v_uid and j.type = 'question') as questions,
             (select count(*) from enquete_journal j where j.partie_id = p.id and j.user_id = v_uid and j.type = 'fouille') as fouilles,
             (select count(*) from enquete_participants o where o.partie_id = p.id) as joueurs,
             (select max(o.score) from enquete_participants o where o.partie_id = p.id and o.user_id <> v_uid) as meilleur_autre
      from enquete_participants pa
      join enquete_parties p on p.id = pa.partie_id
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
    -- Pour chaque tampon : la première partie qui le décroche.
    gagnes (cle, partie, obtenu_at) as (
      select 'premiere', partie, revelee_at from resolues where n = 1
      union all (select 'flair', partie, revelee_at from jouees where score >= 90 order by revelee_at limit 1)
      union all (select 'econome', partie, revelee_at from jouees where resolue and questions <= 5 order by revelee_at limit 1)
      union all (select 'sans_fouiller', partie, revelee_at from jouees where resolue and fouilles = 0 order by revelee_at limit 1)
      union all (select 'eclair', partie, revelee_at from jouees where resolue and accuse_at - lancee_at < interval '1 hour' order by revelee_at limit 1)
      union all (select 'noctambule', partie, revelee_at from jouees
                 where resolue and extract(hour from accuse_at at time zone 'Europe/Paris') < 5 order by revelee_at limit 1)
      union all (select 'serie', partie, revelee_at from series where rang = 3 order by revelee_at limit 1)
      union all select 'dix', partie, revelee_at from resolues where n = 10
      union all (select 'premier_table', partie, revelee_at from jouees
                 where mode = 'groupe' and resolue and score > coalesce(meilleur_autre, -1) order by revelee_at limit 1)
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

create function enquete_tampons_vus(p_cles text[])
returns void
language sql security definer set search_path = public
as $$
  update enquete_joueurs
  set tampons_vus = array(select distinct unnest(tampons_vus || p_cles))
  where user_id = auth.uid();
$$;

revoke execute on function enquete_tampons(), enquete_tampons_vus(text[]) from public, anon;
grant execute on function enquete_tampons(), enquete_tampons_vus(text[]) to authenticated;
