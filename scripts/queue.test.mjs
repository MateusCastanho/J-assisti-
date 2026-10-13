import test from 'node:test';
import assert from 'node:assert/strict';
import {nextUnwatched} from '../docs/queue.js';
test('next up respects gaps, episode order and release dates',()=>{
 const item={kind:'series',watched:['1-1','1-3']};
 const catalog={episodes:[{code:'2-1',date:'2025-01-01'},{code:'1-3',date:'2025-01-01'},{code:'1-2',date:'2025-01-01'},{code:'1-1',date:'2025-01-01'},{code:'1-4',date:'2027-01-01'}]};
 assert.equal(nextUnwatched(item,catalog,'2026-10-13').code,'1-2');
 item.watched.push('1-2','2-1');assert.equal(nextUnwatched(item,catalog,'2026-10-13'),null);
 assert.equal(nextUnwatched(item,{},'2026-10-13'),null);
 assert.equal(nextUnwatched({...item,kind:'movie'},catalog,'2026-10-13'),null);
});
