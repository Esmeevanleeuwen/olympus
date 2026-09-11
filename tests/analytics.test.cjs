const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const access = require('../.analytics-test/lib/server/analytics-access.js');
const model = require('../.analytics-test/lib/analytics.js');
const service = require('../.analytics-test/lib/server/vercel-analytics.js');
const route = require('../.analytics-test/app/api/vercel-analytics/route.js');
const projectsRoute = require('../.analytics-test/app/api/vercel-analytics/projects/route.js');
const session = require('../.analytics-test/app/api/vercel-analytics/session/route.js');
const { TrafficChart, TrafficList } = require('../.analytics-test/components/vercel-analytics.js');
const secret = 'test-only-owner-password-123456';
const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const now = new Date('2026-09-11T12:00:00Z');
let calls;

beforeEach(() => {
  process.env.OLYMPUS_OWNER_PASSWORD = secret;
  process.env.OLYMPUS_VERCEL_TOKEN = 'test-only-api-token';
  process.env.OLYMPUS_VERCEL_PROJECT_ID = 'prj_configured';
  process.env.OLYMPUS_VERCEL_TEAM_ID = 'team_configured';
  calls = [];
});
afterEach(() => { process.env = { ...originalEnv }; global.fetch = originalFetch; });

async function fixtureFetch(input, init) {
  const url = new URL(input);
  calls.push({ url, init });
  if (url.pathname === '/v10/projects') return Response.json({ projects: [
    { id: 'prj_configured', name: 'fixture-project', accountId: 'team_configured', unrelatedSecret: 'never-expose' },
    { id: 'prj_second', name: 'another-project', accountId: 'team_configured', env: [{ value: 'private-env-value' }] },
    { id: 'prj_outside', name: 'outside-team', accountId: 'team_other' }
  ], pagination: { next: null } });
  const second = url.searchParams.get('projectId') === 'prj_second';
  const rows = {
    environment: [{ environment: 'production', pageviews: second ? 12 : 90, visitors: second ? 5 : 20 }],
    day: [{ timestamp: '2026-09-10T00:00:00Z', pageviews: 50, visitors: 17 }, { timestamp: '2026-09-11T00:00:00Z', pageviews: 40, visitors: 15 }],
    requestPath: [{ requestPath: '/one', pageviews: 50, visitors: 17 }, { requestPath: '/two', pageviews: 40, visitors: 15 }],
    referrerHostname: [{ referrerHostname: null, pageviews: 90, visitors: 20 }]
  };
  return Response.json({ data: rows[url.searchParams.get('by')] });
}
function ownerRequest(query = 'days=7') {
  return new Request(`https://olympus.example/api/vercel-analytics?${query}`, { headers: { Cookie: `${access.SESSION_COOKIE}=${access.createSession(secret)}` } });
}
function loginRequest(password, origin = 'https://olympus.example') {
  return new Request('https://olympus.example/api/vercel-analytics/session', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
}

test('signed owner sessions reject tampering, expiry and password rotation', () => {
  const time = now.getTime();
  const token = access.createSession(secret, time);
  assert(access.validSession(token, secret, time));
  assert(!access.validSession(token, secret, time + access.SESSION_SECONDS * 1000));
  assert(!access.validSession(token.replace(/^\d/, '8'), secret, time));
  assert(!access.validSession(token, 'a-different-password', time));
  assert(!access.validSession('untrusted-token', secret, time));
});
test('anonymous or forged requests cannot read reports or project names', async () => {
  global.fetch = () => { throw new Error('Should not call Vercel'); };
  for (const cookie of ['', `${access.SESSION_COOKIE}=forged`]) {
    const response = await route.GET(new Request('https://olympus.example/api/vercel-analytics', { headers: { Cookie: cookie } }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const projects = await projectsRoute.GET(new Request('https://olympus.example/api/vercel-analytics/projects', { headers: { Cookie: cookie } }));
    assert.equal(projects.status, 401);
    assert.match(projects.headers.get('cache-control'), /no-store/);
  }
});
test('missing owner setup fails closed', async () => {
  delete process.env.OLYMPUS_OWNER_PASSWORD;
  assert.equal((await route.GET(ownerRequest())).status, 503);
});
test('sign-in rejects cross-origin requests and wrong passwords', async () => {
  assert.equal((await session.POST(loginRequest(secret, 'https://other.example'))).status, 403);
  const response = await session.POST(loginRequest('wrong'));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
});
test('owner can sign in, read protected analytics, and clear the cookie', async () => {
  const login = await session.POST(loginRequest(secret));
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/);
  assert(!cookie.includes(secret));
  global.fetch = fixtureFetch;
  const response = await route.GET(new Request('https://olympus.example/api/vercel-analytics?days=7', { headers: { Cookie: cookie.split(';')[0] } }));
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.totals.visitors, 20);
  const logout = await session.DELETE(new Request('https://olympus.example/api/vercel-analytics/session', { method: 'DELETE', headers: { Origin: 'https://olympus.example' } }));
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});
test('client cannot override the team, send malformed project IDs or unsupported periods', async () => {
  global.fetch = () => { throw new Error('Unexpected upstream request'); };
  for (const query of ['days=365', 'days=0', 'days=7&teamId=team_other', 'projectId=../other', 'projectId=', 'days=7&days=30', 'projectId=prj_one&projectId=prj_two']) assert.equal((await route.GET(ownerRequest(query))).status, 400);
  assert.equal((await projectsRoute.GET(ownerRequest('teamId=team_other'))).status, 400);
});
test('all analytics queries use the configured project and the same production period', async () => {
  const report = await service.readVercelAnalytics(7, fixtureFetch, now);
  assert.equal(calls.length, 5);
  for (const { url, init } of calls) {
    assert.equal(url.origin, 'https://api.vercel.com');
    assert.equal(url.searchParams.get('teamId'), 'team_configured');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    if (url.pathname.includes('/visits/')) {
      assert.equal(url.searchParams.get('projectId'), 'prj_configured');
      assert.equal(url.searchParams.get('since'), report.period.since);
      assert.equal(url.searchParams.get('until'), report.period.until);
      assert.equal(url.searchParams.get('filter'), "environment eq 'production'");
    }
  }
  assert.equal(report.totals.visitors, 20); // Not the 32 visitors summed from days/pages.
  assert.equal(report.totals.pageviews, 90);
  assert(!JSON.stringify(report).includes('test-only-api-token'));
  assert(!JSON.stringify(report).includes('never-expose'));
});
test('project discovery returns only safe metadata in the connected team', async () => {
  global.fetch = fixtureFetch;
  const response = await projectsRoute.GET(ownerRequest(''));
  assert.equal(response.status, 200);
  const catalog = await response.json();
  assert.deepEqual(catalog, { teamId: 'team_configured', defaultProjectId: 'prj_configured', projects: [
    { id: 'prj_second', name: 'another-project' }, { id: 'prj_configured', name: 'fixture-project' }
  ] });
  assert(!JSON.stringify(catalog).includes('private-env-value'));
  assert(!JSON.stringify(catalog).includes('never-expose'));
});
test('switching projects changes all report queries and never combines totals', async () => {
  global.fetch = fixtureFetch;
  const first = await (await route.GET(ownerRequest('days=7&projectId=prj_configured'))).json();
  calls = [];
  const response = await route.GET(ownerRequest('days=30&projectId=prj_second'));
  assert.equal(response.status, 200);
  const second = await response.json();
  assert.equal(first.project.id, 'prj_configured'); assert.equal(first.totals.visitors, 20);
  assert.equal(second.project.id, 'prj_second'); assert.equal(second.totals.visitors, 5);
  assert.equal(second.period.days, 30);
  assert.equal(calls.filter(call => call.url.pathname.includes('/visits/')).length, 4);
  for (const { url } of calls.filter(call => call.url.pathname.includes('/visits/'))) {
    assert.equal(url.searchParams.get('projectId'), 'prj_second');
    assert.equal(url.searchParams.get('teamId'), 'team_configured');
  }
});
test('unknown and outside-team projects never trigger analytics requests', async () => {
  global.fetch = fixtureFetch;
  for (const id of ['prj_outside', 'prj_missing']) {
    const response = await route.GET(ownerRequest(`projectId=${id}`));
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, 'unknown_project');
  }
  assert(calls.every(call => call.url.pathname === '/v10/projects'));
});
test('project pages support numeric and continuation-token cursors without leaking fields', async () => {
  const cursors = [];
  const catalog = await service.listVercelProjects(async input => {
    const url = new URL(input); const from = url.searchParams.get('from'); cursors.push(from);
    assert.equal(url.searchParams.get('teamId'), 'team_configured');
    const index = cursors.length;
    return Response.json({ projects: [{ id: `prj_page${index}`, name: `project-${index}`, accountId: 'team_configured' }], pagination: { next: index === 1 ? 123 : index === 2 ? 'NEXTTOKEN' : null } });
  });
  assert.deepEqual(cursors, [null, '123', 'NEXTTOKEN']);
  assert.equal(catalog.projects.length, 3);
  assert.equal(catalog.defaultProjectId, 'prj_page1');
  await assert.rejects(() => service.listVercelProjects(async () => Response.json({ projects: [], pagination: { next: 'REPEATED' } })), error => error.code === 'invalid_response');
});
test('selection survives refresh, falls back after removal, and handles an empty team', async () => {
  const catalog = await service.listVercelProjects(fixtureFetch);
  assert.equal(model.selectAnalyticsProject(catalog, 'prj_second'), 'prj_second');
  assert.equal(model.selectAnalyticsProject(catalog, 'prj_removed'), 'prj_configured');
  assert.equal(model.selectAnalyticsProject({ ...catalog, defaultProjectId: 'prj_removed' }, null), 'prj_second');
  delete process.env.OLYMPUS_VERCEL_PROJECT_ID;
  const noDefault = await service.listVercelProjects(fixtureFetch);
  assert.equal(noDefault.defaultProjectId, 'prj_second');
  const empty = await service.listVercelProjects(async () => Response.json({ projects: [], pagination: { next: null } }));
  assert.deepEqual(empty.projects, []);
  assert.equal(model.selectAnalyticsProject(empty, 'prj_removed'), null);
});
test('period starts at UTC midnight and includes today without an extra day', () => {
  assert.equal(model.analyticsPeriod(7, now).since, '2026-09-05T00:00:00.000Z');
  assert.equal(model.analyticsPeriod(30, now).since, '2026-08-13T00:00:00.000Z');
});
test('upstream access errors do not become zero counts or leak raw errors', async () => {
  global.fetch = async () => Response.json({ error: 'SECRET-UPSTREAM-DETAIL' }, { status: 403 });
  const response = await route.GET(ownerRequest());
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.code, 'vercel_access');
  assert(!JSON.stringify(body).includes('SECRET-UPSTREAM-DETAIL'));
  assert.equal(body.totals, undefined);
});
test('missing connection credentials prevent upstream calls', async () => {
  delete process.env.OLYMPUS_VERCEL_TOKEN;
  await assert.rejects(() => service.readVercelAnalytics(7, () => { throw new Error('Unexpected call'); }), error => error.code === 'setup_required');
});
test('empty, unavailable, zero, and malformed analytics remain distinct', () => {
  assert.deepEqual(model.periodTotals([]), { pageviews: 0, visitors: 0 });
  assert.deepEqual(model.periodTotals(model.analyticsRows({ data: [{ environment: 'production', pageviews: 0, visitors: null }] }, 'environment')), { pageviews: 0, visitors: null });
  assert.throws(() => model.analyticsRows({ data: [{ environment: 'production', pageviews: -1 }] }, 'environment'));
  assert.throws(() => model.periodTotals([{ label: 'preview', visitors: 3, pageviews: 4 }]));
  assert.throws(() => model.analyticsRows({}, 'timestamp'));
});
test('chart keeps missing days unknown and renders readable daily values', async () => {
  const report = await service.readVercelAnalytics(7, fixtureFetch, now);
  const html = renderToStaticMarkup(React.createElement(TrafficChart, { report }));
  assert(html.includes('Not reported'));
  assert(html.includes('View daily values'));
  assert(html.includes('>50</td>'));
  assert(html.includes('>—</td>'));
  const list = renderToStaticMarkup(React.createElement(TrafficList, { title: 'Popular pages', rows: [{ label: '<script>alert(1)</script>', visitors: 0, pageviews: null }] }));
  assert(!list.includes('<script>')); assert(list.includes('&lt;script&gt;'));
});
