// The Python recorder (recorders/python/pv_trace) is bundled into the app as text and written to disk when needed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import initPy from '../../../../recorders/python/pv_trace/__init__.py?raw';
import mainPy from '../../../../recorders/python/pv_trace/__main__.py?raw';
import cliPy from '../../../../recorders/python/pv_trace/cli.py?raw';
import filtersPy from '../../../../recorders/python/pv_trace/filters.py?raw';
import recorderPy from '../../../../recorders/python/pv_trace/recorder.py?raw';
import reprsPy from '../../../../recorders/python/pv_trace/reprs.py?raw';
import writerPy from '../../../../recorders/python/pv_trace/writer.py?raw';

export const RECORDER_FILES: Record<string, string> = {
  '__init__.py': initPy,
  '__main__.py': mainPy,
  'cli.py': cliPy,
  'filters.py': filtersPy,
  'recorder.py': recorderPy,
  'reprs.py': reprsPy,
  'writer.py': writerPy,
};

export const RECORDER_VERSION = (() => {
  const hash = createHash('sha256');
  for (const name of Object.keys(RECORDER_FILES).sort()) hash.update(name).update('\0').update(RECORDER_FILES[name]);
  return hash.digest('hex').slice(0, 12);
})();

// Returns the folder to put on PYTHONPATH.
export function installRecorder(baseDir: string): string {
  const dir = join(baseDir, 'recorder');
  const marker = join(dir, 'VERSION');
  if (existsSync(marker) && readFileSync(marker, 'utf8') === RECORDER_VERSION) return dir;
  mkdirSync(join(dir, 'pv_trace'), { recursive: true });
  for (const [name, content] of Object.entries(RECORDER_FILES)) writeFileSync(join(dir, 'pv_trace', name), content, 'utf8');
  writeFileSync(marker, RECORDER_VERSION, 'utf8');
  return dir;
}
