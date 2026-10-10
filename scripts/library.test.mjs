import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sameTitle,validBackup,readSaved,defaultPreferences,calendarIndex,seriesProgress,reconcileSeries} from '../docs/library.js';
import {score} from '../docs/search.js';
const item={id:'a',title:'Friends',kind:'series',status:'watching',watched:['1-1']};
test('saved library works without seed and preserves an intentionally empty library',()=>{
  const data={schemaVersion:1,items:[]};
  assert.deepEqual(readSaved({getItem:()=>JSON.stringify(data)},'key'),data);
  assert.equal(readSaved({getItem:()=>null},'key'),null);
  assert.throws(()=>readSaved({getItem:()=>'{broken'},'key'));
  assert.throws(()=>readSaved({getItem:()=>JSON.stringify({items:[]})},'key'));
});
test('backups accept the original history but reject invalid titles, ratings and duplicates',()=>{
  const seed=JSON.parse(fs.readFileSync(new URL('../docs/library.json',import.meta.url)));
  assert.ok(validBackup({schemaVersion:1,items:seed.items}));
  for(const items of [[{...item,title:'  '}],[{...item,externalRating:11}],[item,item]])assert.equal(validBackup({schemaVersion:1,items}),false);
  assert.deepEqual(defaultPreferences({hideAnime:false,hideDorama:'false'}),{hideAnime:false,hideDorama:true});
});
test('identity handles aliases and keeps distinct remakes apart',()=>{
  assert.ok(sameTitle({...item,title:'Dark',aliases:['Escuro']},{...item,id:'b',title:'Escuro'}));
  assert.equal(sameTitle({...item,year:'1994'},{...item,id:'b',year:'2026'}),false);
  assert.equal(sameTitle({...item,tvmaze:1},{...item,id:'b',tvmaze:2}),false);
});
test('calendar selects nearest future episode regardless of source ordering',()=>{
  const rows=[{showId:1,airdate:'2026-11-01',number:3},{showId:1,airdate:'2026-10-10',number:2},{showId:1,airdate:'2026-10-01',number:1}];
  assert.equal(calendarIndex(rows,'2026-10-09').get(1).number,2);
  assert.equal(calendarIndex(rows,'2026-11-02').size,0);
});
test('non-Latin searches do not match every title',()=>{
  assert.equal(score('東京',['Friends']),0);
  assert.equal(score('東京',['東京']),100);
});

test('completed ended shows move out of watching without changing episode history',()=>{
  const show={ended:true,episodes:[{code:'1-1',date:'2026-01-01'}]};
  const copy=structuredClone(item);
  assert.equal(reconcileSeries(copy,show,'2026-10-09'),true);
  assert.equal(copy.status,'done');assert.deepEqual(copy.watched,item.watched);
  for(const status of ['want','dropped','done']){const other={...item,status};assert.equal(reconcileSeries(other,show,'2026-10-09'),false);assert.equal(other.status,status);}
  assert.equal(reconcileSeries({...item,statusManual:true},show,'2026-10-09'),false);
});
test('caught-up is different from unfinished, future or unknown-date episodes',()=>{
  const one={ended:false,episodes:[{code:'1-1',date:'2026-01-01'}]};
  assert.equal(seriesProgress(item,one,'2026-10-09').caughtUp,true);
  assert.equal(seriesProgress(item,one,'2026-10-09').complete,false);
  const future={ended:true,episodes:[...one.episodes,{code:'1-2',date:'2026-11-01'}]};
  assert.equal(seriesProgress(item,future,'2026-10-09').complete,false);
  assert.equal(seriesProgress(item,future,'2026-11-02').caughtUp,false);
  assert.equal(seriesProgress(item,{ended:true,episodes:[...one.episodes,{code:'1-2',date:null}]},'2026-10-09').complete,false);
  // Same totals with different episode codes must not create a false completion.
  assert.equal(seriesProgress({...item,watched:['1-2']},{...one,ended:true},'2026-10-09').complete,false);
});
