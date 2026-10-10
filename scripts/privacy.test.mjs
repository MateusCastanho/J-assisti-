import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('public deployment does not bundle a personal library or progress mapping',()=>{
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../docs/library.json',import.meta.url))).items,[]);
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../docs/series-progress.json',import.meta.url))).shows,{});
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../docs/covers.json',import.meta.url))).items,{});
  assert.equal(fs.existsSync(new URL('../.openai/hosting.json',import.meta.url)),false);
});
