// Test helper: a sample analysis summary.
import type { Summary } from '../../api/types';

export const sampleSummary = {
  root_path: 'C:/code/app',
  files: 12,
  total_loc: 1450,
  languages: [{ id: 'python', files: 12, loc: 1450 }],
  counts: { class: 4, function: 20, method: 9 },
  externals: ['flask', 'requests'],
  largest_modules: [],
  largest_packages: [],
  syntax_error_files: ['app/broken.py'],
  parse_errors: [],
} as unknown as Summary;
