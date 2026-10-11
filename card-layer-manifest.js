// Curated five-layer art for six independently layered reference cards.
// Every path is relative to /p/<profile>/; shared assets are under /assets/cards/.
const root='../../assets/cards/';
export const CARD_LAYER_MANIFEST=Object.freeze({
  omu_ichika_ssr:Object.freeze({
    character:root+'characters/omu_ichika_ssr.webp',
    background:root+'backgrounds/ssr-ichika-palace.svg',
    lowerFrame:root+'frames/base/ssr-heart.svg',
    upperFrame:root+'frames/top/ssr-heart.svg',
    foil:'pink',
    layout:'princess'
  }),
  hokusai_wave_ssr:Object.freeze({
    character:root+'characters/hokusai_wave_ssr.webp',
    background:root+'backgrounds/ssr-hokusai-wave.svg',
    lowerFrame:root+'frames/base/ssr-wave.svg',
    upperFrame:root+'frames/top/ssr-wave.svg',
    foil:'blue',
    layout:'wave'
  }),
  mango_r:Object.freeze({
    character:root+'characters/mango_prince_r.svg',
    background:null,
    lowerFrame:root+'frames/base/r-simple.svg',
    upperFrame:root+'frames/top/r-simple.svg',
    foil:'none',
    layout:'mango'
  }),
  newton_apple_sr:Object.freeze({
    character:root+'characters/newton_apple_sr.svg',
    background:null,
    lowerFrame:root+'frames/base/sr-scholar.svg',
    upperFrame:root+'frames/top/sr-scholar.svg',
    foil:'pearl',
    layout:'scholar'
  }),
  vangogh_bread_ssr:Object.freeze({
    character:root+'characters/vangogh_sunflower_bread_ssr.svg',
    background:root+'backgrounds/ssr-sunflower-foil-field.svg',
    lowerFrame:root+'frames/base/ssr-sunflower.svg',
    upperFrame:root+'frames/top/ssr-sunflower.svg',
    foil:'sunflower',
    layout:'sunflower'
  }),
  omu_ketchup_r:Object.freeze({
    character:root+'characters/omu_ketchup_r.webp',
    background:null, // R uses a soft reusable CSS wash, not an elaborate illustrated scene.
    lowerFrame:root+'frames/base/r-simple.svg',
    upperFrame:root+'frames/top/r-simple.svg',
    foil:'none',
    layout:'adventurer'
  })
});
// The remaining cards use the original SVG character illustrator as a fallback
// until their individual illustration assets are completed.
