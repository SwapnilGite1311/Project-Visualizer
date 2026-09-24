// Validates all JSON Schemas and examples under contracts/. Usage: pnpm validate
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', 'tools', 'prompts']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.json') && name !== 'package.json') out.push(p);
  }
  return out;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const files = walk(root);
const schemaFiles = files.filter((f) => f.endsWith('.schema.json'));
const exampleFiles = files.filter((f) => basename(dirname(f)) === 'examples');
let failed = 0;

for (const f of schemaFiles) {
  const schema = JSON.parse(readFileSync(f, 'utf8'));
  const expectedId = 'https://pv.local/schemas/' + relative(root, f).split('\\').join('/');
  if (schema.$id !== expectedId) {
    console.error(`BAD $id in ${f}: expected ${expectedId}`);
    failed++;
  }
  ajv.addSchema(schema);
}
for (const f of schemaFiles) {
  const id = JSON.parse(readFileSync(f, 'utf8')).$id;
  try {
    ajv.getSchema(id);
  } catch (e) {
    console.error(`SCHEMA ERROR ${f}: ${e.message}`);
    failed++;
  }
}
for (const f of exampleFiles) {
  const base = basename(f).replace(/\.\d+\.json$/, '');
  const schemaPath = join(dirname(dirname(f)), base + '.schema.json');
  const id = 'https://pv.local/schemas/' + relative(root, schemaPath).split('\\').join('/');
  const validate = ajv.getSchema(id);
  if (!validate) {
    console.error(`NO SCHEMA for example ${f} (looked for ${schemaPath})`);
    failed++;
    continue;
  }
  if (!validate(JSON.parse(readFileSync(f, 'utf8')))) {
    console.error(`INVALID ${f}: ${ajv.errorsText(validate.errors)}`);
    failed++;
  }
}
console.log(`schemas=${schemaFiles.length} examples=${exampleFiles.length} failed=${failed}`);
process.exit(failed ? 1 : 0);
