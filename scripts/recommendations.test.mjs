import test from 'node:test';import assert from 'node:assert/strict';
import {recommend,sameRecommendationTitle} from '../docs/recommendations.js';
const c=(id,kind='series',extra={})=>({id,title:id,kind,genres:['Crime','Thriller'],poster:'https://example.org/a.jpg',year:'2020',...extra});
test('recommendations exclude watched, wanted and dropped titles including aliases and catalogue IDs',()=>{
 const catalog=[c('known'),c('want'),c('drop'),c('new'),c('anime','series',{isAnime:true}),c('dorama','series',{isDorama:true}),c('future','series',{release:'2027-01-01'})];
 const library=[{...c('known'),status:'done',watched:['1-1']},{...c('want'),status:'want',watched:[]},{...c('drop'),status:'dropped',watched:[]}];
 assert.deepEqual(recommend(library,catalog,{hideAnime:true,hideDorama:true},{date:'2026-10-26'}).map(i=>i.id),['new']);
 assert.equal(recommend([],catalog,{}).length,0);
});
test('movie matching tolerates regional year changes but preserves remakes',()=>{
 assert.equal(sameRecommendationTitle(c('a','movie',{title:'101 Dalmatians',year:'1996'}),c('b','movie',{title:'101 Dalmatians',year:'1997'})),true);
 assert.equal(sameRecommendationTitle(c('a','movie',{title:'101 Dalmatians',year:'1961'}),c('b','movie',{title:'101 Dalmatians',year:'1997'})),false);
 assert.equal(sameRecommendationTitle(c('a','series',{title:'Dark',tvmaze:100}),c('b','series',{title:'Escuridão',tvmaze:100})),true);
});
test('reasons come from personal history and format filters are respected',()=>{
 const catalog=[c('crime'),c('new'),c('love','series',{genres:['Romance']}),c('movie','movie'),c('othermovie','movie')];
 const library=[{...c('crime'),status:'done',watched:['1-1']},{...c('movie','movie'),status:'done',watched:[]}];
 const result=recommend(library,catalog,{},{});
 assert.ok(result.every(i=>i.reason.includes(i.kind==='movie'?'movie':'crime')));
 assert.deepEqual(recommend(library,catalog,{}, {kind:'movie'}).map(i=>i.id),['othermovie']);
 assert.ok(!result.some(i=>i.id==='love'));
});
