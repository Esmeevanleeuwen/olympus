const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('packages/workspace-ui/model.ts','utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source,{ compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }}).outputText,context);
const { flagsFor, normalizePreferences, effectivePreferences, CLOSED_FLAGS } = context.exports;
const plain = v => JSON.parse(JSON.stringify(v));
test('platform flags fail closed and never enable a different platform', () => {
  assert.deepEqual(plain(flagsFor([], 'meridian')),plain(CLOSED_FLAGS));
  const rows=[{ platform_id:'olympus',feature_id:'sidebar.search',enabled:true },{ platform_id:'meridian',feature_id:'not-installed',enabled:true }];
  assert.equal(flagsFor(rows,'meridian')['sidebar.search'],false);
  assert.equal(flagsFor(rows,'olympus')['sidebar.search'],true);
  rows.push({platform_id:'meridian',feature_id:'sidebar.search',enabled:'true'});
  assert.equal(flagsFor(rows,'meridian')['sidebar.search'],false);
});
test('disabled features ignore saved preferences without deleting them', () => {
  const saved={width:'wide',shortcuts:['/admin/content']};
  assert.deepEqual(plain(effectivePreferences(saved,CLOSED_FLAGS)),{width:'compact',shortcuts:[]});
  assert.deepEqual(saved,{width:'wide',shortcuts:['/admin/content']});
  assert.deepEqual(plain(effectivePreferences(saved,{'sidebar.customize':true,'sidebar.shortcuts':true})),saved);
});
test('untrusted preferences reject URLs, unknown widths and oversized or duplicate shortcuts', () => {
  const data=normalizePreferences({width:'huge',shortcuts:['/admin','/admin',{},'javascript:alert(1)','https://example.com']});
  assert.deepEqual(plain(data),{width:'compact',shortcuts:['/admin']});
  assert.equal(normalizePreferences({shortcuts:Array.from({length:20},(_,i)=>`page-${i}`)}).shortcuts.length,12);
  assert.deepEqual(plain(normalizePreferences(null)),{width:'compact',shortcuts:[]});
});
