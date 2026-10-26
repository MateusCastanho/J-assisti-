import {normalize} from './search.js';
const genreName=g=>({'sci-fi & fantasy':'science-fiction','sci-fi':'science-fiction','science-fiction':'science-fiction','action & adventure':'action','kids & family':'family','romantic comedy':'romance','comedy':'comedy','thriller':'thriller','drama':'drama','crime':'crime'}[normalize(g)]||normalize(g));
const genres=i=>[...new Set((i.genres||[]).map(genreName).filter(Boolean))];
const names=i=>[i.title,...i.aliases||[]].map(normalize).filter(Boolean);
export function sameRecommendationTitle(a,b){
 if(a.kind!==b.kind)return false;
 if(a.id===b.id||a.tvmaze&&a.tvmaze===b.tvmaze||a.tvdb&&String(a.tvdb)===String(b.tvdb))return true;
 const aYear=Number(a.year||a.release?.slice(0,4)),bYear=Number(b.year||b.release?.slice(0,4));
 if(aYear&&bYear&&Math.abs(aYear-bYear)>(a.kind==='movie'?1:0))return false;
 const n=new Set(names(a));return names(b).some(x=>n.has(x));
}
export function recommend(library,catalog,preferences,{limit=36,kind='all',date='9999-12-31'}={}){
 if(!library.length)return [];
 const allowed=i=>!(preferences.hideAnime&&i.isAnime||preferences.hideDorama&&i.isDorama);
 const profile=[];
 for(const entry of library){
  const meta=catalog.find(c=>sameRecommendationTitle(c,entry));
  const full={...meta,...entry,genres:entry.genres?.length?entry.genres:meta?.genres};
  if(!allowed(full)||!genres(full).length)continue;
  const weight=entry.status==='dropped'?-0.8:entry.favorite?4:entry.status==='done'?2.5:entry.watched?.length?2:entry.status==='want'?0.5:0;
  if(weight)profile.push({entry,genres:genres(full),weight});
 }
 const weights=new Map();
 for(const p of profile)for(const g of p.genres){const key=p.entry.kind+':'+g;weights.set(key,(weights.get(key)||0)+p.weight/p.genres.length);}
 const known=new Set(),ranked=[];
 for(const candidate of catalog){
  if(known.has(candidate.id)||!candidate.poster||!allowed(candidate)||candidate.release&&candidate.release>date||kind!=='all'&&candidate.kind!==kind)continue;
  known.add(candidate.id);
  if(library.some(i=>sameRecommendationTitle(i,candidate)))continue;
  const gs=genres(candidate);
  const anchors=profile.filter(p=>p.entry.kind===candidate.kind&&p.weight>0).map(p=>({...p,overlap:p.genres.filter(g=>gs.includes(g))})).filter(p=>p.overlap.length).sort((a,b)=>(b.overlap.length/Math.max(b.genres.length,gs.length)*b.weight)-(a.overlap.length/Math.max(a.genres.length,gs.length)*a.weight));
  if(!anchors.length)continue;
  const affinity=gs.reduce((sum,g)=>sum+Math.max(0,weights.get(candidate.kind+':'+g)||0),0)/Math.sqrt(gs.length);
  const anchor=anchors[0].entry;
  ranked.push({...candidate,recommendationScore:affinity+(candidate.kind==='series'?(candidate.rating||0)/10:0),reason:(anchor.status==='want'?'Na linha de '+anchor.title:anchor.favorite?'Porque você favoritou '+anchor.title:'Porque você assistiu '+anchor.title),reasonId:anchor.id,matchedGenres:anchors[0].overlap});
 }
 ranked.sort((a,b)=>b.recommendationScore-a.recommendationScore||a.title.localeCompare(b.title));
 // Round-robin formats and limit repetition of the same explanation.
 const result=[],byKind={series:ranked.filter(i=>i.kind==='series'),movie:ranked.filter(i=>i.kind==='movie')},used=new Map();
 while(result.length<limit&&(byKind.series.length||byKind.movie.length)){
  for(const type of ['series','movie']){
   if(result.length>=limit)break;
   const list=byKind[type];if(!list.length)continue;
   let ix=list.findIndex(i=>(used.get(i.reasonId)||0)<4);if(ix<0)ix=0;
   const [i]=list.splice(ix,1);result.push(i);used.set(i.reasonId,(used.get(i.reasonId)||0)+1);
  }
 }
 return result;
}
