// On-page five-layer card construction lab, using only existing artwork.
// Accessible only at /p/jun/?dev=1 and never touches Firebase, gacha or collection state.
import {CARD_LAYER_MANIFEST} from './card-layer-manifest.js';
import {BY_ID} from './game-catalog.js';
(function(){
  const profile=document.body.dataset.profile;
  if(profile!=='jun'||!/(?:^|[?&])dev=1(?:&|$)/.test(location.search))return;
  const mount=document.getElementById('layerLab');
  const toggle=document.getElementById('devModeToggle');
  if(!mount||!toggle)return;

  const examples=['rice_n','mango_r','newton_apple_sr','vangogh_bread_ssr','secret_rinpa_ur'];
  const layerOrder=[
    {key:'substrate',text:'① ホロ下地'},
    {key:'background',text:'② 背景'},
    {key:'foil',text:'② 背景上のホロ'},
    {key:'under',text:'③ 下フレームSVG'},
    {key:'character',text:'④ 透過キャラ画像'},
    {key:'over',text:'⑤ 上フレームSVG'},
    {key:'glint',text:'反射の光'}
  ];
  const stageList=[];
  const descriptions={
    rice_n:'N｜紙のような淡い単色・細い枠・ホロなし',
    mango_r:'R｜Nより明るい彩色・緑の装飾枠・ホロなし',
    newton_apple_sr:'SR｜青銀のフレーム・弱いパール反射',
    vangogh_bread_ssr:'SSR｜豪華な金枠・高密度の虹色ホログラム',
    secret_rinpa_ur:'UR｜開発画面限定・専用の金虹箔・伝説級の背景'
  };
  function elem(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function layer(stage,key,cssClass,tag,src,alt){
    const node=elem(tag,cssClass);
    node.dataset.layer=key;
    if(tag==='img'){
      node.src=src;
      node.alt=alt||'';
      node.loading='lazy';
      node.decoding='async';
      node.draggable=false;
    }else node.setAttribute('aria-hidden','true');
    stage.appendChild(node);
    return node;
  }
  function card(id){
    const data=BY_ID[id],visual=CARD_LAYER_MANIFEST[id];
    if(!data||!visual)return null;
    const figure=elem('figure','layer-lab-card');
    const stage=elem('div','card-art layered-card rarity-'+data.rarity.toLowerCase()+' visual-'+visual.layout+' foil-'+visual.foil);
    stage.setAttribute('role','img');
    stage.setAttribute('aria-label',data.name+'をレイヤー合成した試作カード');
    layer(stage,'substrate','composite-layer holo-substrate','div');
    if(visual.background)layer(stage,'background','composite-layer card-background-image','img',visual.background,'');
    const foil=layer(stage,'foil','composite-layer composite-foil','div');
    if(visual.foil!=='none'){
      const grain=layer(stage,'foil','composite-layer layer-lab-grain','div');
      grain.setAttribute('aria-hidden','true');
    }
    layer(stage,'under','composite-layer card-frame-under','img',visual.lowerFrame,'');
    if(visual.character)layer(stage,'character','composite-layer card-portrait','img',visual.character,data.name);
    layer(stage,'over','composite-layer card-frame-over','img',visual.upperFrame,'');
    if(visual.foil!=='none')layer(stage,'glint','composite-layer composite-glint','div');
    const badge=elem('span','card-rarity',data.rarity);
    stage.appendChild(badge);
    const cap=elem('figcaption','layer-lab-caption');
    cap.appendChild(elem('strong','',data.name));
    cap.appendChild(elem('small','',descriptions[id]||'背景面のホロのみ'));
    if(!visual.character)cap.appendChild(elem('small','', 'キャラクター画像：未制作'));
    figure.append(stage,cap);
    stageList.push({stage,foil});
    return figure;
  }

  const intro=elem('div','layer-lab-intro');
  intro.appendChild(elem('h3','', '🧩 N → UR：レア度5段階・実装比較'));
  intro.appendChild(elem('p','small','フレーム・背景・ホロの比較画面です。簡易SVGキャラクター素材は削除済みのため、キャラが未制作のカードは空欄にしています。SSR/URも完成アートへの差し替え前です。'));
  mount.appendChild(intro);
  const panel=elem('div','layer-lab-controls');
  for(const item of layerOrder){
    const label=elem('label','layer-lab-toggle');
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';
    checkbox.checked=true;
    checkbox.dataset.testLayer=item.key;
    checkbox.addEventListener('change',()=>{
      stageList.forEach(({stage})=>{
        stage.classList.toggle('lab-hide-'+item.key,!checkbox.checked);
      });
    });
    label.append(checkbox,document.createTextNode(' '+item.text));
    panel.appendChild(label);
  }
  const sliderLabel=elem('label','layer-lab-foil-intensity','ホロ強度 ');
  const slider=elem('input','');
  slider.type='range';slider.min='0';slider.max='100';slider.value='92';
  slider.setAttribute('aria-label','ホログラムの強さ');
  const sliderValue=elem('strong','',slider.value+'%');
  const intensify=()=>{
    sliderValue.textContent=slider.value+'%';
    stageList.forEach(({stage,foil})=>{
      if(stage.classList.contains('foil-none'))return;
      const max=stage.classList.contains('foil-legendary') ? 1 :
        stage.classList.contains('foil-sunflower') ? .98 :
        stage.classList.contains('foil-pearl') ? .30 : .75;
      foil.style.opacity=String(max*Number(slider.value)/100);
      stage.style.setProperty('--lab-grain-opacity',String(Number(slider.value)/100*(stage.classList.contains('foil-legendary') ? 1 : .92)));
      stage.style.setProperty('--lab-glint-opacity',String(Number(slider.value)/100*(stage.classList.contains('foil-legendary') ? .78 : .48)));
    });
  };
  slider.addEventListener('input',intensify);
  sliderLabel.append(slider,sliderValue);
  panel.appendChild(sliderLabel);
  mount.appendChild(panel);
  const grid=elem('div','layer-lab-grid');
  examples.forEach(id=>{const sample=card(id);if(sample)grid.appendChild(sample);});
  mount.appendChild(grid);
  mount.appendChild(elem('p','small','※ キャラクター画像が未制作のカードは空欄です。背景・前後SVGフレーム・ホロは残しています。画像素材は今後追加するまで表示されません。URは通常の図鑑で未所持時には見えません。開発用比較は本番の抽選や所持記録に影響しません。'));
  intensify();
  const reflect=()=>{mount.hidden=!toggle.checked;};
  toggle.addEventListener('change',reflect);
  reflect();
})();
