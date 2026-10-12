// Five-layer cards use raster PNG rarity backgrounds and independent SVG frames. No SVG backgrounds.
// Every path is relative to /p/<profile>/; shared assets are under /assets/cards/.
const root='../../assets/cards/';
export const RARITY_VARIANT_BACKGROUNDS=Object.freeze({
  N:Object.freeze([root+'backgrounds/bg_n.png']),
  R:Object.freeze([root+'backgrounds/bg_r_1.png',root+'backgrounds/bg_r_2.png',root+'backgrounds/bg_r_3.png',root+'backgrounds/bg_r_4.png',root+'backgrounds/bg_r_5.png',root+'backgrounds/bg_r_6.png',root+'backgrounds/bg_r_7.png']),
  SR:Object.freeze([root+'backgrounds/bg_sr_1.png',root+'backgrounds/bg_sr_2.png',root+'backgrounds/bg_sr_3.png',root+'backgrounds/bg_sr_4.png',root+'backgrounds/bg_sr_5.png',root+'backgrounds/bg_sr_6.png',root+'backgrounds/bg_sr_7.png']),
  SSR:Object.freeze([root+'backgrounds/bg_ssr_holo.png']),
  UR:Object.freeze([root+'backgrounds/bg_ur.png'])
});
export const RARITY_BACKGROUNDS=Object.freeze(Object.fromEntries(
  Object.entries(RARITY_VARIANT_BACKGROUNDS).map(([rarity,options])=>[rarity,options[0]])
));
// Stable across devices and sessions; no random background changes for owned cards.
export function pickBackgroundForCard(cardId,rarity){
  const options=RARITY_VARIANT_BACKGROUNDS[rarity]||RARITY_VARIANT_BACKGROUNDS.N;
  let hash=13;
  for(const c of String(cardId||rarity)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
  return options[hash%options.length];
}

// Reusable frame sets. Initial rollout uses one themed set per N/R/SR rarity;
// future approved themes can extend selection without changing card data.
export const RARITY_FRAME_TEMPLATES=Object.freeze({
  N:Object.freeze({id:'n-corner',lowerFrame:root+'frames/base/n-corner.svg',upperFrame:root+'frames/top/n-corner.svg'}),
  R:Object.freeze({id:'r-botanical',lowerFrame:root+'frames/base/r-botanical.svg',upperFrame:root+'frames/top/r-botanical.svg'}),
  SR:Object.freeze({id:'sr-silverwork',lowerFrame:root+'frames/base/sr-silverwork.svg',upperFrame:root+'frames/top/sr-silverwork.svg'})
});
export function frameForCard(cardId,rarity){
  return RARITY_FRAME_TEMPLATES[rarity]||null;
}

export const CARD_LAYER_MANIFEST=Object.freeze({
  rice_n:Object.freeze({
    character:null,
    background:RARITY_BACKGROUNDS.N,
    lowerFrame:RARITY_FRAME_TEMPLATES.N.lowerFrame,
    upperFrame:RARITY_FRAME_TEMPLATES.N.upperFrame,
    foil:'none',
    layout:'basic-n'
  }),
  secret_rinpa_ur:Object.freeze({
    character:null,
    background:RARITY_BACKGROUNDS.UR,
    lowerFrame:root+'frames/base/ur-gold.svg',
    upperFrame:root+'frames/top/ur-gold.svg',
    foil:'legendary',
    layout:'legendary'
  }),
  omu_ichika_ssr:Object.freeze({
    character:root+'characters/omu_ichika_ssr.webp',
    background:RARITY_BACKGROUNDS.SSR,
    lowerFrame:root+'frames/base/ssr-heart.svg',
    upperFrame:root+'frames/top/ssr-heart.svg',
    foil:'pink',
    layout:'princess'
  }),
  hokusai_wave_ssr:Object.freeze({
    character:root+'characters/hokusai_wave_ssr.webp',
    background:RARITY_BACKGROUNDS.SSR,
    lowerFrame:root+'frames/base/ssr-wave.svg',
    upperFrame:root+'frames/top/ssr-wave.svg',
    foil:'blue',
    layout:'wave'
  }),
  mango_r:Object.freeze({
    character:null,
    background:pickBackgroundForCard('mango_r','R'),
    lowerFrame:RARITY_FRAME_TEMPLATES.R.lowerFrame,
    upperFrame:RARITY_FRAME_TEMPLATES.R.upperFrame,
    foil:'none',
    layout:'mango'
  }),
  newton_apple_sr:Object.freeze({
    character:null,
    background:pickBackgroundForCard('newton_apple_sr','SR'),
    lowerFrame:RARITY_FRAME_TEMPLATES.SR.lowerFrame,
    upperFrame:RARITY_FRAME_TEMPLATES.SR.upperFrame,
    foil:'pearl',
    layout:'scholar'
  }),
  vangogh_bread_ssr:Object.freeze({
    character:null,
    background:RARITY_BACKGROUNDS.SSR,
    lowerFrame:root+'frames/base/ssr-sunflower.svg',
    upperFrame:root+'frames/top/ssr-sunflower.svg',
    foil:'sunflower',
    layout:'sunflower'
  }),
  omu_ketchup_r:Object.freeze({
    character:root+'characters/omu_ketchup_r.webp',
    background:pickBackgroundForCard('omu_ketchup_r','R'), // Colorway fixed by character ID.
    lowerFrame:RARITY_FRAME_TEMPLATES.R.lowerFrame,
    upperFrame:RARITY_FRAME_TEMPLATES.R.upperFrame,
    foil:'none',
    layout:'adventurer'
  })
});
// Cards without an approved character image intentionally render with an empty character layer.
