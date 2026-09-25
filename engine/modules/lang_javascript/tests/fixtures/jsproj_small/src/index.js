import { formatName } from './utils/format.js';
import helpers from './utils';
import * as api from './api/client';
const lodash = require('lodash');

export function main() {
  const name = formatName('bob');
  helpers.log(name);
  return api.fetchUser(1);
}

main();
