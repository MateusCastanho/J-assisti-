import {cloudConfig} from './cloud-config.js';
import {LibrarySync} from './sync-core.js';

export async function setupCloud({getLocal,applyLocal,storage=localStorage}){
  const $=s=>document.querySelector(s);
  const button=$('#cloud-account'),dialog=$('#cloud-dialog'),message=$('#cloud-message');
  const configured=!!(cloudConfig.url&&cloudConfig.publishableKey);
  let client,engine,timer,poll,userId,starting=false;
  const say=text=>{message.textContent=text;};
  const status=(state,error)=>{
    const texts={syncing:'Sincronizando…',synced:'Sincronizado',error:'Sincronização pendente'};
    button.textContent=texts[state];
    $('#cloud-status').textContent=state==='error'?'Suas alterações continuam neste aparelho. '+(error?.message||'Tente novamente ao conectar.'):texts[state];
  };
  button.addEventListener('click',()=>dialog.showModal());
  $('#cloud-retry').addEventListener('click',()=>engine?.sync().catch(()=>{}));
  if(!configured){
    button.textContent='Neste aparelho';
    $('#cloud-login').hidden=true;
    say('A sincronização ainda está sendo configurada. Seu histórico continua salvo neste aparelho.');
    return;
  }
  try{
    // SDK is loaded only after project provisioning. Passwords go directly to Auth.
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    client=createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  }catch{say('Não foi possível abrir o login. Recarregue para tentar novamente.');return;}
  function stop(){engine?.stop();engine=null;userId=null;clearInterval(poll);poll=null;clearTimeout(timer);}
  async function start(session){
    if(!session){stop();button.textContent='Entrar e sincronizar';$('#cloud-login').hidden=false;$('#cloud-connected').hidden=true;return;}
    if(userId===session.user.id||starting)return;
    starting=true;
    try{
      // An authenticated account without the administrator's allowlist entry cannot sync.
      const {data,error}=await client.from('episodio_owner').select('user_id').eq('user_id',session.user.id).maybeSingle();
      if(error||!data)throw Error('Esta conta não tem acesso à biblioteca.');
      stop();userId=session.user.id;
      const adapter={
        async read(){const {data,error}=await client.from('episodio_library').select('version,payload').eq('user_id',userId).maybeSingle();if(error)throw error;return data;},
        async write(version,payload){const {data,error}=await client.rpc('episodio_save_library',{expected_version:version,new_payload:payload});if(error)throw error;return data?.[0];}
      };
      engine=new LibrarySync({adapter,storage,key:'episodio-cloud-base-v1:'+new URL(cloudConfig.url).host+':'+userId,getLocal,applyLocal,onStatus:status});
      $('#cloud-login').hidden=true;$('#cloud-connected').hidden=false;say('Conta pessoal conectada.');
      await engine.connect();
    }catch(error){status('error',error);say(error.message||'Não foi possível sincronizar.');}
    finally{starting=false;if(engine&&!poll)poll=setInterval(()=>{if(document.visibilityState==='visible')engine.sync().catch(()=>{});},15000);}
  }
  // Do not await Supabase APIs from an onAuthStateChange callback (SDK lock).
  client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>start(session),0);});
  const {data:{session},error}=await client.auth.getSession();
  if(error)say('Entre novamente para sincronizar.');
  await start(session);
  $('#cloud-login').addEventListener('submit',async e=>{
    e.preventDefault();const submit=e.target.querySelector('button');submit.disabled=true;say('Entrando…');
    try{const {data,error}=await client.auth.signInWithPassword({email:$('#cloud-email').value.trim(),password:$('#cloud-password').value});if(error)throw Error('Não foi possível entrar. Confira o e-mail e a senha.');$('#cloud-password').value='';await start(data.session);}
    catch(error){say(error.message);}finally{submit.disabled=false;}
  });
  $('#cloud-signout').addEventListener('click',async()=>{
    if(engine?.busy){say('Aguarde terminar a sincronização antes de sair.');return;}
    const {error}=await client.auth.signOut({scope:'local'});
    if(error){say('Não foi possível sair. Tente novamente.');return;}
    stop();button.textContent='Entrar e sincronizar';$('#cloud-login').hidden=false;$('#cloud-connected').hidden=true;say('Você saiu. A cópia deste aparelho foi mantida.');
  });
  window.addEventListener('episodio-saved',()=>{if(!engine)return;status('syncing');clearTimeout(timer);timer=setTimeout(()=>engine?.sync().catch(()=>{}),700);});
  window.addEventListener('online',()=>engine?.sync().catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')engine?.sync().catch(()=>{});});
}
