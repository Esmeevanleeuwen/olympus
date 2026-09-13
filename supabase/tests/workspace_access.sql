begin;
select set_config('suite.test_owner', (select user_id::text from public.user_roles where role='owner' limit 1), true);
select set_config('suite.test_member', (select user_id::text from public.user_roles where role='contributor' limit 1), true);
set local role anon;
do $$ begin
  if (select count(*) from (select platform_id from public.suite_feature_access) f) <> 6 then raise exception 'Missing initial feature grants'; end if;
  begin
    update public.suite_feature_access set enabled=false;
    raise exception 'Anonymous write was allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform user_id from public.suite_sidebar_preferences;
    raise exception 'Anonymous preference read was allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('suite.test_member'),'role','authenticated','user_metadata',json_build_object('role','owner'))::text,true);
do $$ declare n integer; begin
  update public.suite_feature_access set enabled=false;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Member changed feature access'; end if;
  begin
    insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(auth.uid(),'meridian','sidebar.customize','{"width":"wide"}');
    raise exception 'Member wrote editorial preferences';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('suite.test_owner'),'role','authenticated')::text,true);
do $$ declare n integer; rev integer; begin
  select revision into rev from public.suite_feature_access where platform_id='meridian' and feature_id='sidebar.customize';
  update public.suite_feature_access set enabled=false where platform_id='meridian' and feature_id='sidebar.customize' and revision=rev;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner could not toggle'; end if;
  update public.suite_feature_access set enabled=true where platform_id='meridian' and feature_id='sidebar.customize' and revision=rev;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Stale change overwrote newer version'; end if;
  if (select revision from public.suite_feature_access where platform_id='meridian' and feature_id='sidebar.customize')<>rev+1 then raise exception 'Revision not advanced'; end if;
  begin
    insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(auth.uid(),'meridian','sidebar.customize','{"width":"wide"}') on conflict(user_id,platform_id,feature_id) do update set value=excluded.value;
    raise exception 'Disabled feature accepted a direct API write';
  exception when insufficient_privilege then null; end;
  insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(auth.uid(),'olympus','sidebar.customize','{"width":"wide"}') on conflict(user_id,platform_id,feature_id) do update set value=excluded.value;
  update public.suite_feature_access set enabled=true where platform_id='meridian' and feature_id='sidebar.customize';
  insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(auth.uid(),'meridian','sidebar.customize','{"width":"compact"}') on conflict(user_id,platform_id,feature_id) do update set value=excluded.value;
  if (select value->>'width' from public.suite_sidebar_preferences where user_id=auth.uid() and platform_id='olympus' and feature_id='sidebar.customize') <> 'wide' then raise exception 'Platform preferences leaked into each other'; end if;
  begin
    update public.suite_sidebar_preferences set value='{"width":null}' where user_id=auth.uid() and platform_id='meridian' and feature_id='sidebar.customize';
    raise exception 'Invalid preference accepted';
  exception when check_violation then null; end;
  insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(auth.uid(),'meridian','sidebar.shortcuts','{"shortcuts":["/admin","/admin/content"]}') on conflict(user_id,platform_id,feature_id) do update set value=excluded.value;
  begin
    update public.suite_sidebar_preferences set value='{"shortcuts":["javascript:alert(1)"]}' where user_id=auth.uid() and platform_id='meridian' and feature_id='sidebar.shortcuts';
    raise exception 'Invalid shortcut accepted';
  exception when check_violation then null; end;
  begin
    insert into public.suite_sidebar_preferences(user_id,platform_id,feature_id,value) values(current_setting('suite.test_member')::uuid,'meridian','sidebar.customize','{"width":"wide"}');
    raise exception 'Cross-user write accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.suite_feature_access set platform_id='olympus' where platform_id='meridian';
    raise exception 'Access row key mutable';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('suite.test_member'),'role','authenticated')::text,true);
do $$ begin
  if exists(select 1 from public.suite_sidebar_preferences) then raise exception 'Other users preferences readable'; end if;
end $$;
rollback;
select 'PASS: anonymous/member writes denied; owner CAS works; disabled writes denied; platforms and users isolated; values validated; all test changes rolled back' as result;
