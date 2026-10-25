// Cloudflare Workers Free: Firebase Spark-compatible Web Push sender.
// Required secrets: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY.
// Public vars: FIREBASE_PROJECT_ID, VAPID_SUBJECT, APP_ORIGIN.
// No service-account credential or VAPID private key is ever sent to the browser.
const encoder=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const json64=value=>b64url(encoder.encode(JSON.stringify(value)));
const concat=(...parts)=>{const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;};
const groupIdOk=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{24}$/.test(s);
const messageIdOk=s=>typeof s==='string'&&/^[A-Za-z0-9]{20}$/.test(s);
const deviceIdOk=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
const err=(status,reason)=>new Response(JSON.stringify({error:reason}),{status,headers:{'content-type':'application/json; charset=utf-8'}});
const ok=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json; charset=utf-8'}});
let googleKeys,googleKeysUntil=0,accessToken,accessTokenUntil=0;
async function firebaseUser(jwt,project){
  const pieces=jwt.split('.');
  if(pieces.length!==3)throw Error('bad token');
  const header=JSON.parse(new TextDecoder().decode(fromB64(pieces[0])));
  const payload=JSON.parse(new TextDecoder().decode(fromB64(pieces[1])));
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||!header.kid||payload.aud!==project||
    payload.iss!=='https://securetoken.google.com/'+project||
    !payload.sub||payload.sub.length>128||payload.exp<=now||payload.iat>now||
    payload.auth_time>now)throw Error('invalid token claims');
  if(!googleKeys||Date.now()>googleKeysUntil){
    const response=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if(!response.ok)throw Error('firebase public keys unavailable');
    googleKeys=(await response.json()).keys;
    googleKeysUntil=Date.now()+30*60*1000;
  }
  const jwk=googleKeys.find(k=>k.kid===header.kid);
  if(!jwk)throw Error('unknown key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,fromB64(pieces[2]),encoder.encode(pieces[0]+'.'+pieces[1]));
  if(!verified)throw Error('invalid signature');
  return payload.sub;
}
async function googleAccessToken(env){
  if(accessToken&&Date.now()<accessTokenUntil)return accessToken;
  const pem=env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n').replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',fromB64(pem),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const now=Math.floor(Date.now()/1000);
  const unsigned=json64({alg:'RS256',typ:'JWT'})+'.'+json64({
    iss:env.FIREBASE_CLIENT_EMAIL,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  });
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(unsigned)));
  const response=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+b64url(signature)})
  });
  if(!response.ok)throw Error('service-account token unavailable');
  const body=await response.json();accessToken=body.access_token;accessTokenUntil=Date.now()+(Math.min(body.expires_in||3600,3600)-120)*1000;
  return accessToken;
}
const base=env=>'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(env.FIREBASE_PROJECT_ID)+'/databases/(default)/documents';
async function firestore(env,path,options={}){
  const token=await googleAccessToken(env);
  const response=await fetch(base(env)+'/'+path,{
    ...options,headers:{authorization:'Bearer '+token,...options.headers}
  });
  if(response.status===404)return null;
  if(!response.ok){
    if(response.status===409)return {alreadyExists:true};
    throw Error('Firestore HTTP '+response.status);
  }
  if(response.status===204)return {};
  const body=await response.text();return body?JSON.parse(body):{};
}
const docValue=d=>{if(!d?.fields)return null;const f=d.fields,out={};for(const [k,v] of Object.entries(f))out[k]=v.stringValue??v.booleanValue??v.timestampValue??v.integerValue??null;return out;};
async function listDocs(env,path,max=100){
  const data=await firestore(env,path+'?pageSize='+max);
  if(data?.nextPageToken)throw Error('pagination required');
  return (data?.documents||[]).map(d=>({id:d.name.split('/').pop(),...docValue(d)}));
}
function pushEndpointAllowed(endpoint){
  try{
    const u=new URL(endpoint);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(
      u.hostname==='web.push.apple.com'||u.hostname==='fcm.googleapis.com'||
      u.hostname==='updates.push.services.mozilla.com'||
      u.hostname.endsWith('.notify.windows.com'));
  }catch{return false;}
}
async function hkdf(secret,salt,info,size){
  const key=await crypto.subtle.importKey('raw',secret,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info:encoder.encode(info)},key,size*8));
}
export async function encryptPush(subscription,payload){
  const receiver=fromB64(subscription.p256dh),auth=fromB64(subscription.auth);
  if(receiver.length!==65||receiver[0]!==4||auth.length!==16)throw Error('invalid subscription keys');
  const ephemeral=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const sender=new Uint8Array(await crypto.subtle.exportKey('raw',ephemeral.publicKey));
  const remote=await crypto.subtle.importKey('raw',receiver,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:remote},ephemeral.privateKey,256));
  const info=concat(encoder.encode('WebPush: info\0'),receiver,sender);
  const prk=await crypto.subtle.importKey('raw',shared,'HKDF',false,['deriveBits']);
  const ikm=new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt:auth,info:info},prk,256));
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,'Content-Encoding: aes128gcm\0',16);
  const nonce=await hkdf(ikm,salt,'Content-Encoding: nonce\0',12);
  const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const plain=concat(encoder.encode(JSON.stringify(payload)),new Uint8Array([2]));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,plain));
  const recordSize=new Uint8Array([0,0,16,0]); // 4096 bytes
  return concat(salt,recordSize,new Uint8Array([65]),sender,encrypted);
}
export async function vapidJwt(env,endpoint){
  const pub=fromB64(env.VAPID_PUBLIC_KEY),privateBytes=fromB64(env.VAPID_PRIVATE_KEY);
  if(pub.length!==65||pub[0]!==4||privateBytes.length!==32)throw Error('invalid VAPID key');
  const jwk={kty:'EC',crv:'P-256',x:b64url(pub.slice(1,33)),y:b64url(pub.slice(33,65)),d:b64url(privateBytes)};
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const unsigned=json64({typ:'JWT',alg:'ES256'})+'.'+json64({
    aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:env.VAPID_SUBJECT
  });
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(unsigned)));
  return unsigned+'.'+b64url(signature);
}
async function sendPush(env,subscription,payload){
  if(!pushEndpointAllowed(subscription.endpoint))return 'invalid';
  const body=await encryptPush(subscription,payload);
  const jwt=await vapidJwt(env,subscription.endpoint);
  const response=await fetch(subscription.endpoint,{
    method:'POST',headers:{
      'TTL':'3600','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',
      'Authorization':'vapid t='+jwt+', k='+env.VAPID_PUBLIC_KEY
    },body
  });
  if(response.status===404||response.status===410)return 'expired';
  if(!response.ok)throw Error('push gateway HTTP '+response.status);
  return 'sent';
}
async function handleNotify(request,env){
  if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_CLIENT_EMAIL||!env.FIREBASE_PRIVATE_KEY||
     !env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return err(503,'not configured');
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return err(401,'authentication required');
  let uid;try{uid=await firebaseUser(token,env.FIREBASE_PROJECT_ID);}catch{return err(401,'invalid authentication');}
  let input;try{input=await request.json();}catch{return err(400,'invalid JSON');}
  const {groupId,messageId}=input||{};
  if(!groupIdOk(groupId)||!messageIdOk(messageId))return err(400,'invalid identifiers');
  const [member,message,group]=await Promise.all([
    firestore(env,'families/'+groupId+'/members/'+encodeURIComponent(uid)),
    firestore(env,'families/'+groupId+'/messages/'+messageId),
    firestore(env,'families/'+groupId)
  ]);
  if(!member||!message||!group)return err(403,'not authorized');
  const data=docValue(message),info=docValue(group);
  if(data.senderUid!==uid||data.text==='__mogumogu_like_v1__'||!data.senderId)return err(403,'not a sender message');
  const created=Date.parse(data.createdAt||'');
  if(!Number.isFinite(created)||Date.now()-created>10*60*1000||created>Date.now()+60000)return err(409,'message too old');
  // Reserve before sending: retries do not duplicate notifications. A worker crash may lose a delivery.
  const receiptId=groupId+'_'+messageId;
  const receipt=await firestore(env,'pushDispatches?documentId='+receiptId,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({fields:{senderUid:{stringValue:uid},createdAt:{timestampValue:new Date().toISOString()}}})
  });
  if(receipt?.alreadyExists)return ok({duplicate:true});
  const members=await listDocs(env,'families/'+groupId+'/members',100);
  let sent=0,expired=0,failed=0;
  for(const recipient of members){
    if(recipient.id===uid)continue;
    const subscriptions=await listDocs(env,'users/'+encodeURIComponent(recipient.id)+'/pushSubscriptions',100);
    for(const subscription of subscriptions){
      if(!deviceIdOk(subscription.id)||subscription.enabled!==true)continue;
      try{
        const result=await sendPush(env,subscription,{groupId,groupName:(info.name||'モグモグのおしゃべり').slice(0,60),sender:data.senderId.slice(0,40)});
        if(result==='sent')sent++;
        if(result==='expired'||result==='invalid'){
          expired++;
          await firestore(env,'users/'+encodeURIComponent(recipient.id)+'/pushSubscriptions/'+subscription.id,{method:'DELETE'});
        }
      }catch{failed++;}
    }
  }
  return ok({sent,expired,failed});
}
export default {
  async fetch(request,env){
    const origin=env.APP_ORIGIN||'https://corecycletune.github.io';
    const cors={'access-control-allow-origin':origin,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, content-type','vary':'Origin'};
    if(request.headers.get('origin')!==origin)return err(403,'origin not allowed');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method==='GET'&&new URL(request.url).pathname==='/config'){
      return new Response(JSON.stringify({vapidPublicKey:env.VAPID_PUBLIC_KEY||''}),{
        headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      });
    }
    if(request.method!=='POST'||new URL(request.url).pathname!=='/notify')return err(404,'not found');
    try{
      const response=await handleNotify(request,env);
      for(const [k,v] of Object.entries(cors))response.headers.set(k,v);
      return response;
    }catch{return new Response(JSON.stringify({error:'notification unavailable'}),{status:503,headers:{...cors,'content-type':'application/json'}});}
  }
};
