-- Page Compte et recherche d'associés.
--   enquete_renommer         changer le nom sur la porte de l'agence
--   enquete_chercher_agences suggestions pendant la frappe, onglet Associés

-- Les associations et les parties tiennent par l'identifiant : changer de
-- nom ne casse rien, les associés voient simplement le nouveau nom.
create function enquete_renommer(p_pseudo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  perform enquete_exiger_joueur();
  if not (trim(p_pseudo) ~ '^[A-Za-z0-9_À-ÖØ-öø-ÿ-]{3,16}$') then
    raise exception 'De 3 à 16 lettres, chiffres, tirets ou soulignés.';
  end if;
  v_id := enquete_id_pseudo(p_pseudo);
  if v_id is not null and v_id <> auth.uid() then
    raise exception 'Ce nom est déjà sur une autre porte.';
  end if;
  update enquete_joueurs set pseudo = trim(p_pseudo) where user_id = auth.uid();
end;
$$;

-- Agences dont le nom commence par ce qui est tapé (puis celles qui le
-- contiennent), sans soi-même, avec le lien qu'on a déjà avec elles.
-- Deux lettres au moins, six réponses au plus.
create function enquete_chercher_agences(p_debut text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_motif text := replace(replace(replace(lower(trim(p_debut)), '\', '\\'), '%', '\%'), '_', '\_');
begin
  perform enquete_exiger_joueur();
  if length(trim(p_debut)) < 2 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('pseudo', t.pseudo, 'lien', t.lien) order by t.rang, lower(t.pseudo))
    from (
      select j.pseudo,
             case when lower(j.pseudo) like v_motif || '%' then 0 else 1 end as rang,
             (select case
                       when f.acceptee_at is not null then 'associe'
                       when f.de = v_uid then 'envoyee'
                       else 'recue'
                     end
              from enquete_amities f
              where (f.de = v_uid and f.a = j.user_id) or (f.a = v_uid and f.de = j.user_id)
              limit 1) as lien
      from enquete_joueurs j
      where j.user_id <> v_uid and lower(j.pseudo) like '%' || v_motif || '%'
      order by rang, lower(j.pseudo)
      limit 6
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke execute on function enquete_renommer(text), enquete_chercher_agences(text) from public, anon;
grant execute on function enquete_renommer(text), enquete_chercher_agences(text) to authenticated;
