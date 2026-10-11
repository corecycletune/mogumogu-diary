// Curated five-layer art for the three reference cards.
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
  omu_ketchup_r:Object.freeze({
    character:root+'characters/omu_ketchup_r.webp',
    background:null, // R uses a soft reusable CSS wash, not an elaborate illustrated scene.
    lowerFrame:root+'frames/base/r-simple.svg',
    upperFrame:root+'frames/top/r-simple.svg',
    foil:'none',
    layout:'adventurer'
  })
});
// Other cards continue to use the original SVG character illustrator as a fallback
// until their individual illustration assets are completed.
