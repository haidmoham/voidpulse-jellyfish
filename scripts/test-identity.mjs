import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const index = read('index.html');
const signature = read('public/shin86-signature.js');
const credits = read('public/music-credits.html');
for (const text of [index, signature, credits]) {
  assert.doesNotMatch(text, /https:\/\/(?:shin86\.dev|discord\.gg)\//);
  assert.doesNotMatch(text, /web design by shin86/);
}
assert.match(index, /https:\/\/github\.com\/zarnab222-dev/);
assert.match(index, /https:\/\/mhaider\.dev\//);
assert.match(signature, /web design by Zarnab Haider/);
assert.match(signature, /https:\/\/github\.com\/zarnab222-dev/);
assert.match(signature, /width:100\.8px;height:70\.4px/);
assert.match(signature, /motion-source/);
const config = JSON.parse(read('wrangler.jsonc'));
assert.equal(config.workers_dev, false);
assert.deepEqual(config.routes, [{ pattern: 'jellyfish.mhaider.dev', custom_domain: true }]);
console.log('Professional identity and hosting restriction checks passed.');
