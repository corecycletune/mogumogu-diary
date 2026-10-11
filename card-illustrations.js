// Original, scalable food-character illustrations for cards.
// Each character is a separate SVG foreground; rarity backgrounds are handled by CSS.
// All markup is created from code-owned static definitions, not from user input.
const defs='<defs>'+
'<radialGradient id="egg"><stop stop-color="#fff7c8"/><stop offset=".62" stop-color="#ffd960"/><stop offset="1" stop-color="#ec9e39"/></radialGradient>'+
'<linearGradient id="bread" x2="0" y2="1"><stop stop-color="#ffe9a0"/><stop offset="1" stop-color="#d68c3e"/></linearGradient>'+
'<radialGradient id="pink"><stop stop-color="#ffe9f1"/><stop offset="1" stop-color="#ef95ac"/></radialGradient>'+
'<radialGradient id="apple"><stop stop-color="#ff9b87"/><stop offset=".65" stop-color="#ed444b"/><stop offset="1" stop-color="#aa2036"/></radialGradient>'+
'<radialGradient id="wagashi"><stop stop-color="#ffffff"/><stop offset=".58" stop-color="#d0e9fc"/><stop offset="1" stop-color="#6db5e2"/></radialGradient>'+
'<linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff3a3"/><stop offset=".45" stop-color="#e9ab32"/><stop offset="1" stop-color="#a96b24"/></linearGradient>'+
'<linearGradient id="royal" x2="0" y2="1"><stop stop-color="#ff9bcb"/><stop offset="1" stop-color="#b93a7b"/></linearGradient>'+
'<filter id="shadow" x="-40%" y="-40%" width="180%" height="190%"><feGaussianBlur stdDeviation="7"/></filter>'+
'<filter id="soft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="2"/></filter>'+
'</defs>';
const shadow='<ellipse cx="179" cy="377" rx="110" ry="23" fill="#352940" opacity=".20" filter="url(#shadow)"/>';
const limbs='<path d="M105 300 Q64 316 52 292" stroke="#874b48" stroke-width="19" stroke-linecap="round" fill="none"/>'+
'<path d="M246 299 Q284 311 304 280" stroke="#874b48" stroke-width="19" stroke-linecap="round" fill="none"/>'+
'<path d="M137 347 Q127 364 114 375" stroke="#704258" stroke-width="18" stroke-linecap="round"/>'+
'<path d="M214 347 Q228 367 247 372" stroke="#704258" stroke-width="18" stroke-linecap="round"/>'+
'<ellipse cx="110" cy="374" rx="27" ry="13" fill="#593f66" transform="rotate(-20 110 374)"/>'+
'<ellipse cx="251" cy="374" rx="27" ry="13" fill="#593f66" transform="rotate(20 251 374)"/>';
const face='<ellipse cx="127" cy="234" rx="9" ry="13" fill="#392d45"/>'+
'<ellipse cx="225" cy="234" rx="9" ry="13" fill="#392d45"/>'+
'<circle cx="124" cy="230" r="3.5" fill="#fff"/><circle cx="222" cy="230" r="3.5" fill="#fff"/>'+
'<ellipse cx="95" cy="260" rx="19" ry="8" fill="#f18d96" opacity=".8"/>'+
'<ellipse cx="257" cy="260" rx="19" ry="8" fill="#f18d96" opacity=".8"/>'+
'<path d="M155 254 Q176 279 196 254" stroke="#843e4c" stroke-width="7" stroke-linecap="round" fill="none"/>';
const glimmer='<path d="M53 124v-18m-9 9h18M293 142v-24m-12 12h24M279 83v-14m-7 7h14" stroke="#fffce3" stroke-width="5" stroke-linecap="round" opacity=".92"/>';
const winks=face.replace('<ellipse cx="225" cy="234" rx="9" ry="13" fill="#392d45"/>','<path d="M213 232q14-11 26 2" stroke="#392d45" stroke-width="7" fill="none" stroke-linecap="round"/>');
const eggBase='<path d="M88 191 C81 148 116 113 182 122 C252 112 287 147 276 188 Q297 206 277 238 Q288 270 250 282 Q208 314 144 299 Q86 304 76 270 Q52 240 78 216Z" fill="url(#egg)" stroke="#da8b32" stroke-width="7"/>'+
'<path d="M90 181 Q173 138 266 181" fill="none" stroke="#fff6c1" stroke-width="13" stroke-linecap="round" opacity=".9"/>'+
'<path d="M104 184 Q125 193 141 190 Q168 180 189 194 T248 188" fill="none" stroke="#c7443d" stroke-width="13" stroke-linecap="round"/>'+
'<ellipse cx="177" cy="287" rx="116" ry="21" fill="#f4ddab" stroke="#cd9253" stroke-width="5"/>';
const crown='<path d="M122 122 L112 78 L142 91 L178 53 L212 91 L244 74 L237 127Z" fill="url(#gold)" stroke="#a86c34" stroke-width="6"/>'+
'<circle cx="113" cy="78" r="9" fill="#fff6ad" stroke="#ce9d39" stroke-width="3"/>'+
'<circle cx="179" cy="52" r="11" fill="#ffcae1" stroke="#ce9d39" stroke-width="3"/>'+
'<circle cx="246" cy="74" r="9" fill="#ffcf66" stroke="#ce9d39" stroke-width="3"/>'+
'<path d="M120 112 Q181 122 236 110" stroke="#fff0b9" stroke-width="9" fill="none"/>'+
'<circle cx="181" cy="111" r="9" fill="#fc7299" stroke="#ffe2b5" stroke-width="4"/>';
const omuPrincess='<g>'+shadow+limbs+
'<path d="M97 287 Q62 324 71 347 Q179 412 286 346 Q298 320 260 284Z" fill="url(#royal)" stroke="#b64f7c" stroke-width="6"/>'+
'<path d="M91 322 Q178 374 270 322" fill="none" stroke="#fff2df" stroke-width="24" stroke-linecap="round"/>'+
'<path d="M88 347 Q176 390 274 347" fill="none" stroke="#ffcbdc" stroke-width="17" stroke-linecap="round"/>'+
eggBase+crown+winks+
'<path d="M267 304 Q305 263 317 173" stroke="#c99431" stroke-width="11" stroke-linecap="round" fill="none"/>'+
'<path d="M317 163 C285 137 296 107 318 120 C340 98 362 130 333 151Z" fill="#ff7baa" stroke="#ffdfb8" stroke-width="7"/>'+
'<path d="M172 303 Q147 315 159 327 Q176 332 182 318 Q194 332 205 323 L200 305Z" fill="#fff5f4" stroke="#cf92b1" stroke-width="3"/>'+
glimmer+'</g>';
const omuAdventurer='<g>'+shadow+limbs+
'<path d="M115 272 Q73 304 48 316 Q106 325 136 304Z" fill="#d74447" stroke="#92383c" stroke-width="4"/>'+
'<path d="M237 278 Q300 313 326 310 Q289 275 258 247Z" fill="#ed5959" stroke="#963e46" stroke-width="5"/>'+
eggBase+face+
'<path d="M148 300 L177 321 L205 300 L189 292 L175 301 L161 292Z" fill="#edb83d" stroke="#bd8d35" stroke-width="3"/>'+
'<path d="M118 179 Q171 149 228 179" stroke="#a92f38" stroke-width="13" stroke-linecap="round" fill="none"/>'+
'<path d="M211 178q10 29 24 25" stroke="#a92f38" stroke-width="10" fill="none" stroke-linecap="round"/>'+
'<path d="M155 138 L157 97 L221 101 L226 155Z" fill="#fff7db" stroke="#e6b27e" stroke-width="4"/>'+
'<path d="M156 100 L214 105" stroke="#c97f54" stroke-width="5"/>'+
'<path d="M170 96 Q176 109 186 96 Q192 86 202 99 Q191 116 185 119 Q172 113 170 96" fill="#ef6171"/>'+
glimmer+'</g>';
const wave='<g>'+shadow+
'<path d="M27 236 Q62 112 138 131 Q165 67 221 98 Q292 88 333 178 Q285 151 254 178 Q244 135 197 160 Q183 116 152 195 Q110 173 90 235Z" fill="#74c9ed" stroke="#216baf" stroke-width="12"/>'+
'<path d="M18 266 Q64 206 107 233 Q136 196 177 223 Q207 171 248 202 Q299 204 348 260 Q311 243 284 280 Q247 254 211 285 Q159 244 121 301 Q72 259 18 266" fill="url(#wagashi)" stroke="#2a80b2" stroke-width="10"/>'+
'<path d="M72 221 Q106 199 138 217 M196 185 Q222 159 260 180 M272 226 Q295 213 320 231" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round"/>'+
'<path d="M119 293 Q86 322 80 350 M228 298 Q264 334 272 353" fill="none" stroke="#174d79" stroke-width="16" stroke-linecap="round"/>'+
'<path d="M138 208 Q179 183 222 208 Q244 232 239 270 Q198 314 143 291 Q105 252 138 208Z" fill="#f8e5be" stroke="#d69e67" stroke-width="8"/>'+
'<path d="M132 211 Q177 170 235 205 L225 224 Q174 200 140 227Z" fill="#1b6497"/>'+
'<path d="M126 231 Q181 217 239 232" fill="none" stroke="#fff" stroke-width="8"/>'+
'<ellipse cx="156" cy="252" rx="7" ry="12" fill="#243e61"/><ellipse cx="218" cy="248" rx="7" ry="12" fill="#243e61"/>'+
'<path d="M167 271 Q187 284 207 264" fill="none" stroke="#953f4c" stroke-width="5" stroke-linecap="round"/>'+
'<path d="M223 287 Q272 288 314 237" fill="none" stroke="#bd8452" stroke-width="12" stroke-linecap="round"/>'+
'<path d="M311 236 L336 182 L337 249" fill="#d8bd72" stroke="#866435" stroke-width="6"/>'+
'<path d="M109 291 Q90 306 73 295" stroke="#e4c4a4" stroke-width="13" stroke-linecap="round"/>'+
glimmer+'</g>';
const newton='<g>'+shadow+limbs+
'<path d="M106 287 Q177 335 246 286 L255 345 Q175 387 103 348Z" fill="#3c6a7a" stroke="#234951" stroke-width="7"/>'+
'<path d="M100 201 Q62 163 92 125 Q116 105 139 131 Q174 97 207 123 Q236 101 256 139 Q278 160 253 194" fill="#f4e6d3" stroke="#c6a788" stroke-width="7"/>'+
'<path d="M92 198 Q81 227 97 251 Q73 269 99 296 M263 194 Q282 220 263 241 Q294 264 262 290" fill="none" stroke="#e8d4b8" stroke-width="25" stroke-linecap="round"/>'+
'<path d="M175 149 C117 112 81 160 92 216 C61 282 110 312 176 303 C235 321 298 267 264 211 C273 158 227 131 175 149Z" fill="url(#apple)" stroke="#ad3539" stroke-width="8"/>'+
'<path d="M181 146 Q175 123 190 107" stroke="#704e37" stroke-width="12" stroke-linecap="round"/>'+
'<path d="M180 139 Q208 116 223 127 Q213 145 180 139" fill="#62a754" stroke="#38733b" stroke-width="4"/>'+
face+
'<path d="M90 304 L135 301 L148 358 L87 357Z" fill="#71472d" stroke="#d7b786" stroke-width="5"/>'+
'<path d="M96 307 L133 310 M99 326 L136 327" stroke="#f6dbaa" stroke-width="4"/>'+
'<path d="M267 303 Q283 281 297 261" stroke="#70452b" stroke-width="7" stroke-linecap="round"/>'+
'<path d="M297 263 Q328 247 316 227" fill="none" stroke="#fff8db" stroke-width="6"/>'+
glimmer+'</g>';
const rice='<g>'+shadow+limbs+
'<path d="M182 71 C146 92 72 179 67 247 C54 317 93 347 183 345 C277 352 308 299 291 240 C269 156 215 88 182 71Z" fill="#fffbed" stroke="#d9e4d6" stroke-width="7"/>'+
'<path d="M104 249 L259 243 L260 324 Q182 349 103 326Z" fill="#39474b" stroke="#2e3437" stroke-width="5"/>'+
'<path d="M103 271 L259 267" stroke="#566765" stroke-width="5" opacity=".7"/>'+
'<ellipse cx="135" cy="206" rx="10" ry="13" fill="#41383c"/><ellipse cx="220" cy="206" rx="10" ry="13" fill="#41383c"/>'+
'<circle cx="132" cy="202" r="4" fill="white"/><circle cx="216" cy="202" r="4" fill="white"/>'+
'<ellipse cx="101" cy="232" rx="19" ry="9" fill="#f7a5a7" opacity=".8"/><ellipse cx="252" cy="232" rx="19" ry="9" fill="#f7a5a7" opacity=".8"/>'+
'<path d="M154 223q23 23 43-1" fill="none" stroke="#8e4e59" stroke-width="7" stroke-linecap="round"/>'+
'<g fill="#e6ebd7" opacity=".55"><ellipse cx="125" cy="154" rx="8" ry="5"/><ellipse cx="183" cy="126" rx="11" ry="6"/><ellipse cx="225" cy="173" rx="8" ry="5"/></g>'+glimmer+'</g>';
const genericBodies={
  fruit:'<path d="M176 132 C107 95 66 158 78 242 C68 309 118 344 177 338 C240 351 303 296 280 234 C290 158 248 96 176 132Z" fill="BODY" stroke="EDGE" stroke-width="9"/><path d="M174 134 Q174 113 188 96" fill="none" stroke="#785a47" stroke-width="12" stroke-linecap="round"/><path d="M180 120 Q212 91 232 109 Q214 131 180 120" fill="#73af66" stroke="#407c4b" stroke-width="5"/>',
  bread:'<path d="M91 166 Q66 120 110 97 Q160 80 207 99 Q280 82 278 169 L267 330 Q172 364 88 329Z" fill="BODY" stroke="EDGE" stroke-width="10"/><path d="M107 164 Q176 148 259 168" stroke="#fff0c1" stroke-width="12" fill="none"/>',
  soup:'<path d="M71 190 Q176 143 285 190 L269 304 Q178 362 86 304Z" fill="BODY" stroke="EDGE" stroke-width="10"/><ellipse cx="180" cy="190" rx="112" ry="30" fill="#fff1cb" stroke="EDGE" stroke-width="9"/><path d="M101 180 Q132 174 155 181 M196 179 Q224 170 249 182" stroke="#ffe7aa" stroke-width="11" fill="none"/>',
  veggie:'<path d="M171 108 C129 133 76 172 79 250 C86 322 116 348 180 346 C247 346 286 307 282 239 C275 172 233 133 171 108Z" fill="BODY" stroke="EDGE" stroke-width="9"/><path d="M171 109 Q136 66 125 97 Q135 125 171 110 Q194 68 222 86 Q217 124 171 110" fill="#7ca95f" stroke="#4d824d" stroke-width="6"/>',
  sweets:'<path d="M104 157 Q114 116 180 118 Q254 117 258 157 L283 247 Q271 328 180 346 Q85 328 76 246Z" fill="BODY" stroke="EDGE" stroke-width="9"/><path d="M98 160 Q174 141 260 161" fill="none" stroke="#fff6c9" stroke-width="16" stroke-linecap="round"/>',
  flower:'<g fill="BODY" stroke="EDGE" stroke-width="5">'+Array.from({length:12},(_,i)=>'<ellipse cx="181" cy="115" rx="24" ry="76" transform="rotate('+(i*30)+' 181 212)"/>').join('')+'</g><circle cx="181" cy="210" r="77" fill="#9e6540" stroke="#6c5334" stroke-width="8"/>'
};
function archetypeFor(card){
  const id=card.id+' '+card.food;
  if(/pan|bread|toast|croissant|パン|めん|パスタ/.test(id))return 'bread';
  if(/miso|coffee|tea|milk|soup|ramen|お茶|飲み物|汁物/.test(id))return 'soup';
  if(/sunflower|flower|ひまわり/.test(id))return 'flower';
  if(/carrot|tomato|potato|cucumber|corn|pumpkin|野菜|かぼちゃ/.test(id))return 'veggie';
  if(/cake|pudding|jelly|parfait|sweets|だんご|菓子|ゼリー|もち/.test(id))return 'sweets';
  return 'fruit';
}
const shades={
  fruit:['#f9a5a4','#d85269'],
  veggie:['#f5ae6d','#ce7c4d'],
  bread:['#ffdc92','#be7e4a'],
  soup:['#f1caa0','#a9876b'],
  sweets:['#f8bcd8','#ca75aa'],
  flower:['#ffd059','#cd8936']
};
function generic(card){
  const type=archetypeFor(card),colors=shades[type];
  let body=genericBodies[type].replaceAll('BODY',colors[0]).replaceAll('EDGE',colors[1]);
  let outfit='';
  if(card.style==='person')outfit='<path d="M100 298 Q179 315 263 296 L258 353 Q178 373 108 351Z" fill="#5f84aa" stroke="#486683" stroke-width="6"/>'+
    '<path d="M176 297 L164 323 L177 339 L191 320Z" fill="#f8e5bb"/>';
  else if(card.style==='mixed')outfit='<path d="M106 296 Q175 310 249 299 L258 327 Q180 350 102 329Z" fill="#be7285" stroke="#a45675" stroke-width="5"/>'+
    '<path d="M155 310 L180 336 L201 311" fill="#f5e7bd" stroke="#aa6780" stroke-width="3"/>';
  const accessory=card.figure?'<path d="M100 137 Q177 104 250 139 L253 151 Q177 134 101 151Z" fill="#594d79" stroke="#e0bd80" stroke-width="5"/>'+
    '<path d="M102 148 Q178 155 258 146" fill="none" stroke="#e8c67c" stroke-width="5"/>':'';
  return '<g>'+shadow+limbs+body+outfit+accessory+face+glimmer+'</g>';
}
export function illustratedCardSvg(card){
  let character;
  if(card.id==='omu_ichika_ssr')character=omuPrincess;
  else if(card.id==='omu_ketchup_r')character=omuAdventurer;
  else if(card.id==='hokusai_wave_ssr')character=wave;
  else if(card.id==='newton_apple_sr')character=newton;
  else if(card.id==='rice_n')character=rice;
  else if(card.food==='オムライス')character=card.rarity==='SSR'?omuPrincess:omuAdventurer;
  else character=generic(card);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 430" role="img" aria-hidden="true">'+defs+character+'</svg>';
}
