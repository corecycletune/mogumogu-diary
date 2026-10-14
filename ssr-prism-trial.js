import {isDevModeEnabled} from './developer-access.js';
import {SSR_GOLD_FRAME} from './card-layer-manifest.js';
import {putCardName,openCardDetails} from './card-details.js';
export const SSR_PRISM_TRIAL=Object.freeze({id:'rousseau_jungle_ssr_trial',name:'ルソーの密林フルーツ',rarity:'SSR',food:'マンゴー',figure:'アンリ・ルソー',lore:'葉っぱのマントで密林を歩くマンゴーの探検家。迷子の星の実と一緒に、滝の向こうの帰り道を探す。'});
const profile=window.MogumoguAccount?.uid;
const mount=document.getElementById('ssrPrismTrial');
if(mount&&isDevModeEnabled(window.MogumoguAccount,location.search)){
  mount.hidden=false;
  mount.innerHTML='<h2>ルソーのホロ比較</h2><p>採用した密林の絵に、異なる反射を重ねます。</p><div class="prism-trial-stage"></div><label class="label" for="prismTrialMode">ホロの比較</label><select id="prismTrialMode" class="field"><option value="ssr-prism">三角プリズム（現在のカード）</option><option value="ssr-stardust">星屑の反射</option><option value="none">絵だけ</option></select><p class="small">どちらのホロも約3秒ごとに煌めきます。カードを押すとプロフィールが読めます。</p>';
  const button=document.createElement('button');button.type='button';button.className='collection-card rarity-ssr';button.setAttribute('aria-label',SSR_PRISM_TRIAL.name+'の説明を読む');
  const art=document.createElement('div');art.className='card-art rarity-ssr layered-card full-art-card foil-ssr-prism';
  const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.className='composite-layer card-full-art';img.src='../../assets/cards/full-art/rousseau_jungle_ssr.webp?v=jungle-story-v1';img.alt=SSR_PRISM_TRIAL.name;img.draggable=false;art.append(img);
  for(const cls of ['full-art-foil composite-foil','full-art-glint composite-glint']){const layer=document.createElement('div');layer.className='composite-layer '+cls;layer.setAttribute('aria-hidden','true');art.append(layer);}
  const frame=document.createElement('img');frame.className='composite-layer card-ssr-gold';frame.src=SSR_GOLD_FRAME;frame.alt='';art.append(frame);
  const rarity=document.createElement('span');rarity.className='card-rarity';rarity.textContent='SSR';art.append(rarity);
  const name=document.createElement('strong');name.className='card-name';putCardName(name,SSR_PRISM_TRIAL.name);art.append(name);button.append(art);mount.querySelector('.prism-trial-stage').append(button);
  button.addEventListener('click',()=>openCardDetails(SSR_PRISM_TRIAL,null,art));
  mount.querySelector('#prismTrialMode').addEventListener('change',e=>{art.classList.remove('foil-ssr-prism','foil-ssr-stardust','foil-none');art.classList.add('foil-'+e.target.value);});
}
