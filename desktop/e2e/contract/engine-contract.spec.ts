import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { startEngine, type TestEngine } from '../helpers/engine';
import { contractsDir, fixtureSmall } from '../helpers/paths';

function schemaFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'tools', 'prompts'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) schemaFiles(p, out);
    else if (name.endsWith('.schema.json')) out.push(p);
  }
  return out;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const f of schemaFiles(contractsDir)) ajv.addSchema(JSON.parse(readFileSync(f, 'utf8')));

function expectValid(method: string, result: unknown) {
  const [ns, name] = method.split('.');
  const id = `https://pv.local/schemas/rpc/${ns}/${name}.result.schema.json`;
  const validate = ajv.getSchema(id);
  expect(validate, `no schema ${id}`).toBeTruthy();
  const ok = validate!(result);
  expect(ok, `${method}: ${ajv.errorsText(validate!.errors)}`).toBe(true);
}

test.describe.configure({ mode: 'serial' });

let engine: TestEngine;
let pid = '';

test.beforeAll(async () => {
  engine = startEngine();
  pid = (await engine.request<{ project_id: string }>('project.open', { root_path: fixtureSmall })).project_id;
  const end = Date.now() + 30000;
  for (;;) {
    const s = await engine.request<{ state: string; error_message: string }>('project.status', { project_id: pid });
    if (s.state === 'ready') break;
    if (s.state === 'error') throw new Error(s.error_message);
    if (Date.now() > end) throw new Error('project did not become ready');
    await new Promise((r) => setTimeout(r, 100));
  }
});

test.afterAll(async () => {
  await engine?.close();
});

const USER_SERVICE = 'class:app/services.py#UserService';
const IS_VALID = 'function:app/utils.py#is_valid';
const NORMALIZE = 'function:app/utils.py#normalize';

const calls: Array<[string, () => Record<string, unknown>]> = [
  ['engine.ping', () => ({})],
  ['lang.list', () => ({})],
  ['project.status', () => ({ project_id: pid })],
  ['graph.node', () => ({ project_id: pid, node_id: USER_SERVICE })],
  ['graph.children', () => ({ project_id: pid, node_id: 'package:app' })],
  ['graph.level_view', () => ({ project_id: pid })],
  ['graph.edges', () => ({ project_id: pid, node_id: IS_VALID, direction: 'both' })],
  ['graph.source', () => ({ project_id: pid, node_id: NORMALIZE })],
  ['graph.ancestors', () => ({ project_id: pid, node_id: IS_VALID })],
  ['impact.analyze', () => ({ project_id: pid, node_id: IS_VALID })],
  ['context.for_node', () => ({ project_id: pid, node_id: USER_SERVICE })],
  ['search.query', () => ({ project_id: pid, text: 'user' })],
  ['search.suggest', () => ({ project_id: pid, prefix: 'get' })],
  ['analysis.summary', () => ({ project_id: pid })],
  ['analysis.hotspots', () => ({ project_id: pid })],
  ['analysis.entry_points', () => ({ project_id: pid })],
  ['analysis.boundaries', () => ({ project_id: pid })],
  ['analysis.call_tree', () => ({ project_id: pid, node_id: USER_SERVICE })],
];

for (const [method, params] of calls) {
  test(`${method} matches its result schema`, async () => {
    expectValid(method, await engine.request(method, params()));
  });
}
