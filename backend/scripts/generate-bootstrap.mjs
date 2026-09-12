import { writeFileSync } from 'node:fs';
import { MOCK_BOOTSTRAP_RESPONSE } from '../../prototype/src/data-source/mock/seed.js';

const response = structuredClone(MOCK_BOOTSTRAP_RESPONSE);
response.source = 'api';
response.fixtureVersion = 'backend-2026.09';
response.requestId = null;

writeFileSync(
  new URL('../src/data/bootstrap-response.json', import.meta.url),
  JSON.stringify(response, null, 2),
  'utf8',
);
console.log('bootstrap-response.json generated');
