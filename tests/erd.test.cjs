const { test } = require('node:test');
const assert = require('node:assert/strict');
const m = require('../.model-test/erd.js');
const col = name => ({ name, type:'uuid', nullable:false });
const parent = { schema:'public', name:'parents', columns:[col('tenant'),col('id')], primaryKey:['tenant','id'], foreignKeys:[] };
const child = { schema:'public', name:'children', columns:[col('id'),col('tenant'),col('parent')], primaryKey:['id'], foreignKeys:[{name:'parent_fk',columns:['tenant','parent'],target:{schema:'public',name:'parents',columns:['tenant','id']}}] };
const project = (id='aaaaaaaaaaaaaaaaaaaa') => ({id,name:'Test database',capturedAt:'2026-09-12T12:00:00Z',tables:structuredClone([parent,child])});
const snapshot = (...projects) => ({version:1,kind:'olympus-erd',projects:projects.length ? projects : [project()]});

test('schema imports preserve composite key order and accept SQL Editor JSON wrappers', () => {
  for (const raw of [snapshot(), [{snapshot:snapshot()}], {snapshot:JSON.stringify(snapshot())}, JSON.stringify(snapshot())]) {
    const parsed=m.parseErdSnapshot(raw);
    assert.deepEqual(parsed.projects[0].tables[1].foreignKeys[0].columns,['tenant','parent']);
    assert.deepEqual(parsed.projects[0].tables[1].foreignKeys[0].target.columns,['tenant','id']);
  }
});
test('row-count snapshots and malformed references are rejected with useful errors', () => {
  assert.throws(()=>m.parseErdSnapshot({version:1,resources:[]}),/Row-count/);
  for (const mutate of [p=>p.tables.push(p.tables[0]),p=>p.tables[1].foreignKeys[0].columns=['missing','parent'],p=>p.tables[1].foreignKeys[0].target.columns=['missing','id'],p=>p.tables[1].foreignKeys[0].target.columns=['id'],p=>p.capturedAt='yesterday',p=>p.tables[1].columns[0].nullable='yes']) {
    const p=project();mutate(p);assert.throws(()=>m.parseErdSnapshot(snapshot(p)));
  }
});
test('unknown fields and table records are stripped from imported metadata', () => {
  const p=project();p.token='secret';p.tables[0].rows=[{private:'record'}];p.tables[0].columns[0].default='secret default';
  const parsed=m.parseErdSnapshot(snapshot(p));
  assert.equal(parsed.projects[0].token,undefined);
  assert.equal(parsed.projects[0].tables[0].rows,undefined);
  assert.equal(parsed.projects[0].tables[0].columns[0].default,undefined);
});
test('projects remain separate and reimport replaces only the same project', () => {
  const a=project(),b=project('bbbbbbbbbbbbbbbbbbbb');
  const original=m.parseErdSnapshot(snapshot(a,b));a.tables=[];
  const next=m.mergeErdSnapshots(original,m.parseErdSnapshot(snapshot(a)));
  assert.equal(next.projects.length,2);assert.equal(next.projects.find(p=>p.id===a.id).tables.length,0);assert.equal(next.projects.find(p=>p.id===b.id).tables.length,2);
  assert.equal(original.projects[0].tables.length,2);
});
test('external targets show only declared referenced columns without inferred primary keys', () => {
  const p=project();p.tables[1].foreignKeys=[{name:'user_fk',columns:['parent'],target:{schema:'auth',name:'users',columns:['id']}}];
  const graph=m.diagramFor(m.parseErdSnapshot(snapshot(p)).projects[0],'public',m.tableKey(child),true);
  const external=graph.tables.find(t=>t.external);
  assert.equal(external.schema,'auth');assert.deepEqual(external.columns.map(c=>c.name),['id']);assert.deepEqual(external.primaryKey,[]);
  assert.equal(graph.edges.length,1);assert.equal(graph.tables.length,2);
});
test('self references, cross-schema keys and unrelated tables have accurate graph scope', () => {
  const p=project();p.tables[0].schema='app';p.tables[1].foreignKeys[0].target.schema='app';
  p.tables[1].foreignKeys.push({name:'self_fk',columns:['parent'],target:{schema:'public',name:'children',columns:['id']}});
  p.tables.push({schema:'public',name:'unrelated',columns:[col('parent')],primaryKey:[],foreignKeys:[]});
  const checked=m.parseErdSnapshot(snapshot(p)).projects[0];
  const graph=m.diagramFor(checked,'app',m.tableKey(checked.tables[0]),true);
  assert.equal(graph.edges.length,1);assert.equal(graph.tables.length,2);
  const all=m.diagramFor(checked,'public','',false);
  assert.equal(all.tables.length,3);assert.equal(all.edges.length,2);
  const standalone=m.diagramFor(checked,'',m.tableKey(checked.tables[2]),true);
  assert.equal(standalone.tables.length,1);assert.equal(standalone.edges.length,0);
});
test('quoted identifiers cannot collide across schema and table boundaries', () => {
  assert.notEqual(m.tableKey({schema:'a.b',name:'c'}),m.tableKey({schema:'a',name:'b.c'}));
});
test('project URL parsing only accepts official project URLs or references', () => {
  const id='aaaaaaaaaaaaaaaaaaaa';
  for(const input of [id,`https://${id}.supabase.co`,`https://supabase.com/dashboard/project/${id}/editor`]) assert.equal(m.supabaseProjectId(input),id);
  for(const input of ['test','https://evil.example/project/'+id,`https://supabase.com.evil.example/dashboard/project/${id}`,`https://token@${id}.supabase.co`]) assert.throws(()=>m.supabaseProjectId(input));
});
test('schema query escapes project labels and reads catalogs, not application records', () => {
  const sql=m.schemaExportSql('aaaaaaaaaaaaaaaaaaaa', "Zeus' \\ realm");
  assert.ok(sql.includes("E'Zeus'' \\\\ realm'"));
  assert.match(sql,/with ordinality/);assert.match(sql,/from pg_attribute/);
  assert.doesNotMatch(sql,/select \*|from public\.|insert into|update public\.|delete from/i);
});
