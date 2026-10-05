-- Activity log that says WHAT changed, e.g. "Price: AED 69.99 → AED 100.99", "Timeline: 17 → 18 rows",
-- instead of only "Edited tour". A save that changes nothing is no longer logged.
-- The log keeps the newest 2,000 entries.

-- Short readable form of one value, or null if it is too long to show (then we just say "changed")
create or replace function public.activity_short(v jsonb, money boolean default false)
returns text
language sql
immutable
as $$
  select case
    when v is null or v = 'null'::jsonb then '(empty)'
    when jsonb_typeof(v) = 'number' then case when money then 'AED ' else '' end || (v #>> '{}')
    when jsonb_typeof(v) = 'boolean' then case when (v #>> '{}')::boolean then 'yes' else 'no' end
    when jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= 80 then '"' || (v #>> '{}') || '"'
    else null
  end;
$$;

-- One line for one changed field
create or replace function public.activity_line(label text, o jsonb, n jsonb, money boolean default false)
returns text
language sql
immutable
as $$
  select case
    when public.activity_short(o, money) is not null and public.activity_short(n, money) is not null
      then label || ': ' || public.activity_short(o, money) || ' → ' || public.activity_short(n, money)
    else label || ' changed'
  end;
$$;

-- List of readable lines for everything that differs between two versions of a tour
create or replace function public.tour_changes(o jsonb, n jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  k text;
  ov jsonb;
  nv jsonb;
  lines text[] := '{}';
  label text;
  oc int;
  nc int;
  unit text;
  sub text;
begin
  for k in select distinct key from (select jsonb_object_keys(coalesce(o, '{}')) as key union select jsonb_object_keys(coalesce(n, '{}'))) s order by 1 loop
    ov := o -> k;
    nv := n -> k;
    continue when ov is not distinct from nv;
    label := case k
      when 'name' then 'Name'
      when 'accent' then 'Second part of the name'
      when 'type' then 'Tour type'
      when 'duration' then 'Duration'
      when 'intro' then 'Description'
      when 'points' then 'Highlights'
      when 'price' then 'Price'
      when 'was' then 'Old (crossed-out) price'
      when 'privateTiers' then 'Private prices'
      when 'privateNote' then 'Line under private prices'
      when 'costNote' then '"No hidden costs" text'
      when 'pickupFact' then 'Pickup line'
      when 'pickupNote' then 'Pickup note'
      when 'included' then 'What''s included'
      when 'notIncluded' then 'Not included'
      when 'notes' then 'Important notes'
      when 'timeline' then 'Timeline'
      when 'pickupAreas' then 'Pickup points'
      when 'photos' then 'Photos'
      when 'heroTitle' then 'Page title'
      when 'pickupCard' then 'Pickup card'
      when 'cardText' then 'Card text'
      when 'spotlight' then 'Home page feature box'
      else k
    end;

    if k = 'privateTiers' then
      lines := lines || (label || ': ' ||
        coalesce((select string_agg((t ->> 'seats') || '-seater AED ' || (t ->> 'price'), ', ') from jsonb_array_elements(coalesce(ov, '[]')) t), '(none)') || ' → ' ||
        coalesce((select string_agg((t ->> 'seats') || '-seater AED ' || (t ->> 'price'), ', ') from jsonb_array_elements(coalesce(nv, '[]')) t), '(none)'));
    elsif k = 'pickupAreas' then
      oc := coalesce((select sum(jsonb_array_length(coalesce(a -> 'points', '[]'))) from jsonb_array_elements(coalesce(ov, '[]')) a), 0);
      nc := coalesce((select sum(jsonb_array_length(coalesce(a -> 'points', '[]'))) from jsonb_array_elements(coalesce(nv, '[]')) a), 0);
      lines := lines || case when oc <> nc then label || ': ' || oc || ' → ' || nc || ' points' else label || ' edited (names, times or areas)' end;
    elsif jsonb_typeof(coalesce(ov, nv)) = 'array' then
      oc := case when jsonb_typeof(ov) = 'array' then jsonb_array_length(ov) else 0 end;
      nc := case when jsonb_typeof(nv) = 'array' then jsonb_array_length(nv) else 0 end;
      unit := case k when 'timeline' then ' rows' when 'photos' then ' photos' else ' items' end;
      lines := lines || case when oc <> nc then label || ': ' || oc || ' → ' || nc || unit
        else label || ' edited' || case k when 'photos' then ' (order, captions or photos swapped)' when 'timeline' then ' (times, text or order)' else '' end end;
    elsif jsonb_typeof(coalesce(ov, nv)) = 'object' then
      for sub in select distinct key from (select jsonb_object_keys(coalesce(ov, '{}')) as key union select jsonb_object_keys(coalesce(nv, '{}'))) s order by 1 loop
        continue when (ov -> sub) is not distinct from (nv -> sub);
        lines := lines || public.activity_line(label || ' (' || case sub when 'prefix' then 'first part' when 'accent' then 'coloured part' when 'title' then 'title' when 'text' then 'text' when 'tagline' then 'tagline' when 'desc' then 'text' when 'list' then 'list' else sub end || ')', ov -> sub, nv -> sub);
      end loop;
    else
      lines := lines || public.activity_line(label, ov, nv, k in ('price', 'was'));
    end if;
  end loop;
  return to_jsonb(lines);
end;
$$;

create or replace function public.tours_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changes jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('Added tour', new.slug, null);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('Deleted tour', old.slug, null);
    return old;
  end if;
  changes := public.tour_changes(old.data, new.data);
  if old.visible is distinct from new.visible then
    changes := jsonb_build_array(case when new.visible then 'Shown on the website' else 'Hidden from the website' end) || changes;
  end if;
  if jsonb_array_length(changes) > 0 then
    perform public.log_activity('Edited tour', coalesce(new.data ->> 'name', new.slug) || ' ' || coalesce(new.data ->> 'accent', ''), jsonb_build_object('changes', changes));
  end if;
  return new;
end;
$$;

-- Settings: one line per changed setting, with old and new value
create or replace function public.settings_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  lines text[] := '{}';
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  label text;
begin
  for k in select jsonb_object_keys(n) order by 1 loop
    continue when k in ('id', 'updated_at', 'updated_by') or (o -> k) is not distinct from (n -> k);
    label := case k
      when 'cutoff_hour' then 'Bookings for tomorrow close at (hour)'
      when 'whatsapp' then 'WhatsApp number'
      when 'phone' then 'Phone'
      when 'email' then 'Email'
      when 'offer_on' then 'Offer banner on'
      when 'offer_text' then 'Offer banner text'
      when 'team_emails' then 'Team email'
      when 'team_alert_on' then 'New booking alert email'
      when 'status_on' then 'Status update email'
      when 'reminder_on' then 'Reminder email'
      when 'review_request_on' then 'Review request email'
      else k
    end;
    lines := lines || public.activity_line(label, o -> k, n -> k);
  end loop;
  if array_length(lines, 1) > 0 then
    perform public.log_activity(
      case when tg_table_name = 'site_settings' then 'Changed website settings' else 'Changed email settings' end,
      null, jsonb_build_object('changes', to_jsonb(lines)));
  end if;
  return new;
end;
$$;

-- Bookings: say what changed in words too
create or replace function public.bookings_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.source = 'manual' then
      perform public.log_activity('Added a booking by hand', new.ref, jsonb_build_object('changes', jsonb_build_array(
        new.customer_name || ', ' || new.tour_name || ', ' || to_char(new.travel_date, 'DD Mon YYYY'))));
    end if;
  elsif old.status is distinct from new.status then
    perform public.log_activity('Changed booking status', new.ref, jsonb_build_object('changes', jsonb_build_array(
      'Status: ' || old.status || ' → ' || new.status || ' (' || new.customer_name || ')')));
  elsif old.team_notes is distinct from new.team_notes then
    perform public.log_activity('Edited booking note', new.ref, jsonb_build_object('changes', jsonb_build_array(
      'Note: ' || coalesce(left(new.team_notes, 120), '(removed)'))));
  end if;
  return new;
end;
$$;

-- Blocked dates: readable date + reason
create or replace function public.blocked_dates_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.actor_email();
    perform public.log_activity('Blocked a date', coalesce((select (data ->> 'name') || ' ' || coalesce(data ->> 'accent', '') from public.tours where slug = new.tour_slug), 'all tours'), jsonb_build_object('changes', jsonb_build_array(
      to_char(new.date, 'Dy DD Mon YYYY') || coalesce(' (' || new.note || ')', ''))));
    return new;
  end if;
  perform public.log_activity('Unblocked a date', coalesce((select (data ->> 'name') || ' ' || coalesce(data ->> 'accent', '') from public.tours where slug = old.tour_slug), 'all tours'), jsonb_build_object('changes', jsonb_build_array(
    to_char(old.date, 'Dy DD Mon YYYY'))));
  return old;
end;
$$;

-- Keep the newest 2,000 entries
create or replace function public.log_activity(p_action text, p_target text, p_details jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log (actor, action, target, details)
  values (public.actor_email(), p_action, p_target, p_details);
  delete from public.activity_log
  where id < (select id from public.activity_log order by id desc offset 1999 limit 1);
end;
$$;

revoke all on function public.log_activity(text, text, jsonb) from public;
