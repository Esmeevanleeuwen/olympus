const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../.suite-test/suite-preferences.js');
const { FEATURES } = require('../.suite-test/features.js');
const { SUITE_KEY, DRAFTS_KEY, LEGACY_LAYOUT_KEY, defaultPreferences, emptyDrafts, parsePreferences, parseDrafts, migrateLegacyLayout, orderedFeatures, visibleFeatures, patchTool, moveTool, canOpen, panelAfterPreferenceChange, readSuite, savePreferences, saveDrafts } = model;
function memory(seed = {}) {
  const records = new Map(Object.entries(seed)), writes = [];
  return { records, writes, getItem: key => records.get(key) ?? null, setItem: (key, value) => { writes.push(key); records.set(key, value); } };
}
test('independent defaults: one usable scratchpad; future tools off', () => {
  const a = defaultPreferences(), b = defaultPreferences();
  assert.equal(canOpen(a, 'scratchpad'), true);
  assert.equal(canOpen(a, 'blank-tool'), false);
  assert.deepEqual(visibleFeatures(a).map(x => x.id), ['scratchpad']);
  a.tools.scratchpad.enabled = false;
  assert.equal(b.tools.scratchpad.enabled, true);
});
test('every registered tool has a preference and renderer', () => {
  assert.equal(new Set(FEATURES.map(x => x.id)).size, FEATURES.length);
  for (const feature of FEATURES) {
    assert.ok(defaultPreferences().tools[feature.id]);
    assert.ok(['scratchpad', 'placeholder'].includes(feature.renderer));
  }
});
test('unknown IDs cannot open and never become registry entries', () => {
  const input = defaultPreferences(); input.tools.untrusted = { enabled: true };
  assert.equal(canOpen(input, '__proto__'), false);
  assert.equal(canOpen(input, 'untrusted'), false);
  assert.equal(parsePreferences(input).tools.untrusted, undefined);
});
test('new registry entries get defaults when loading old preferences', () => {
  assert.equal(parsePreferences({ version: 1, tools: {} }).tools['blank-tool'].enabled, false);
});
test('untrusted flags and extreme ordering values are normalized', () => {
  const result = parsePreferences({ version: 1, collapsed: 'true', tools: { scratchpad: { enabled: 'false', showInSidebar: 'yes', order: -12 }, 'blank-tool': { order: Infinity } } });
  assert.equal(result.collapsed, false);
  assert.equal(result.tools.scratchpad.enabled, true);
  assert.deepEqual(orderedFeatures(result).map(x => result.tools[x.id].order), [0, 1, 2, 3, 4]);
});
test('top-level corrupt/unsupported preferences are rejected', () => {
  for (const value of [null, [], {}, { version: 2, tools: {} }, { version: 1, tools: [] }]) assert.throws(() => parsePreferences(value));
});
test('hiding a tool keeps it enabled; disabled pinned tools remain visible', () => {
  const hidden = patchTool(defaultPreferences(), 'scratchpad', { showInSidebar: false });
  assert.equal(canOpen(hidden, 'scratchpad'), true);
  assert.equal(visibleFeatures(hidden).length, 0);
  const disabled = patchTool(defaultPreferences(), 'scratchpad', { enabled: false });
  assert.equal(canOpen(disabled, 'scratchpad'), false);
  assert.equal(visibleFeatures(disabled)[0].id, 'scratchpad');
});
test('hide or disable active tool closes panel without changing another panel', () => {
  const before = defaultPreferences();
  for (const patch of [{ showInSidebar: false }, { enabled: false }]) {
    const after = patchTool(before, 'scratchpad', patch);
    assert.equal(panelAfterPreferenceChange('scratchpad', before, after), null);
    assert.equal(panelAfterPreferenceChange('library', before, after), 'library');
  }
});
test('hidden enabled tools can open from library and remain open on unrelated changes', () => {
  const before = patchTool(defaultPreferences(), 'scratchpad', { showInSidebar: false });
  assert.equal(panelAfterPreferenceChange('scratchpad', before, { ...before, collapsed: true }), 'scratchpad');
});
test('reordering is stable, immutable and bounds checked', () => {
  const before = defaultPreferences(), moved = moveTool(before, 'blank-tool', -1);
  assert.deepEqual(orderedFeatures(moved).slice(0, 2).map(x => x.id), ['blank-tool', 'scratchpad']);
  assert.equal(before.tools.scratchpad.order, 0);
  assert.deepEqual(moveTool(before, 'scratchpad', -1), before);
  assert.deepEqual(parsePreferences(moved), moved);
});
test('legacy visibility flags migrate without touching original drafts or data', () => {
  const legacy = { blocks: [{ text: 'keep me' }], audiences: [{ text: 'also keep me' }], suite: { visible: false, tools: { scratchpad: true, 'api-sandbox': true } }, snapshot: 'never copy' };
  const copy = JSON.stringify(legacy), result = migrateLegacyLayout(legacy);
  assert.equal(result.collapsed, true);
  assert.equal(result.tools['api-sandbox'].enabled, true);
  assert.equal(JSON.stringify(legacy), copy);
  assert.equal(JSON.stringify(result).includes('keep me'), false);
  assert.equal(JSON.stringify(result).includes('never copy'), false);
});
test('current preferences take precedence over obsolete layout flags', () => {
  const prefs = patchTool(defaultPreferences(), 'scratchpad', { enabled: false });
  const storage = memory({ [SUITE_KEY]: JSON.stringify(prefs), [LEGACY_LAYOUT_KEY]: JSON.stringify({ suite: { tools: { scratchpad: true } } }) });
  assert.equal(readSuite(storage).preferences.tools.scratchpad.enabled, false);
});
test('loading writes only separate suite keys and leaves old storage byte-for-byte intact', () => {
  const legacy = JSON.stringify({ blocks: ['private'], suite: { visible: true, tools: { scratchpad: false } } });
  const storage = memory({ [LEGACY_LAYOUT_KEY]: legacy, 'other-app': 'unchanged' });
  const suite = readSuite(storage);
  assert.equal(suite.preferencesSaved, true); assert.equal(suite.draftsSaved, true);
  assert.equal(storage.records.get(LEGACY_LAYOUT_KEY), legacy);
  assert.deepEqual(storage.writes, [SUITE_KEY, DRAFTS_KEY]);
  assert.equal(storage.records.get('other-app'), 'unchanged');
});
test('scratchpad validation bounds length and drops arbitrary extra data', () => {
  const raw = { version: 1, scratchpad: '<script>plain text</script>', token: 'secret', resources: [] };
  assert.deepEqual(parseDrafts(raw), { version: 1, scratchpad: raw.scratchpad });
  assert.throws(() => parseDrafts({ version: 1, scratchpad: 'x'.repeat(4001) }));
  assert.equal(parseDrafts({ version: 1, scratchpad: 'x'.repeat(4000) }).scratchpad.length, 4000);
});
test('corrupt saved preferences are preserved for recovery instead of overwritten', () => {
  const storage = memory({ [SUITE_KEY]: '{broken' });
  const state = readSuite(storage);
  assert.equal(state.preferencesWritable, false);
  assert.equal(state.preferencesSaved, false);
  assert.equal(storage.records.get(SUITE_KEY), '{broken');
});
test('corrupt or oversized drafts are preserved without being exposed to the UI', () => {
  for (const raw of ['{broken', 'x'.repeat(30001), JSON.stringify({ version: 1, scratchpad: 'x'.repeat(5000) })]) {
    const storage = memory({ [DRAFTS_KEY]: raw });
    const suite = readSuite(storage);
    assert.equal(suite.draftsWritable, false); assert.equal(suite.drafts.scratchpad, '');
    assert.equal(storage.records.get(DRAFTS_KEY), raw);
  }
});
test('unavailable storage falls back to session state without throwing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readSuite(blocked).preferencesSaved, false);
  assert.equal(readSuite(null).draftsSaved, false);
  assert.equal(savePreferences(blocked, defaultPreferences()), false);
  assert.equal(saveDrafts(blocked, emptyDrafts()), false);
});
test('quota failure retains loaded drafts in memory', () => {
  const storage = memory({ [DRAFTS_KEY]: JSON.stringify({ version: 1, scratchpad: 'existing note' }) });
  storage.setItem = () => { throw new Error('quota'); };
  const state = readSuite(storage);
  assert.equal(state.drafts.scratchpad, 'existing note');
  assert.equal(state.draftsSaved, false);
});
test('resetting preferences does not erase scratchpad or legacy blocks/audiences', () => {
  const storage = memory({ [LEGACY_LAYOUT_KEY]: 'preserve old drafts', [DRAFTS_KEY]: JSON.stringify({ version: 1, scratchpad: 'keep note' }) });
  savePreferences(storage, defaultPreferences());
  assert.equal(JSON.parse(storage.records.get(DRAFTS_KEY)).scratchpad, 'keep note');
  assert.equal(storage.records.get(LEGACY_LAYOUT_KEY), 'preserve old drafts');
});
test('resetting scratchpad does not overwrite preferences or other keys', () => {
  const prefs = JSON.stringify(patchTool(defaultPreferences(), 'api-sandbox', { enabled: true }));
  const storage = memory({ [SUITE_KEY]: prefs, [LEGACY_LAYOUT_KEY]: 'unchanged' });
  saveDrafts(storage, emptyDrafts());
  assert.equal(storage.records.get(SUITE_KEY), prefs);
  assert.equal(storage.records.get(LEGACY_LAYOUT_KEY), 'unchanged');
});
