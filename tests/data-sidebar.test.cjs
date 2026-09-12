const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseDataWorkspaceState } = require('../.model-test/data-workspace-bridge.js');

test('sidebar metadata validates names and counts and strips records and unknown fields', () => {
  const message = { type: 'olympus:data-state', selected: 'articles', view: 'data', tables: [{ name: 'articles', rows: 8, fields: 7, records: [{ private: true }] }], sql: 'discard' };
  assert.deepEqual(parseDataWorkspaceState(message), { selected: 'articles', view: 'data', tables: [{ name: 'articles', rows: 8, fields: 7 }] });
  for (const value of [null, {}, { ...message, type: 'other' }, { ...message, selected: 'missing' }, { ...message, view: 'invalid' }, { ...message, tables: [...message.tables, ...message.tables] }, ...[-1, NaN, Infinity].map(rows => ({ ...message, tables: [{ name: 'articles', rows, fields: 7 }] }))]) assert.equal(parseDataWorkspaceState(value), null);
});

test('the embedded workspace syncs table selection and docking only with its own parent', () => {
  const script = fs.readFileSync('public/data-workspace/index.html', 'utf8').split('<script>')[1].split('</script>')[0];
  const messages = [], classes = new Set(), listeners = {};
  const parent = { postMessage: message => messages.push(message) };
  const window = { parent, location: { origin: 'https://olympus.example' }, addEventListener: (name, handler) => { listeners[name] = handler; } };
  const context = vm.createContext({ window, document: { getElementById: () => ({}), body: { classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } } } }, requestAnimationFrame: fn => fn(), console, Date, Intl });
  vm.runInContext(script.split("document.addEventListener('click'")[0], context);
  const run = code => vm.runInContext(code, context);
  run(`renderMain=()=>publishHostState();renderSelectionContext=()=>{};rememberOverview=()=>{};closeInspector=()=>{};SAMPLE_CHANGES.forEach((_,i)=>captureSample(i));publishHostState();`);
  assert.equal(messages.at(-1).tables.length, 5);
  assert.equal(messages.at(-1).tables.find(t => t.name === 'articles').rows, 8);
  const send = (data, source = parent, origin = window.location.origin) => listeners.message({ data, source, origin });
  send({ type: 'olympus:data-host', docked: true }, {}, window.location.origin);
  assert(!classes.has('hosted-sidebar'));
  send({ type: 'olympus:data-select', table: 'users' }, parent, 'https://untrusted.example');
  assert.equal(run('state.table'), 'articles');
  send({ type: 'olympus:data-host', docked: true });
  assert(classes.has('hosted-sidebar'));
  send({ type: 'olympus:data-select', table: 'users' });
  assert.equal(run('state.table'), 'users'); assert.equal(messages.at(-1).selected, 'users');
  send({ type: 'olympus:data-select', table: '__proto__' });
  assert.equal(run('state.table'), 'users');
  run(`setContext({type:'column',table:'projects',column:'name'});`);
  assert.equal(messages.at(-1).selected, 'projects');
  send({ type: 'olympus:data-host', docked: false });
  assert(!classes.has('hosted-sidebar'));
  run(`TABLES.users.columns.push({name:'new_field',type:'text'});publishHostState();`);
  assert.equal(messages.at(-1).tables.find(t => t.name === 'users').fields, run('TABLES.users.columns.length'));
  const last = messages.at(-1); assert(last.tables.every(table => typeof table.rows === 'number' && !('records' in table)));
});
