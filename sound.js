const pref=key=>'mogumogu:'+key;
let enabled=localStorage.getItem(pref('sound'))==='on',musicEnabled=localStorage.getItem(pref('bgm'))==='on',context=null,musicTimer=null;
function audio(){if(!context){const C=window.AudioContext||window.webkitAudioContext;if(C)context=new C();}if(context?.state==='suspended')void context.resume();return context;}
function notes(frequencies,duration=.11,volume=.055){
  if(!enabled||document.hidden)return;
  const ctx=audio();if(!ctx)return;
  const start=ctx.currentTime;
  frequencies.forEach((f,i)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=start+i*duration;oscillator.type='sine';oscillator.frequency.value=f;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.01);gain.gain.exponentialRampToValueAtTime(.0001,at+duration*.95);oscillator.connect(gain).connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration);});
}
export function playSound(kind,rarity){try{const tunes={start:[330,440,660],new:[784,988,1175],button:[440],N:[440],R:[523,659],SR:[523,659,784],SSR:[523,659,784,1047],UR:[262,392,523,784,1047]};notes(tunes[kind==='reveal'?rarity:kind]||tunes.N,rarity==='UR'?.22:.11);}catch{/* Audio is optional; it must never interrupt a saved draw. */}}
function music(){clearInterval(musicTimer);musicTimer=null;if(!enabled||!musicEnabled||document.hidden)return;let step=0;const melody=[262,330,392,330,294,349,440,349];musicTimer=setInterval(()=>notes([melody[step++%melody.length]],.6,.014),750);}
export function initSound(){
  const sound=document.getElementById('soundToggle'),bgm=document.getElementById('bgmToggle');
  const paint=()=>{sound.textContent='サウンド '+(enabled?'ON':'OFF');sound.setAttribute('aria-pressed',String(enabled));bgm.textContent='BGM '+(musicEnabled?'ON':'OFF');bgm.setAttribute('aria-pressed',String(musicEnabled));bgm.disabled=!enabled;};
  sound.addEventListener('click',()=>{enabled=!enabled;localStorage.setItem(pref('sound'),enabled?'on':'off');try{if(enabled){audio();playSound('button');}else void context?.suspend();}catch{}music();paint();});
  bgm.addEventListener('click',()=>{musicEnabled=!musicEnabled;localStorage.setItem(pref('bgm'),musicEnabled?'on':'off');music();paint();});
  document.addEventListener('visibilitychange',()=>{music();if(document.hidden)void context?.suspend();});
  document.addEventListener('pointerdown',()=>{if(enabled){try{audio();music();}catch{}}},{once:true});paint();
}
