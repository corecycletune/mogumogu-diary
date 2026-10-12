import {NUTRITION_MODELS} from './nutrition-models.js';
import {CARD_PROFILES} from './card-profiles.js';
export function putCardName(node,name){
  node.textContent=name;
  node.style.setProperty('--card-name-length',String(Math.max(1,name.length)*1.04));
}
const people={
 'アンリ・ルソー':'フランスの画家。独学で絵を学び、大きな葉や動物が重なる幻想的な密林の絵で知られます。',
 '葛飾北斎':'江戸時代の浮世絵師。「冨嶽三十六景」など、山や波、暮らしを大胆な構図で表しました。',
 '歌川広重':'江戸時代の浮世絵師。「東海道五十三次」など、雨や雪、旅先の風景を描きました。',
 '円山応挙':'江戸時代の画家。実物をよく観察した写生を重視し、動物や草花を描きました。',
 '雪舟':'室町時代の禅僧・画家。墨の濃淡や余白で自然を表す水墨画で知られます。',
 '竹久夢二':'大正時代を中心に活動した画家・詩人。抒情的な人物画やデザインを残しました。',
 'クロード・モネ':'フランスの印象派の画家。「睡蓮」などで、光や季節による景色の変化を描きました。',
 'ベートーヴェン':'ドイツの作曲家。交響曲やピアノ曲などを作り、聴力の困難の中でも創作を続けました。',
 'アイザック・ニュートン':'イングランドの科学者。運動の法則や万有引力、光の研究で知られます。りんごは重力の逸話の象徴です。',
 '東洲斎写楽':'江戸時代の浮世絵師。役者の表情や個性を大胆に表した役者絵で知られます。',
 'ヨハネス・フェルメール':'17世紀オランダの画家。室内の日常を、柔らかな光と緻密な構図で描きました。',
 'レオナルド・ダ・ヴィンチ':'ルネサンス期のイタリアの芸術家。絵画だけでなく人体や機械、自然も研究しました。',
 '伊藤若冲':'江戸時代の画家。鳥や草花を精密に描き、独創的な色彩と構図を残しました。',
 '尾形光琳':'江戸時代の画家・工芸家。琳派を代表し、「紅白梅図屏風」など装飾的な作品で知られます。',
 '岡本太郎':'日本の芸術家。生命の力を大胆な形や色で表し、「太陽の塔」などを制作しました。',
 '草間彌生':'日本の芸術家。水玉や網目、かぼちゃなどのモチーフで独自の世界を表現しています。',
 '棟方志功':'日本の版画家。木版を「板画」と呼び、力強い線と形で人物や仏などを表しました。',
 '横山大観':'近代日本画の画家。富士山などを描き、輪郭線に頼らない表現にも取り組みました。',
 'フィンセント・ファン・ゴッホ':'オランダ出身の画家。「ひまわり」などで、強い色彩と筆の動きを生かして表現しました。',
 'グスタフ・クリムト':'オーストリアの画家。金色と装飾的な模様を使った人物画で知られます。',
 '俵屋宗達':'江戸時代初期の画家。「風神雷神図屏風」など、豊かな装飾と大胆な構図の作品を残しました。'
};
function foodKey(card){
  if(card.id==='rousseau_jungle_ssr_trial')return 'mango';
  if(NUTRITION_MODELS[card.id])return card.id;
  if(card.id==='secret_omurice_ur')return 'donut';
  if(card.id==='secret_celestial_ur')return 'jelly';
  if(card.id==='noodle_n')return 'ramen';
  if(card.id==='beethoven_coffee_sr')return 'coffee';
  if(card.food==='オムライス')return 'omu';
  const first=card.id.split('_')[0];if(NUTRITION_MODELS[first])return first;
  const byFood={'ごはん':'rice','パン':'bread','トマト':'tomato','りんご':'apple','ミルク':'milk','うどん':'udon','せんべい':'senbei','だんご':'dango','和菓子':'mochi','お茶':'tea','飲み物':'tea','ゼリー':'jelly','パスタ':'pasta','野菜':'veggie','かぼちゃ':'pumpkin','栗':'chestnut','はちみつ':'honey','かき氷':'sweets'};
  return byFood[card.food]||'sweets';
}
export function detailsForCard(card){
  const model=NUTRITION_MODELS[foodKey(card)];
  return {food:model.food,pfc:model.ratios,nutrition:model,nutrients:model.nutrients,story:CARD_PROFILES[card.id]?.story||card.lore,figure:card.figure?people[card.figure]:null,
    motif:card.id==='secret_omurice_ur'?'カッシーニは土星とその環・衛星を調べた探査機。環の道をめぐる小さな相棒だ。':card.id==='secret_celestial_ur'?'ボイジャー2号は海王星を近くから観測した探査機。星の海で進む方向を照らしてくれる。':null};
}
export function openCardDetails(card,entry){
  let dialog=document.getElementById('cardDetails');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='cardDetails';dialog.className='card-details';document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
  dialog.replaceChildren();dialog.dataset.rarity=card.rarity.toLowerCase();
  const add=(tag,value,parent=dialog)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
  const close=add('button','閉じる ×');close.className='btn secondary';close.addEventListener('click',()=>dialog.close());
  const data=detailsForCard(card),hero=add('div','');hero.className='card-back-hero';
  const heading=add('h2',card.name,hero);heading.id='cardDetailTitle';dialog.setAttribute('aria-labelledby',heading.id);
  add('p',data.story,hero);
  add('h3','PFCバランス');
  if(data.pfc){
    const bar=add('div','');bar.className='pfc-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label','エネルギーの割合：たんぱく質'+data.pfc[0]+'%、脂質'+data.pfc[1]+'%、炭水化物'+data.pfc[2]+'%');
    const legend=add('div','');legend.className='pfc-legend';
    ['P たんぱく質','F 脂質','C 炭水化物'].forEach((label,index)=>{
      const part=add('span','',bar);part.className='pfc-part pfc-'+index;part.style.width=data.pfc[index]+'%';
      const item=add('div','',legend);item.className='pfc-item pfc-label-'+index;add('strong',data.pfc[index]+'%',item);add('span',label,item);
    });
    add('p','エネルギーの割合（目安）').className='small';
  }else add('p','ほとんどエネルギーがなく、水分が中心。');
  add('p',data.nutrition.tip);
  if(data.nutrients){add('h3','体へのはたらき');add('p',data.nutrients);}
  if(data.figure){add('h3',card.figure);add('p',data.figure);}
  if(data.motif){add('h3','星の相棒');add('p',data.motif);}
  if(entry)add('p','Lv.'+entry.level+' · '+entry.copies+'枚所持').className='small';
  dialog.showModal();
}
