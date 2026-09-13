begin;

create table public.suite_features (
  id text primary key check (id ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  title text not null
);
create table public.suite_feature_access (
  platform_id text not null check (platform_id in ('olympus', 'meridian')),
  feature_id text not null references public.suite_features(id),
  enabled boolean not null default false,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (platform_id, feature_id)
);
create table public.suite_sidebar_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id text not null,
  feature_id text not null,
  value jsonb not null,
  primary key (user_id, platform_id, feature_id),
  foreign key (platform_id, feature_id) references public.suite_feature_access(platform_id, feature_id),
  constraint suite_sidebar_value check (
    jsonb_typeof(value) = 'object' and (
      (feature_id = 'sidebar.customize' and value ? 'width' and jsonb_typeof(value->'width') = 'string' and value->>'width' in ('compact','wide') and value - 'width' = '{}'::jsonb)
      or (feature_id = 'sidebar.shortcuts' and value ? 'shortcuts' and jsonb_typeof(value->'shortcuts') = 'array'
        and jsonb_array_length(value->'shortcuts') <= 12 and value - 'shortcuts' = '{}'::jsonb
        and not jsonb_path_exists(value, '$.shortcuts[*] ? (@.type() != "string" || !(@ like_regex "^[a-zA-Z0-9/_-]{1,100}$"))'))
    )
  )
);
create index suite_sidebar_feature_fk on public.suite_sidebar_preferences(platform_id,feature_id);
create index suite_feature_updated_by on public.suite_feature_access(updated_by);

alter table public.suite_features enable row level security;
alter table public.suite_feature_access enable row level security;
alter table public.suite_sidebar_preferences enable row level security;
revoke all on public.suite_features, public.suite_feature_access, public.suite_sidebar_preferences from anon, authenticated;
grant select on public.suite_features to anon, authenticated;
grant select (platform_id,feature_id,enabled,revision,updated_at) on public.suite_feature_access to anon, authenticated;
grant update (enabled) on public.suite_feature_access to authenticated;
grant select,insert,update,delete on public.suite_sidebar_preferences to authenticated;
grant all on public.suite_features, public.suite_feature_access, public.suite_sidebar_preferences to service_role;

create policy suite_features_read on public.suite_features for select to anon,authenticated using (true);
create policy suite_access_read on public.suite_feature_access for select to anon,authenticated using (true);
create policy suite_access_owner_update on public.suite_feature_access for update to authenticated
  using (exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='owner'))
  with check (exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='owner'));

-- An enabled feature never grants a user an editorial role.
create policy suite_preferences_select on public.suite_sidebar_preferences for select to authenticated
  using (user_id=(select auth.uid())
    and exists(select 1 from public.suite_feature_access f where f.platform_id=suite_sidebar_preferences.platform_id and f.feature_id=suite_sidebar_preferences.feature_id and f.enabled)
    and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and (r.role='owner' or (suite_sidebar_preferences.platform_id='meridian' and r.role in ('admin','editor','researcher','fact_checker')))));
create policy suite_preferences_insert on public.suite_sidebar_preferences for insert to authenticated
  with check (user_id=(select auth.uid())
    and exists(select 1 from public.suite_feature_access f where f.platform_id=suite_sidebar_preferences.platform_id and f.feature_id=suite_sidebar_preferences.feature_id and f.enabled)
    and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and (r.role='owner' or (suite_sidebar_preferences.platform_id='meridian' and r.role in ('admin','editor','researcher','fact_checker')))));
create policy suite_preferences_update on public.suite_sidebar_preferences for update to authenticated
  using (user_id=(select auth.uid())
    and exists(select 1 from public.suite_feature_access f where f.platform_id=suite_sidebar_preferences.platform_id and f.feature_id=suite_sidebar_preferences.feature_id and f.enabled)
    and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and (r.role='owner' or (suite_sidebar_preferences.platform_id='meridian' and r.role in ('admin','editor','researcher','fact_checker')))))
  with check (user_id=(select auth.uid())
    and exists(select 1 from public.suite_feature_access f where f.platform_id=suite_sidebar_preferences.platform_id and f.feature_id=suite_sidebar_preferences.feature_id and f.enabled)
    and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and (r.role='owner' or (suite_sidebar_preferences.platform_id='meridian' and r.role in ('admin','editor','researcher','fact_checker')))));
create policy suite_preferences_delete on public.suite_sidebar_preferences for delete to authenticated
  using (user_id=(select auth.uid()));

create function public.suite_stamp_feature_access() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function public.suite_stamp_feature_access() from public, anon, authenticated;
create trigger suite_stamp_feature_access before update on public.suite_feature_access
  for each row execute function public.suite_stamp_feature_access();

insert into public.suite_features(id,title) values
 ('sidebar.customize','Sidebar aanpassen'),('sidebar.search','Zoeken in het menu'),('sidebar.shortcuts','Eigen snelkoppelingen');
insert into public.suite_feature_access(platform_id,feature_id,enabled)
  select p.id,f.id,true from (values ('olympus'),('meridian')) p(id) cross join public.suite_features f;

commit;
