const code=e=>`${e.season}-${e.number}`;
const regular=e=>e.season>0&&e.number>0&&!['significant_special','insignificant_special'].includes(e.type);

// Checking an episode means "watched through here". Unchecking is always local
// to the selected episode/season and never erases earlier viewing history.
export function markWatchedThrough(watched,episodes,{season,number=null,checked=true,date}){
  const result=new Set(watched);
  if(!checked){
    if(number!==null)result.delete(`${season}-${number}`);
    else for(const e of episodes)if(e.season===season&&e.number!=null)result.delete(code(e));
    return [...result].sort();
  }
  for(const e of episodes){
    if(!e.airdate||e.airdate>date||e.number==null)continue;
    const selected=e.season===season&&(number===null||e.number<=number);
    const earlier=e.season<season;
    if(regular(e)&&(selected||earlier)||season===0&&e.season===0&&(number===null||e.number===number))result.add(code(e));
  }
  return [...result].sort();
}
