import test from 'node:test';import assert from 'node:assert/strict';
import {markWatchedThrough} from '../docs/watch-progress.js';
const episodes=[1,2,3,4,5,6,7,8,9,10,11].flatMap(season=>[1,2,3].map(number=>({season,number,airdate:season===11?'2027-01-01':'2020-01-01'})));
test('marking season ten backfills all previous seasons and preserves later marks',()=>{
 const marked=markWatchedThrough(['4-1','11-2'],episodes,{season:10,date:'2026-10-26'});
 for(let s=1;s<=10;s++)for(let n=1;n<=3;n++)assert.ok(marked.includes(`${s}-${n}`));
 assert.ok(marked.includes('11-2'));assert.ok(!marked.includes('11-1'));assert.equal(marked.length,31);
});
test('checking a later episode backfills earlier episodes without marking later ones or specials',()=>{
 const eps=[...episodes,{season:0,number:1,airdate:'2020-01-01'},{season:9,number:4,type:'significant_special',airdate:'2020-01-01'},{season:10,number:4,airdate:null},{season:10,number:5,airdate:'2027-01-01'}];
 const marked=markWatchedThrough([],eps,{season:10,number:2,date:'2026-10-26'});
 assert.equal(marked.length,29);assert.ok(marked.includes('1-1'));assert.ok(marked.includes('10-2'));
 for(const code of ['0-1','9-4','10-3','10-4','10-5'])assert.ok(!marked.includes(code));
});
test('unchecking affects only the selected episode or season',()=>{
 const all=markWatchedThrough([],episodes,{season:10,date:'2026-10-26'});
 const one=markWatchedThrough(all,episodes,{season:10,number:2,checked:false,date:'2026-10-26'});
 assert.ok(one.includes('9-3'));assert.ok(one.includes('10-1'));assert.ok(!one.includes('10-2'));
 const season=markWatchedThrough(all,episodes,{season:10,checked:false,date:'2026-10-26'});
 assert.equal(season.length,27);assert.ok(season.includes('9-3'));assert.ok(!season.includes('10-1'));
});
