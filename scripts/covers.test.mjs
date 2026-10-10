import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCover,mergeCovers} from '../docs/covers.js';
const result=(year)=>({kind:'feature-movie',trackName:'101 Dalmatians',releaseDate:year+'-01-01',artworkUrl100:'https://example.com/'+year+'/100x100bb.jpg'});
test('poster selection distinguishes remakes and accepts regional release years',()=>{
  assert.match(chooseCover({title:'101 Dalmatians',release:'1997-03-26'},[result('1961'),result('1996')]).poster,/1996/);
  assert.equal(chooseCover({title:'101 Dalmatians'},[result('1961'),result('1996')]),null);
  assert.equal(chooseCover({title:'Another movie',year:'1996'},[result('1996')]),null);
});
test('cover migration preserves history and existing custom images',()=>{
  const items=[{id:'a',watched:['1-1'],status:'done'},{id:'b',poster:'https://custom.test/image'}];
  assert.equal(mergeCovers(items,{a:{poster:'https://example.com/a'},b:{poster:'https://example.com/b'}}),1);
  assert.deepEqual(items[0].watched,['1-1']);assert.equal(items[0].status,'done');assert.equal(items[1].poster,'https://custom.test/image');
});
