// Only regular, released episodes can be marked from the next-up queue.
export function nextUnwatched(item,catalog,date){
  if(item.kind!=='series'||!catalog?.episodes?.length)return null;
  const watched=new Set(item.watched||[]);
  return catalog.episodes.filter(e=>/^\d+-\d+$/.test(e.code)&&e.date&&e.date<=date&&!watched.has(e.code))
    .sort((a,b)=>{const [as,an]=a.code.split('-').map(Number),[bs,bn]=b.code.split('-').map(Number);return as-bs||an-bn})[0]||null;
}
