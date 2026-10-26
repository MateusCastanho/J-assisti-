import {validBackup} from './library.js';
export const emptyLibrary=()=>({schemaVersion:1,items:[],preferences:{},seriesCatalog:{}});
// Postgres jsonb reorders object keys. Equality must compare values, not text.
function equal(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
  const ak=Object.keys(a).filter(k=>a[k]!==undefined).sort(),bk=Object.keys(b).filter(k=>b[k]!==undefined).sort();
  return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(a[k],b[k]));
}
export {equal as sameSyncValue};
const copy=x=>structuredClone(x);
function mergeObject(base={},local={},remote={}){
  const out={};
  for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
    const value=equal(base[key],local[key])?remote[key]:local[key];
    if(value!==undefined)out[key]=copy(value);
  }
  return out;
}
function mergeWatched(base=[],local=[],remote=[]){
  const b=new Set(base),l=new Set(local),r=new Set(remote);
  return [...new Set([...b,...l,...r])].filter(code=>b.has(code)===l.has(code)?r.has(code):l.has(code)).sort();
}
// Three-way reconciliation keeps explicit removals/unchecks, unlike a simple union.
export function mergeLibraries(base,local,remote){
  for(const x of [base,local,remote])if(!validBackup(x))throw Error('Biblioteca inválida para sincronizar.');
  const b=new Map(base.items.map(i=>[i.id,i])),l=new Map(local.items.map(i=>[i.id,i])),r=new Map(remote.items.map(i=>[i.id,i]));
  const items=[];
  for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){
    const bi=b.get(id),li=l.get(id),ri=r.get(id);
    if(!li){if(!bi&&ri)items.push(copy(ri));continue;}
    if(!ri){if(!bi||!equal(bi,li))items.push(copy(li));continue;}
    const item=mergeObject(bi,li,ri);
    item.watched=mergeWatched(bi?.watched,li.watched,ri.watched);
    items.push(item);
  }
  const result={schemaVersion:1,items,preferences:mergeObject(base.preferences,local.preferences,remote.preferences),seriesCatalog:mergeObject(base.seriesCatalog,local.seriesCatalog,remote.seriesCatalog)};
  if(!validBackup(result))throw Error('A sincronização retornou dados inválidos.');
  return result;
}

// Adapter.read() -> {version,payload} | null; write(version,payload) -> same shape.
// Device edits made while a request is running are rebased after acknowledgement.
export class LibrarySync{
  constructor({adapter,storage,key,getLocal,applyLocal,onStatus=()=>{}}){Object.assign(this,{adapter,storage,key,getLocal,applyLocal,onStatus});this.busy=false;this.base=null;this.version=0;this.active=false;}
  async connect(){
    const saved=this.storage.getItem(this.key);
    if(saved){const checkpoint=JSON.parse(saved);if(!validBackup(checkpoint.payload)||!Number.isSafeInteger(checkpoint.version)||checkpoint.version<0)throw Error('A cópia de sincronização precisa de recuperação. Exporte o backup antes de continuar.');this.base=checkpoint.payload;this.version=checkpoint.version;}
    else this.base=emptyLibrary();
    this.active=true;return this.sync();
  }
  checkpoint(payload,version){
    // Must persist the acknowledged base before changing the displayed local state.
    this.storage.setItem(this.key,JSON.stringify({payload,version}));
    this.base=copy(payload);this.version=version;
  }
  async sync(){
    if(!this.active||this.busy)return;
    this.busy=true;this.onStatus('syncing');
    try{
      for(let attempt=0;attempt<5;attempt++){
        if(!this.active)return;
        const cloud=await this.adapter.read();
        if(!this.active)return;
        const remote=cloud?.payload||emptyLibrary(),version=cloud?.version||0;
        if(!validBackup(remote)||!Number.isSafeInteger(version)||version<0)throw Error('Histórico da nuvem inválido. A cópia local foi preservada.');
        const local=copy(this.getLocal());
        const merged=mergeLibraries(this.base,local,remote);
        if(equal(merged,remote)){
          this.checkpoint(remote,version);this.applyLocal(merged);this.onStatus('synced');return;
        }
        let ack;
        try{ack=await this.adapter.write(version,merged);}catch(error){if(error.code==='40001')continue;throw error;}
        if(!this.active)return;
        if(!ack||!validBackup(ack.payload)||!Number.isSafeInteger(ack.version))throw Error('O servidor não confirmou a gravação.');
        const latest=mergeLibraries(local,this.getLocal(),ack.payload);
        this.checkpoint(ack.payload,ack.version);this.applyLocal(latest);
        if(equal(latest,ack.payload)){this.onStatus('synced');return;}
      }
      throw Error('Há alterações simultâneas. Tente sincronizar novamente.');
    }catch(error){if(this.active)this.onStatus('error',error);throw error;}
    finally{this.busy=false;}
  }
  stop(){this.active=false;}
}
