import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeLibraries,LibrarySync,emptyLibrary} from '../docs/sync-core.js';
const item=(id,watched=[],extra={})=>({id,title:id,kind:'series',status:'watching',watched,...extra});
const library=items=>({...emptyLibrary(),items});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
test('two devices merge episodes, independent fields, explicit unchecks and removals',()=>{
 const base=library([item('a',['1-1','1-2']),item('b')]);
 const local=library([item('a',['1-1'],{favorite:true})]);
 const remote=library([item('a',['1-1','1-2','1-3'],{externalRating:9}),item('b'),item('c')]);
 const merged=mergeLibraries(base,local,remote);
 assert.deepEqual(merged.items.map(i=>i.id),['a','c']);
 assert.deepEqual(merged.items[0].watched,['1-1','1-3']);
 assert.equal(merged.items[0].favorite,true);assert.equal(merged.items[0].externalRating,9);
});
test('first login combines local history with cloud and empty device downloads it',()=>{
 const cloud=library([item('a',['1-1'])]),local=library([item('b',['1-2'])]);
 assert.equal(mergeLibraries(emptyLibrary(),local,cloud).items.length,2);
 assert.deepEqual(mergeLibraries(emptyLibrary(),emptyLibrary(),cloud),cloud);
 assert.deepEqual(mergeLibraries(cloud,cloud,emptyLibrary()),emptyLibrary());
});
test('CAS retry keeps updates made on another device while offline',async()=>{
 let local=library([item('a',['1-1'])]);let cloud={version:1,payload:library([item('a',['1-2'])])};let writes=0;
 const adapter={read:async()=>structuredClone(cloud),write:async(version,payload)=>{writes++;if(writes===1){cloud={version:2,payload:library([item('a',['1-2','1-3'])])};throw {code:'40001'};}assert.equal(version,2);return cloud={version:3,payload};}};
 const sync=new LibrarySync({adapter,storage:memory(),key:'a',getLocal:()=>local,applyLocal:v=>{local=v;}});
 await sync.connect();assert.equal(writes,2);assert.deepEqual(local.items[0].watched,['1-1','1-2','1-3']);
});
test('edit made during upload is not replaced by older acknowledgement',async()=>{
 let local=library([item('a',['1-1'])]);let cloud=null,writes=0;
 const adapter={read:async()=>cloud,write:async(version,payload)=>{if(++writes===1)local=library([item('a',['1-1','1-2'])]);return cloud={version:version+1,payload};}};
 const sync=new LibrarySync({adapter,storage:memory(),key:'a',getLocal:()=>local,applyLocal:v=>local=v});
 await sync.connect();assert.equal(writes,2);assert.deepEqual(cloud.payload.items[0].watched,['1-1','1-2']);
});
test('offline failure and corrupt cloud preserve the local list',async()=>{
 let local=library([item('a',['1-1'])]);const before=structuredClone(local);
 const adapter={read:async()=>{throw Error('offline')},write:async()=>assert.fail('must not write')};
 const sync=new LibrarySync({adapter,storage:memory(),key:'a',getLocal:()=>local,applyLocal:v=>local=v});
 await assert.rejects(sync.connect(),/offline/);assert.deepEqual(local,before);
 adapter.read=async()=>({version:1,payload:{items:'invalid'}});
 await assert.rejects(sync.sync(),/inválido/);assert.deepEqual(local,before);
});
test('signout prevents pending response from replacing local history',async()=>{
 let local=library([item('a')]),resolve;const wait=new Promise(r=>resolve=r);
 const sync=new LibrarySync({adapter:{read:()=>wait,write:async()=>assert.fail()},storage:memory(),key:'a',getLocal:()=>local,applyLocal:()=>assert.fail()});
 const pending=sync.connect();sync.stop();resolve({version:1,payload:emptyLibrary()});await pending;assert.equal(local.items.length,1);
});
test('Postgres JSONB key ordering does not cause repeated writes or false conflicts',async()=>{
 const reorder=x=>Array.isArray(x)?x.map(reorder):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,reorder(x[k])])):x;
 let local=library([item('a',['1-1'])]),cloud=null,writes=0,status;
 const adapter={read:async()=>cloud,write:async(version,payload)=>{writes++;return cloud={version:version+1,payload:reorder(payload)};}};
 const sync=new LibrarySync({adapter,storage:memory(),key:'a',getLocal:()=>local,applyLocal:v=>local=v,onStatus:s=>status=s});
 await sync.connect();assert.equal(writes,1);assert.equal(status,'synced');
 await sync.sync();assert.equal(writes,1);assert.equal(status,'synced');
});
