import test from 'node:test';
import assert from 'node:assert/strict';
import {activityChange,compareActivity} from '../docs/activity.js';
import {mergeLibraries,emptyLibrary} from '../docs/sync-core.js';

test('episode edits move the series above older activity; refreshes do not',()=>{
 const a={id:'a',kind:'series',title:'A',status:'watching',watched:['1-1']};
 const b={...a,id:'b',title:'B'};
 Object.assign(b,activityChange(b,{watched:['1-1','1-2']},1000));
 assert.deepEqual([a,b].sort(compareActivity).map(i=>i.id),['b','a']);
 assert.equal(activityChange(b,{poster:'cover'}).lastActivityAt,undefined);
 assert.equal(activityChange(b,{watched:['1-2','1-1']}).lastActivityAt,undefined);
 Object.assign(a,activityChange(a,{watched:['1-1','1-2']},2000));
 assert.deepEqual([b,a].sort(compareActivity).map(i=>i.id),['a','b']);
 assert.equal(activityChange(a,{watched:['1-1'],lastActivityAt:''}).lastActivityAt,'');
 const base=emptyLibrary(),local={...base,items:[a,b]};
 assert.equal(mergeLibraries(base,local,base).items[0].lastActivityAt,a.lastActivityAt);
});
