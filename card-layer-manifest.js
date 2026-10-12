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

/**
 * Approved split-SVG frame variants for scalable N/R/SR card production.
 * Artwork remains independent. R/SR 6 patterns per rarity.
 */
export const RARITY_FRAME_VARIANTS=Object.freeze({
  N:Object.freeze([RARITY_FRAME_TEMPLATES.N]),
  R:Object.freeze(["r-botanical","r-geometric","r-antique","r-ribbon","r-seal","r-window"].map(id=>Object.freeze({
    id,lowerFrame:root+'frames/base/'+id+'.svg',upperFrame:root+'frames/top/'+id+'.svg'
  }))),
  SR:Object.freeze(["sr-silverwork","sr-wagara","sr-jewel","sr-celestial","sr-ornament","sr-arcane"].map(id=>Object.freeze({
    id,lowerFrame:root+'frames/base/'+id+'.svg',upperFrame:root+'frames/top/'+id+'.svg'
  })))
});
// Stable explicit assignments prevent theme drift when more assets are added.
// Unlisted future cards use deterministic fallback until curated.
export const CARD_FRAME_ASSIGNMENTS=Object.freeze({
  mango_r:'r-botanical',
  omu_tomato_r:'r-botanical',
  melon_r:'r-botanical',
  omu_star_r:'r-geometric',
  sushi_r:'r-geometric',
  pudding_r:'r-antique',
  taiyaki_r:'r-antique',
  omu_heart_r:'r-ribbon',
  omu_mini_r:'r-ribbon',
  parfait_r:'r-ribbon',
  omu_lunch_r:'r-seal',
  ramen_r:'r-seal',
  omu_ketchup_r:'r-window',
  omu_cheese_r:'r-window',
  pizza_r:'r-window',
  newton_apple_sr:'sr-silverwork',
  da_vinci_pasta_sr:'sr-silverwork',
  hokusai_senbei_sr:'sr-wagara',
  hiroshige_tea_sr:'sr-wagara',
  sesshu_udon_sr:'sr-wagara',
  sharaku_taiyaki_sr:'sr-wagara',
  omu_princess_sr:'sr-jewel',
  monet_jelly_sr:'sr-jewel',
  vermeer_milk_sr:'sr-jewel',
  omu_fuwatoro_sr:'sr-celestial',
  beethoven_coffee_sr:'sr-celestial',
  omu_cafe_sr:'sr-ornament',
  yumeji_candy_sr:'sr-ornament',
  omu_demi_sr:'sr-arcane',
  okyo_dango_sr:'sr-arcane'
});
export function frameForCard(cardId,rarity){
  const variants=RARITY_FRAME_VARIANTS[rarity];
  if(!variants)return null; // SSR/UR keep their unique frame/full-art treatment.
  const assigned=CARD_FRAME_ASSIGNMENTS[cardId];
  if(assigned){
    const selected=variants.find(frame=>frame.id===assigned);
    if(selected)return selected;
  }
  if(rarity==='N')return variants[0];
  let hash=47;
  for(const ch of String(cardId||rarity)){
    hash^=ch.charCodeAt(0);
    hash=Math.imul(hash,16777619)>>>0;
  }
  return variants[hash%variants.length];
}


// Independently replaceable transparent raster sprites for every N/R/SR card.
// Character names and game state remain outside the image assets.
export const CARD_CHARACTER_IMAGES=Object.freeze(Object.fromEntries(
  ["rice_n","carrot_n","tofu_n","bread_n","egg_n","miso_n","corn_n","cucumber_n","banana_n","potato_n","salmon_n","apple_n","milk_n","tomato_n","mushroom_n","strawberry_n","noodle_n","seaweed_n","omu_ketchup_r","omu_mini_r","omu_lunch_r","omu_heart_r","omu_star_r","omu_cheese_r","omu_tomato_r","pudding_r","ramen_r","mango_r","pizza_r","taiyaki_r","parfait_r","sushi_r","melon_r","omu_fuwatoro_sr","omu_demi_sr","omu_cafe_sr","omu_princess_sr","hokusai_senbei_sr","hiroshige_tea_sr","okyo_dango_sr","sesshu_udon_sr","yumeji_candy_sr","monet_jelly_sr","beethoven_coffee_sr","newton_apple_sr","sharaku_taiyaki_sr","vermeer_milk_sr","da_vinci_pasta_sr"].map(id=>[id,root+'characters/'+id+'.webp'])
));
export function characterArtForCard(cardId){
  return CARD_CHARACTER_IMAGES[cardId]||null;
}

export const CARD_LAYER_MANIFEST=Object.freeze({
  rice_n:Object.freeze({
    character:root+'characters/rice_n.webp',
    background:RARITY_BACKGROUNDS.N,
    lowerFrame:RARITY_FRAME_TEMPLATES.N.lowerFrame,
    upperFrame:RARITY_FRAME_TEMPLATES.N.upperFrame,
    foil:'none',
    layout:'basic-n'
  }),
  bread_n:Object.freeze({
    character:root+'characters/bread_n.webp',
    background:pickBackgroundForCard('bread_n','N'),
    lowerFrame:frameForCard('bread_n','N').lowerFrame,
    upperFrame:frameForCard('bread_n','N').upperFrame,
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
    character:root+'characters/mango_r.webp',
    background:pickBackgroundForCard('mango_r','R'),
    lowerFrame:frameForCard('mango_r','R').lowerFrame,
    upperFrame:frameForCard('mango_r','R').upperFrame,
    foil:'none',
    layout:'mango'
  }),
  newton_apple_sr:Object.freeze({
    character:root+'characters/newton_apple_sr.webp',
    background:pickBackgroundForCard('newton_apple_sr','SR'),
    lowerFrame:frameForCard('newton_apple_sr','SR').lowerFrame,
    upperFrame:frameForCard('newton_apple_sr','SR').upperFrame,
    foil:'pearl',
    layout:'scholar'
  }),
  omu_princess_sr:Object.freeze({
    character:root+'characters/omu_princess_sr.webp',
    background:pickBackgroundForCard('omu_princess_sr','SR'),
    lowerFrame:frameForCard('omu_princess_sr','SR').lowerFrame,
    upperFrame:frameForCard('omu_princess_sr','SR').upperFrame,
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
    lowerFrame:frameForCard('omu_ketchup_r','R').lowerFrame,
    upperFrame:frameForCard('omu_ketchup_r','R').upperFrame,
    foil:'none',
    layout:'adventurer'
  })
});
// N/R/SR all have separately replaceable transparent WebP sprites; SSR/UR retain their original per-card manifests.
