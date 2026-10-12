// Client-side prototype character master. All characters are ORIGINAL fictional designs.
export const RARITY_ODDS = Object.freeze([
  {rarity:'N', threshold:0.72},
  {rarity:'R', threshold:0.92},
  {rarity:'SR', threshold:0.98},
  {rarity:'SSR', threshold:0.9975},
  {rarity:'UR', threshold:1}
]);
export const RARITY_LABELS={N:'N',R:'R',SR:'SR',SSR:'SSR',UR:'UR'};
const rows=[
  // N: daily foods. Format: id | name | rarity | emoji | theme | figure | relation | description | style
  ['rice_n','おこめちゃん','N','🍚','ごはん','','','ふっくら炊けた、まいにちの主役。','food'],
  ['carrot_n','にんじん探検隊','N','🥕','野菜','','','畑の小さな冒険家。','food'],
  ['tofu_n','おとうふ忍者','N','⬜','大豆','','','ふわっと静かな忍者。','food'],
  ['bread_n','トーストこぞう','N','🍞','パン','','','こんがり焼けた朝の友だち。','food'],
  ['egg_n','たまごまる','N','🥚','たまご','','','ころころ転がるたまごの精。','food'],
  ['miso_n','おみそしる隊長','N','🍲','汁物','','','あったかい湯気が自慢。','food'],
  ['corn_n','とうもろこし王','N','🌽','野菜','','','つぶつぶの王冠をつけている。','food'],
  ['cucumber_n','きゅうり侍','N','🥒','野菜','','','まっすぐな剣士。','mixed'],
  ['banana_n','バナナ船長','N','🍌','果物','','','みんなの旅を先導する船長。','mixed'],
  ['potato_n','じゃがいも職人','N','🥔','野菜','','','ほくほくの道具名人。','food'],
  ['salmon_n','しゃけサムライ','N','🍣','魚','','','ごはんにぴったりの相棒。','mixed'],
  ['apple_n','りんごのこ','N','🍎','果物','','','赤いほっぺの小さなりんご。','food'],
  ['milk_n','ミルクひめ','N','🥛','乳製品','','','しろいドレスのやさしい姫。','mixed'],
  ['tomato_n','トマト隊員','N','🍅','野菜','','','まっかな元気が目印。','food'],
  ['mushroom_n','きのこ博士','N','🍄','きのこ','','','森の食べ物にくわしい。','mixed'],
  ['strawberry_n','いちごの妖精','N','🍓','果物','','','甘酸っぱいほほえみ。','food'],
  ['noodle_n','うどんひもじい','N','🍜','めん','','','つるつる走るめんの妖精。','food'],
  ['seaweed_n','のりのり忍者','N','🍙','海藻','','','くるっと巻いて現れる。','mixed'],
  // R: omurice variations and popular foods.
  ["omu_ketchup_r","ケチャップオムライス","R","🍳","オムライス","","","こんがりたまごに赤いケチャップ。洋食屋さんの元気な定番。","food"],
  ["omu_mini_r","プレーンオムライス","R","🍳","オムライス","","","ふんわりたまごとごはんの、素朴でやさしい味。","food"],
  ["omu_lunch_r","和風オムライス","R","🍳","オムライス","","","だしの香りときのこあん。和の味わいをまとったオムライス。","food"],
  ["omu_heart_r","明太マヨオムライス","R","🍳","オムライス","","","つぶつぶ明太子とまろやかマヨで、ちょっぴりおしゃれ。","food"],
  ["omu_star_r","カレーオムライス","R","🍳","オムライス","","","スパイス香るカレーのマントで、元気を届ける。","food"],
  ["omu_cheese_r","チーズオムライス","R","🍳","オムライス","","","とろけるチーズをまとった、まろやかな人気者。","food"],
  ["omu_tomato_r","トマトオムライス","R","🍳","オムライス","","","果肉たっぷりトマトソース。さわやかな赤が自慢。","food"],
  ['pudding_r','プリン騎士','R','🍮','お菓子','','','ぷるぷるの盾がじまん。','mixed'],
  ['ramen_r','ラーメン行進曲','R','🍜','めん','','','湯気のラッパで行進！','food'],
  ['mango_r','マンゴー王子','R','🥭','果物','','','南国育ちのあまい王子。','mixed'],
  ['pizza_r','ピザ職人','R','🍕','料理','','','チーズのマントがのびる。','person'],
  ['taiyaki_r','たい焼き歌舞伎','R','🐟','お菓子','','','お祭りで人気の役者。','mixed'],
  ['parfait_r','パフェのお姫さま','R','🍨','お菓子','','','フルーツの宝石をかざる。','person'],
  ['sushi_r','おすしジェット','R','🍣','寿司','','','酢飯の翼で飛び回る。','food'],
  ['melon_r','メロンぱん天使','R','🍈','パン','','','ふんわり香る羽根を持つ。','mixed'],
  // SR: thematic reinterpretations, esp Japanese artists.
  ["omu_fuwatoro_sr","スフレオムライス","SR","🍳","オムライス","","","ふわふわにふくらんだたまごで、軽やかに笑う。","food"],
  ["omu_demi_sr","デミグラスオムライス","SR","🍳","オムライス","","","深いコクのデミグラスソースをまとった洋食の名役者。","food"],
  ["omu_cafe_sr","ホワイトソースオムライス","SR","🍳","オムライス","","","クリーミーな白いソースで、やさしく包みこむ。","food"],
  ["omu_princess_sr","麻婆オムライス","SR","🍳","オムライス","","","豆腐とひき肉の麻婆ソースで、ぴりっと頼れる。","food"],
  ['hokusai_senbei_sr','北斎の波せんべい','SR','🌊','せんべい','葛飾北斎','artwork','波を描いた北斎の作品から着想した、波乗りせんべい。※創作キャラ','food'],
  ['hiroshige_tea_sr','広重の雨やどり茶','SR','🍵','お茶','歌川広重','artwork','広重の雨の風景画をヒントにしたお茶の旅人。※創作キャラ','mixed'],
  ['okyo_dango_sr','応挙の子犬だんご','SR','🍡','だんご','円山応挙','artwork','応挙の子犬の絵からヒントを得ただんごの子犬。※創作キャラ','food'],
  ['sesshu_udon_sr','雪舟の墨うどん','SR','🍜','うどん','雪舟','artwork','水墨画の世界に迷い込んだうどん。※創作キャラ','food'],
  ['yumeji_candy_sr','夢二の椿キャンディ','SR','🍬','お菓子','竹久夢二','inspired','大正ロマンをイメージしたキャンディ。※好物を示すものではありません','person'],
  ['monet_jelly_sr','モネの睡蓮ゼリー','SR','🪷','ゼリー','クロード・モネ','artwork','睡蓮の絵をモチーフにした水色のゼリー。※創作キャラ','food'],
  ['beethoven_coffee_sr','ベートーヴェン珈琲','SR','☕','飲み物','ベートーヴェン','episode','コーヒーと音楽家の逸話をヒントにした創作キャラ。','person'],
  ['newton_apple_sr','ニュートンりんご','SR','🍎','りんご','アイザック・ニュートン','symbolic','りんごの逸話にちなんだ発明家スタイル。好物を意味しません。','mixed'],
  ['sharaku_taiyaki_sr','写楽の見得たい焼き','SR','🐟','たい焼き','東洲斎写楽','artwork','役者絵の大胆な表情から生まれた創作たい焼き。','food'],
  ['vermeer_milk_sr','フェルメールのミルク','SR','🥛','ミルク','ヨハネス・フェルメール','artwork','牛乳を注ぐ女性の絵がヒント。※創作キャラ','mixed'],
  ['da_vinci_pasta_sr','ダ・ヴィンチのパスタ','SR','🍝','パスタ','レオナルド・ダ・ヴィンチ','inspired','万能な発想を表した歯車パスタ。※好物ではなく創作','mixed'],
  // SSR: special art and Ichika omurice.
  ["omu_ichika_ssr","ドレスドオムライス","SSR","🍳","オムライス","","inspired","ひだを重ねたたまごのドレス。特別な一皿の華やかな主役。","food","ichika"],
  ['omu_royal_ssr','ロイヤルオムライス','SSR','🍳','オムライス','','','ふわふわの王宮からやってきた特別な騎士。','person','royal'],
  ['hokusai_wave_ssr','北斎・大波の和菓子','SSR','🌊','和菓子','葛飾北斎','artwork','力強い波の作品をテーマにした創作和菓子。','mixed','wave'],
  ['jakuchu_veggie_ssr','若冲の彩菜鳳凰','SSR','🥬','野菜','伊藤若冲','artwork','精緻な動植物画から着想した野菜の鳳凰。','mixed','atelier'],
  ['korin_plum_ssr','光琳の梅もち','SSR','🌸','和菓子','尾形光琳','artwork','梅の意匠をテーマにした金屏風風の創作もち。','food','atelier'],
  ['taro_sun_ssr','岡本太郎の太陽トマト','SSR','☀️','トマト','岡本太郎','inspired','生命力のある太陽のイメージから生まれた創作トマト。作品そのものは複製しない。','mixed','sun'],
  ['kusama_pumpkin_ssr','草間彌生のかぼちゃ旅人','SSR','🎃','かぼちゃ','草間彌生','inspired','かぼちゃを主題にした芸術との出会いをイメージした創作キャラ。','food','atelier'],
  ['munakata_chestnut_ssr','棟方志功の版画ぐり','SSR','🌰','栗','棟方志功','artwork','版画の力強さをヒントにした、木の実の彫刻家。','person','atelier'],
  ['taikan_fuji_ssr','大観の富士かき氷','SSR','🍧','かき氷','横山大観','artwork','富士の風景画をヒントにした雲のかき氷。','food','mountain'],
  ['vangogh_bread_ssr','ゴッホのひまわりパン','SSR','🌻','パン','フィンセント・ファン・ゴッホ','artwork','ひまわりの絵が着想源のパン職人。','mixed','sun'],
  ['klimt_honey_ssr','クリムトの金色はちみつ','SSR','🍯','はちみつ','グスタフ・クリムト','inspired','金色のきらめきをイメージした創作はちみつ。','food','royal'],
  // UR: HIDDEN; never list before owning.
  ['secret_omurice_ur','天穹オムライス・ミラクル','UR','🌈','オムライス','','secret','すべてが光る、伝説のオムライス。','mixed','legend'],
  ['secret_rinpa_ur','宗達の千年黄金おこめ','UR','✨','ごはん','俵屋宗達','inspired','絵巻物に宿るような、不思議なおこめの守り神。※創作','food','legend'],
  ['secret_celestial_ur','星環のニュートンりんご','UR','🍎','りんご','アイザック・ニュートン','symbolic','りんごの逸話から広がる宇宙の奇跡。※創作','mixed','cosmos']
];
// Backgrounds are determined only by rarity via RARITY_BACKGROUNDS.
// Legacy per-card SVG/CSS pattern metadata is intentionally not used.
export const CATALOG=Object.freeze(rows.map(([id,name,rarity,emoji,food,figure,relation,lore,style])=>
  Object.freeze({id,name,rarity,emoji,food,figure:figure||null,relation:relation||null,lore,style})
));
export const BY_ID=Object.fromEntries(CATALOG.map(x=>[x.id,x]));
export function levelForCopies(copies){
  return copies>=11?5:copies>=7?4:copies>=4?3:copies>=2?2:copies>=1?1:0;
}
function randomFraction(){
  const data=new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0]/4294967296;
}
export function drawCharacter(){
  const roll=randomFraction();
  const tier=RARITY_ODDS.find(x=>roll<x.threshold).rarity;
  const pool=CATALOG.filter(x=>x.rarity===tier);
  return pool[Math.floor(randomFraction()*pool.length)];
}
