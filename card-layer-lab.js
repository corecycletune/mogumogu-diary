// On-page five-layer card construction lab, using only existing artwork.
// Accessible only at /p/jun/?dev=1 and never touches Firebase, gacha or collection state.
import {CARD_LAYER_MANIFEST,RARITY_BACKGROUNDS,RARITY_VARIANT_BACKGROUNDS,RARITY_FRAME_VARIANTS,CARD_FRAME_ASSIGNMENTS,frameForCard,pickBackgroundForCard} from './card-layer-manifest.js';
import {BY_ID} from './game-catalog.js';
(function(){
  const profile=document.body.dataset.profile;
  if(profile!=='jun'||!/(?:^|[?&])dev=1(?:&|$)/.test(location.search))return;
  const mount=document.getElementById('layerLab');
  const toggle=document.getElementById('devModeToggle');
  if(!mount||!toggle)return;

  const examples=['rice_n','bread_n','mango_r','omu_ketchup_r','newton_apple_sr','omu_princess_sr','vangogh_bread_ssr','secret_rinpa_ur'];
  const layerOrder=[
    {key:'substrate',text:'① ホロ下地'},
    {key:'background',text:'② 背景'},
    {key:'foil',text:'② 背景上のホロ'},
    {key:'under',text:'③ 下フレームSVG'},
    {key:'character',text:'④ キャラ画像／専用カード絵'},
    {key:'over',text:'⑤ 上フレームSVG'},
    {key:'glint',text:'反射の光'}
  ];
  const stageList=[];
  const descriptions={
    rice_n:'N｜新キャラ試作・やさしい紙風背景、ホロなし',
    bread_n:'N｜新キャラ試作・トースト、シンプルな枠',
    mango_r:'R｜新キャラ試作・植物フレーム、ホロなし',
    omu_ketchup_r:'R｜ケチャップオムライス・実メニューから再制作',
    newton_apple_sr:'SR｜新キャラ試作・銀細工フレーム、弱いパール反射',
    omu_princess_sr:'SR｜麻婆オムライス・既存フレーム、弱いパール反射',
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
    let foil;
    if(visual.fullArt){
      stage.className+=' full-art-card';
      layer(stage,'character','composite-layer card-full-art','img',visual.fullArt,data.name);
      foil=layer(stage,'foil','composite-layer composite-foil full-art-foil','div');
      if(visual.foil!=='none')layer(stage,'glint','composite-layer composite-glint full-art-glint','div');
    }else{
    layer(stage,'substrate','composite-layer holo-substrate','div');
    layer(stage,'background','composite-layer card-background-image','img',visual.background||RARITY_BACKGROUNDS[data.rarity],'');
    foil=layer(stage,'foil','composite-layer composite-foil','div');
    if(visual.foil!=='none'){
      const grain=layer(stage,'foil','composite-layer layer-lab-grain','div');
      grain.setAttribute('aria-hidden','true');
    }
    layer(stage,'under','composite-layer card-frame-under','img',visual.lowerFrame,'');
    if(visual.character)layer(stage,'character','composite-layer card-portrait','img',visual.character,data.name);
    layer(stage,'over','composite-layer card-frame-over','img',visual.upperFrame,'');
    if(visual.foil!=='none')layer(stage,'glint','composite-layer composite-glint','div');
    }
    const badge=elem('span','card-rarity',data.rarity);
    stage.appendChild(badge);
    const cap=elem('figcaption','layer-lab-caption');
    cap.appendChild(elem('strong','',data.name));
    cap.appendChild(elem('small','',descriptions[id]||(visual.fullArt?'SSR｜専用フルアート・独立ホロ':'背景面のホロのみ')));
    if(!visual.character&&!visual.fullArt)cap.appendChild(elem('small','', 'キャラクター画像：未制作'));
    figure.append(stage,cap);
    stageList.push({stage,foil});
    return figure;
  }

  const intro=elem('div','layer-lab-intro');
  intro.appendChild(elem('h3','', '🧩 N → UR：レア度5段階・実装比較'));
  intro.appendChild(elem('p','small','N～SRは独立したキャラ画像と背景・枠を合成。SSRは各カード固有の1枚絵に、独立したホロを重ねています。画像未制作のカードは空欄です。'));
  mount.appendChild(intro);

  // Prototype frames only. Not used for real cards until design approval.
  const framePreview=elem('section','frame-prototype-section');
  framePreview.appendChild(elem('h3','', '🖼 N・R・SR採用フレーム｜背景との実物合成'));
  framePreview.appendChild(elem('p','small','N：角飾り／R：植物／SR：銀細工。上下2枚の新しいSVGを実際のPNG背景と合成しています。キャラは未挿入です。3種類は通常の図鑑・ガチャへ適用済みで、ここでは背景7色との組み合わせを比較できます。'));
  const frameGrid=elem('div','frame-prototype-grid');
  const root='../../assets/cards/';
  const prototypes=[
    {rarity:'N',label:'N｜手帳の角飾り',frame:'n-corner',foil:'none',layout:'basic-n',description:'薄い紙と細い角線。ホログラムなし。',options:RARITY_VARIANT_BACKGROUNDS.N},
    {rarity:'R',label:'R｜植物の彫飾',frame:'r-botanical',foil:'none',layout:'mango',description:'葉の曲線と落ち着いた彩色。金箔なし。',options:RARITY_VARIANT_BACKGROUNDS.R},
    {rarity:'SR',label:'SR｜銀細工と小粒宝飾',frame:'sr-silverwork',foil:'pearl',layout:'scholar',description:'銀の細い彫刻と弱いパール反射。',options:RARITY_VARIANT_BACKGROUNDS.SR}
  ];
  for(const info of prototypes){
    const figure=elem('figure','frame-prototype-item');
    const stage=elem('div','card-art layered-card frame-proof-card rarity-'+info.rarity.toLowerCase()+' visual-'+info.layout+' foil-'+info.foil);
    stage.setAttribute('role','img');
    stage.setAttribute('aria-label',info.label+' 試作フレームと背景画像の組み合わせ');
    layer(stage,'substrate','composite-layer holo-substrate','div');
    const background=layer(stage,'background','composite-layer card-background-image','img',info.options[0],'');
    const foil=layer(stage,'foil','composite-layer composite-foil','div');
    layer(stage,'under','composite-layer card-frame-under','img',root+'frames/base/'+info.frame+'.svg','');
    // No SVG or emoji characters; missing art remains empty.
    layer(stage,'over','composite-layer card-frame-over','img',root+'frames/top/'+info.frame+'.svg','');
    if(info.foil!=='none')layer(stage,'glint','composite-layer composite-glint','div');
    stage.appendChild(elem('span','card-rarity',info.rarity));
    const caption=elem('figcaption','frame-prototype-caption');
    caption.appendChild(elem('strong','',info.label));
    caption.appendChild(elem('small','',info.description));
    if(info.options.length>1){
      const selectLabel=elem('label','frame-prototype-select');
      selectLabel.appendChild(document.createTextNode('背景色：'));
      const select=elem('select','field');
      select.setAttribute('aria-label',info.rarity+'試作フレーム用背景色');
      info.options.forEach((_,i)=>{
        const opt=document.createElement('option');
        opt.value=String(i);
        opt.textContent=(i+1)+' / '+info.options.length;
        select.appendChild(opt);
      });
      select.addEventListener('change',()=>{background.src=info.options[Number(select.value)];});
      selectLabel.appendChild(select);
      caption.appendChild(selectLabel);
    }
    figure.append(stage,caption);
    frameGrid.appendChild(figure);
    stageList.push({stage,foil});
  }
  const comparison=card('vangogh_bread_ssr');
  if(comparison){
    comparison.classList.add('frame-prototype-reference');
    const comparisonCaption=comparison.querySelector('.layer-lab-caption');
    if(comparisonCaption){
      comparisonCaption.insertBefore(elem('small','', 'SSR比較基準（専用フルアート＋独立ホロ）'),comparisonCaption.firstChild);
    }
    frameGrid.appendChild(comparison);
  }
  framePreview.appendChild(frameGrid);
  framePreview.appendChild(elem('p','small','※ このコーナーは開発専用の背景色比較です。N・R・SRの新フレームは通常の図鑑・ガチャへ適用済みです。ここでの選択操作は所持データ・抽選結果に影響しません。'));
  mount.appendChild(framePreview);

  // In-app gallery of every reusable R/SR frame variant.
  // The preview does not write to inventory or change card assignments.
  const variantsGallery=elem('section','frame-variants-section');
  variantsGallery.appendChild(elem('h3','', '🖼 R・SR フレーム全12パターン'));
  variantsGallery.appendChild(elem('p','small','各レア度6パターン（既存1＋追加5）。背景と上下SVGを合成した実表示です。図鑑・ガチャへの割当はキャラクターのテーマに基づき固定済み。'));
  const variantNames={
    'r-botanical':'植物','r-geometric':'幾何学','r-antique':'アンティーク',
    'r-ribbon':'リボン','r-seal':'スタンプ','r-window':'窓枠',
    'sr-silverwork':'銀細工','sr-wagara':'和柄','sr-jewel':'小粒宝飾',
    'sr-celestial':'天文','sr-ornament':'彫金','sr-arcane':'幻想紋様'
  };
  const frameRoot='../../assets/cards/frames/';
  for(const tier of ['R','SR']){
    const group=elem('div','frame-variants-group');
    group.appendChild(elem('h4','',tier+'｜6種類'));
    const galleryGrid=elem('div','frame-variants-grid');
    for(const [i,variant] of RARITY_FRAME_VARIANTS[tier].entries()){
      const figure=elem('figure','frame-variant-item');
      const stage=elem('div','card-art layered-card rarity-'+tier.toLowerCase()+' foil-'+(tier==='SR'?'pearl':'none'));
      stage.setAttribute('role','img');
      stage.setAttribute('aria-label',tier+' '+(variantNames[variant.id]||variant.id)+' のフレーム');
      layer(stage,'substrate','composite-layer holo-substrate','div');
      const bgSrc=RARITY_VARIANT_BACKGROUNDS[tier][i%RARITY_VARIANT_BACKGROUNDS[tier].length];
      layer(stage,'background','composite-layer card-background-image','img',bgSrc,'');
      const foil=layer(stage,'foil','composite-layer composite-foil','div');
      layer(stage,'under','composite-layer card-frame-under','img',variant.lowerFrame,'');
      layer(stage,'over','composite-layer card-frame-over','img',variant.upperFrame,'');
      if(tier==='SR')layer(stage,'glint','composite-layer composite-glint','div');
      stage.appendChild(elem('span','card-rarity',tier));
      figure.appendChild(stage);
      const cap=elem('figcaption','frame-variant-caption');
      cap.appendChild(elem('strong','',variantNames[variant.id]||variant.id));
      cap.appendChild(elem('small','',variant.id));
      figure.appendChild(cap);
      galleryGrid.appendChild(figure);
      stageList.push({stage,foil});
    }
    group.appendChild(galleryGrid);
    variantsGallery.appendChild(group);
  }
  mount.appendChild(variantsGallery);

  // Background-only comparison: preserves the existing SR illustration and
  // exposes all seven colorways without any placeholder characters.
  const variants=elem('div','background-variant-gallery');
  for(const [tier,labels] of [
    ['R',['緑','青緑','青','紫','桃','珊瑚','琥珀']],
    ['SR',['紺','藍','青紫','深緑','紫','赤紫','青緑']]
  ]){
    const heading=elem('h4','',tier+' 背景・7色');
    variants.appendChild(heading);
    const row=elem('div','background-variant-row');
    RARITY_VARIANT_BACKGROUNDS[tier].forEach((src,i)=>{
      const figure=elem('figure','background-variant-swatch');
      const img=elem('img','');
      img.src=src;
      img.alt=tier+'背景 '+(i+1)+'番 '+labels[i];
      img.loading='lazy';
      figure.appendChild(img);
      figure.appendChild(elem('figcaption','',labels[i]));
      row.appendChild(figure);
    });
    variants.appendChild(row);
  }
  variants.appendChild(elem('h4','','SSR 強化ホログラム背景'));
  const ssrFigure=elem('figure','background-variant-swatch background-ssr-swatch');
  const ssrImage=elem('img','');
  ssrImage.src=RARITY_BACKGROUNDS.SSR;
  ssrImage.alt='SSR 金・虹箔・微細ラメのホログラム背景';
  ssrFigure.appendChild(ssrImage);
  ssrFigure.appendChild(elem('figcaption','','ホログラム'));
  variants.appendChild(ssrFigure);
  mount.appendChild(variants);
  const ssrGallery=elem('section','ssr-full-art-gallery');
  ssrGallery.appendChild(elem('h3','','🌈 SSR｜極彩色の専用カード11種類'));
  ssrGallery.appendChild(elem('p','small','カードごとに背景・額縁・キャラを個別制作。ホロの表示は下の切替と強度で確認できます。'));
  const ssrGrid=elem('div','layer-lab-grid');
  Object.values(BY_ID).filter(data=>data.rarity==='SSR').forEach(data=>{
    const sample=card(data.id);if(sample)ssrGrid.appendChild(sample);
  });
  ssrGallery.appendChild(ssrGrid);
  mount.appendChild(ssrGallery);
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
      const max=stage.classList.contains('foil-ssr-vivid') ? .42 : stage.classList.contains('foil-legendary') ? 1 :
        stage.classList.contains('foil-sunflower') ? .98 :
        stage.classList.contains('foil-pearl') ? .30 : .75;
      foil.style.opacity=String(max*Number(slider.value)/100);
      stage.style.setProperty('--lab-grain-opacity',String(Number(slider.value)/100*(stage.classList.contains('foil-ssr-vivid') ? .42 : stage.classList.contains('foil-legendary') ? 1 : .92)));
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
