// Five-layer cards use raster PNG rarity backgrounds and independent SVG frames. No SVG backgrounds.
// Every path is relative to /p/<profile>/; shared assets are under /assets/cards/.
const root='../../assets/cards/';
export const RARITY_BACKGROUNDS=Object.freeze({
  N:root+'backgrounds/bg_n.png',
  R:root+'backgrounds/bg_r.png',
  SR:root+'backgrounds/bg_sr.png',
  SSR:root+'backgrounds/bg_ssr.png',
  UR:root+'backgrounds/bg_ur.png'
});
export const CARD_LAYER_MANIFEST=Object.freeze({
  rice_n:Object.freeze({
    character:null,
    background:RARITY_BACKGROUNDS.N,
    lowerFrame:root+'frames/base/n-paper.svg',
    upperFrame:root+'frames/top/n-paper.svg',
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
    background:RARITY_BACKGROUNDS.R,
    lowerFrame:root+'frames/base/r-simple.svg',
    upperFrame:root+'frames/top/r-simple.svg',
    foil:'none',
    layout:'mango'
  }),
  newton_apple_sr:Object.freeze({
    character:null,
    background:RARITY_BACKGROUNDS.SR,
    lowerFrame:root+'frames/base/sr-scholar.svg',
    upperFrame:root+'frames/top/sr-scholar.svg',
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
    background:RARITY_BACKGROUNDS.R, // R uses a soft reusable CSS wash, not an elaborate illustrated scene.
    lowerFrame:root+'frames/base/r-simple.svg',
    upperFrame:root+'frames/top/r-simple.svg',
    foil:'none',
    layout:'adventurer'
  })
});
// Cards without an approved character image intentionally render with an empty character layer.
