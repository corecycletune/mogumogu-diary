import {putCardName,openCardDetails} from './card-details.js';
export const SSR_PRISM_TRIAL=Object.freeze({id:'rousseau_jungle_ssr_trial',name:'ルソーの密林フルーツ',rarity:'SSR',food:'マンゴー',figure:'アンリ・ルソー',lore:'葉っぱのマントで密林を歩くマンゴーの探検家。迷子の星の実を家へ送っているが、みんな違う木を指すので毎晩フルーツ会議になる。'});
const mount=document.getElementById('ssrPrismTrial');
if(mount&&document.body.dataset.profile==='jun'&&new URLSearchParams(location.search).get('dev')==='1'){
  mount.hidden=false;
  mount.innerHTML='<h2>SSRプリズムホロの試作</h2><p>ルソーの密林フルーツ</p><div class="prism-trial-stage"></div><label class="label" for="prismTrialMode">ホロの比較</label><select id="prismTrialMode" class="field"><option value="ssr-prism">三角プリズム</option><option value="ssr-vivid">今のSSRホロ</option><option value="none">絵だけ</option></select><p class="small">試作カードです。カードを押すとプロフィールが読めます。</p>';
  const button=document.createElement('button');button.type='button';button.className='collection-card rarity-ssr';button.setAttribute('aria-label',SSR_PRISM_TRIAL.name+'の説明を読む');
  const art=document.createElement('div');art.className='card-art rarity-ssr layered-card full-art-card foil-ssr-prism';
  const img=document.createElement('img');img.className='composite-layer card-full-art';img.src='../../assets/cards/full-art/rousseau_jungle_ssr_trial.webp';img.alt=SSR_PRISM_TRIAL.name;img.draggable=false;art.append(img);
  for(const cls of ['full-art-foil composite-foil','full-art-glint composite-glint']){const layer=document.createElement('div');layer.className='composite-layer '+cls;layer.setAttribute('aria-hidden','true');art.append(layer);}
  const rarity=document.createElement('span');rarity.className='card-rarity';rarity.textContent='SSR';art.append(rarity);
  const name=document.createElement('strong');name.className='card-name';putCardName(name,SSR_PRISM_TRIAL.name);art.append(name);button.append(art);mount.querySelector('.prism-trial-stage').append(button);
  button.addEventListener('click',()=>openCardDetails(SSR_PRISM_TRIAL));
  mount.querySelector('select').addEventListener('change',e=>{art.classList.remove('foil-ssr-prism','foil-ssr-vivid','foil-none');art.classList.add('foil-'+e.target.value);});
  button.addEventListener('pointermove',e=>{const r=button.getBoundingClientRect();art.style.setProperty('--prism-x',((e.clientX-r.left)/r.width*100)+'%');art.style.setProperty('--prism-y',((e.clientY-r.top)/r.height*100)+'%');});
  button.addEventListener('pointerleave',()=>{art.style.removeProperty('--prism-x');art.style.removeProperty('--prism-y');});
}
