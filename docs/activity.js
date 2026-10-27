// Only a real episode change moves a series; metadata refreshes keep its place.
export function activityChange(item,change,now=Date.now()){
  if(item.kind!=='series'||!Array.isArray(change.watched)||Object.hasOwn(change,'lastActivityAt'))return change;
  const before=new Set(item.watched||[]),after=new Set(change.watched);
  if(before.size===after.size&&[...before].every(code=>after.has(code)))return change;
  const previous=Date.parse(item.lastActivityAt)||0;
  return {...change,lastActivityAt:new Date(Math.max(now,previous+1)).toISOString()};
}
export function compareActivity(a,b){
  return (Date.parse(b.lastActivityAt)||0)-(Date.parse(a.lastActivityAt)||0)||a.title.localeCompare(b.title,'pt-BR');
}
