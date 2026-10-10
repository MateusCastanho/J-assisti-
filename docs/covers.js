import {normalize} from './search.js';
const clean = title => normalize(String(title).replace(/\((?:unrated|extended|directors? cut|[0-9]{4})[^)]*\)/gi,''));

export function chooseCover(item, results) {
  const names=new Set([item.title,...item.aliases||[]].map(clean).filter(Boolean));
  const year=Number(item.year||item.release?.slice(0,4));
  const matches=results.filter(r=>r.kind==='feature-movie'&&r.artworkUrl100&&names.has(clean(r.trackName)))
    .map(r=>({r,gap:year?Math.abs(Number(r.releaseDate?.slice(0,4))-year):0}))
    .filter(x=>!year||x.gap<=2).sort((a,b)=>a.gap-b.gap);
  if(!matches.length)return null;
  // Ambiguous remakes without a year need a human choice.
  if(!year&&new Set(matches.map(x=>x.r.releaseDate?.slice(0,4))).size>1)return null;
  const result=matches[0].r;
  return {poster:result.artworkUrl100.replace('100x100bb','400x600bb'),posterSource:'Apple',posterSourceUrl:result.trackViewUrl};
}

export function mergeCovers(items, covers) {
  let changed=0;
  for(const item of items){const cover=covers[item.id];if(!item.poster&&cover?.poster?.startsWith('https://')){Object.assign(item,cover);changed++;}}
  return changed;
}
