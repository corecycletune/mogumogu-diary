const pref=key=>'mogumogu:'+key;
let enabled=localStorage.getItem(pref('sound'))!=='off',musicEnabled=localStorage.getItem(pref('bgm'))==='on',context=null,activated=false;
let soundVolume=Number(localStorage.getItem(pref('sound-volume'))??60)/100;
let bgmVolume=Number(localStorage.getItem(pref('bgm-volume'))??35)/100;
const samples=new Map(),sampleKinds=['button','tab','success','confirm','error'];
const bgm=new Audio(new URL('./assets/audio/flowerbed-fields.m4a',import.meta.url));bgm.loop=true;bgm.preload='none';
function audio(){if(!context){const C=window.AudioContext||window.webkitAudioContext;if(C)context=new C();}if(context?.state==='suspended')void context.resume();return context;}
function notes(frequencies,duration=.11,volume=.055,channel='sound'){
  if(document.hidden||!activated||(channel==='sound'?!enabled:!musicEnabled))return;
  const ctx=audio();if(!ctx)return;
  const start=ctx.currentTime;
  frequencies.forEach((f,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=start+i*duration;oscillator.type='sine';oscillator.frequency.value=f;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume*(channel==='sound'?soundVolume:bgmVolume),at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+duration*.95);oscillator.connect(gain).connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration);});
}
async function loadSamples(){
  const ctx=audio();if(!ctx)return;
  await Promise.allSettled(sampleKinds.map(async kind=>{
    const response=await fetch(new URL('./assets/audio/'+kind+'.m4a',import.meta.url));
    if(response.ok)samples.set(kind,await ctx.decodeAudioData(await response.arrayBuffer()));
  }));
}
export function playSound(kind,rarity){
  try{
    if(!enabled||!activated||document.hidden)return;
    const buffer=samples.get(kind);
    if(buffer){const ctx=audio(),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=soundVolume*.55;source.connect(gain).connect(ctx.destination);source.start();return;}
    const tunes={start:[330,440,660],new:[784,988,1175],button:[360,520],tab:[580],success:[523,659,784],confirm:[440,587],error:[330,294],N:[440],R:[523,659],SR:[523,659,784],SSR:[523,659,784,1047],UR:[262,392,523,784,1047]};
    notes(tunes[kind==='reveal'?rarity:kind]||tunes.N,rarity==='UR'?.22:.11);
  }catch{/* Audio must never interrupt a saved action. */}
}
function music(){bgm.volume=bgmVolume*.35;if(!musicEnabled||!activated||document.hidden){bgm.pause();return;}void bgm.play().catch(()=>{});}
export function initSound(){
  const sound=document.getElementById('soundToggle'),bgm=document.getElementById('bgmToggle'),sVolume=document.getElementById('soundVolume'),bVolume=document.getElementById('bgmVolume');
  const paint=()=>{sound.textContent='効果音 '+(enabled?'ON':'OFF');sound.setAttribute('aria-pressed',String(enabled));bgm.textContent='BGM '+(musicEnabled?'ON':'OFF');bgm.setAttribute('aria-pressed',String(musicEnabled));sVolume.value=String(Math.round(soundVolume*100));bVolume.value=String(Math.round(bgmVolume*100));};
  sound.addEventListener('click',()=>{enabled=!enabled;localStorage.setItem(pref('sound'),enabled?'on':'off');if(enabled)playSound('confirm');paint();});
  bgm.addEventListener('click',()=>{musicEnabled=!musicEnabled;localStorage.setItem(pref('bgm'),musicEnabled?'on':'off');music();paint();});
  sVolume.addEventListener('input',()=>{soundVolume=Number(sVolume.value)/100;localStorage.setItem(pref('sound-volume'),sVolume.value);});
  bVolume.addEventListener('input',()=>{bgmVolume=Number(bVolume.value)/100;localStorage.setItem(pref('bgm-volume'),bVolume.value);music();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){music();void context?.suspend();}else if(activated){void context?.resume();music();}});
  document.addEventListener('pointerdown',()=>{activated=true;try{audio();void loadSamples();music();}catch{}},{once:true});
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled||button===sound||button===bgm||button.closest('#gameResult'))return;
    playSound(button.matches('[data-target],.tab')?'tab':'button');
  });paint();
}
