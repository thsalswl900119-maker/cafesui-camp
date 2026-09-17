const KEY='cafe-brand-open';
// 아티팩트 안에서는 파일 내려받기와 바깥 통신이 막혀 있습니다.
// 아티팩트의 실제 주소는 claude.ai가 아니라 ...frame.claudeusercontent.com 입니다 (직접 확인).
const IN_ARTIFACT = /claude\.ai$|claudeusercontent\.com$/.test(location.hostname);
const CAN_DL = !IN_ARTIFACT;
const EMPTY={day:0,open:{0:1},ans:{},checks:{},memo:{},at:{},ex:{},me:null};
let st=load(), tmr=null;
function load(){try{const r=localStorage.getItem(KEY);if(r)return Object.assign({},EMPTY,JSON.parse(r))}catch(e){}return JSON.parse(JSON.stringify(EMPTY))}
function save(){clearTimeout(tmr);sv('저장 중…');tmr=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(st));sv('저장됨')}catch(e){sv('저장 실패')}},400)}
function sv(t){const e=document.querySelector('#saved span');if(e)e.textContent=t}
const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const today=()=>{const d=new Date();return (d.getMonth()+1)+'/'+d.getDate()};

// 교시 완료 = 그 교시 답 칸을 다 적음
const pDone=(d,i)=>DAYS[d].p[i].f.every(f=>(st.ans[f.k]||'').trim());
const dCnt=d=>DAYS[d].p.filter((_,i)=>pDone(d,i)).length;
const gCnt=g=>PREP[g].items.filter((_,j)=>st.checks[g+'-'+j]).length;
const PTOT=PREP.reduce((n,g)=>n+g.items.length,0);

// 메타 프롬프팅: {키} → 내가 적은 답
// 답 칸 사전 (키 → 그 칸의 설명·예시)
const FLD={}; DAYS.forEach(d=>d.p.forEach(p=>p.f.forEach(f=>FLD[f.k]=f)));
// 프롬프트마다 「내 답 / 예시 답」 중 무엇으로 볼지 (저장하지 않습니다)
const PM={};
// 메타 프롬프팅: {키} → 내가 적은 답. 예시 모드면 빈 칸만 예시 답으로 메웁니다.
function fill(body,useEx){return body.replace(/\{(\w+)\}/g,(m,k)=>{
  const v=(st.ans[k]||'').trim(); if(v) return v;
  if(useEx&&FLD[k]&&FLD[k].ex) return FLD[k].ex.trim();
  return '(아직 없음)';
})}
// 그 프롬프트가 쓰는 칸 중 내가 적은 것 / 전체
function pKeys(body){return [...new Set([...body.matchAll(/\{(\w+)\}/g)].map(x=>x[1]))]}
// 그 칸을 쓰는 프롬프트는 「내 답」 모드로 되돌립니다 — 지우면 프롬프트에서도 지워지도록
function offPM(k){for(const id in PB){ if(PM[id] && PB[id].indexOf('{'+k+'}')>=0) PM[id]=false }}
// 빈 칸이 다 채워지면 예시 모드는 저절로 풀립니다 (내 답이 곧 프롬프트이므로)
function syncPM(id,body){const q=pStat(body); if(PM[id]&&q.t&&q.n===q.t) PM[id]=false; return q}
function pStat(body){const ks=pKeys(body); return {n:ks.filter(k=>(st.ans[k]||'').trim()).length, t:ks.length,
  miss:ks.filter(k=>!(st.ans[k]||'').trim()).map(k=>(FLD[k]&&FLD[k].p)||k)}}

function jbar(){
  let h='';
  DAYS.forEach((d,i)=>h+=`<div class="jseg" title="${d.n} ${dCnt(i)}/5"><i style="width:${dCnt(i)/5*100}%"></i></div>`);
  PREP.forEach((g,i)=>h+=`<div class="jseg p" title="${esc(g.n+'. '+g.name)} ${gCnt(i)}/${g.items.length}"><i style="width:${gCnt(i)/g.items.length*100}%"></i></div>`);
  document.getElementById('jbar').innerHTML=h;
}
function tabs(){
  document.getElementById('tabs').innerHTML=DAYS.map((d,i)=>
    `<button class="tab d${i+1}${st.day===i?' on':''}" data-d="${i}">${d.n}<span>${esc(d.title.split('—')[1]||'').trim()}</span><span class="cnt">${dCnt(i)}/5 적음</span></button>`).join('');
}
const LESSON={1:`<details class="lesson"><summary>원가와 손익, 쉽게 — 먼저 읽고 시작</summary><div class="lbody">
<p><b>원가율 = 재료비 ÷ 판매가.</b> 7,500원 케이크의 재료비가 2,600원이면 34.7%입니다. 재료비는 그 메뉴 하나에 들어간 재료와 포장만. 인건비·월세는 따로 봅니다.</p>
<table><tr><th>메뉴</th><th class="r">통상 원가율</th><th>뜻</th></tr>
<tr><td>커피·음료</td><td class="r">20~30%</td><td>음료가 돈을 남기는 이유</td></tr>
<tr><td>디저트·베이커리</td><td class="r">30~40%</td><td>과일·버터·생크림이 비쌈. 35% 넘으면 점검</td></tr>
<tr><td>케이크 카페 목표</td><td class="r"><b>30~35%</b></td><td>35% 이하 초록 · 45% 이하 노랑 · 그 위 빨강</td></tr></table>
<p><b>매출 100만 원이 들어오면</b> — 재료비 30~35만 · 인건비 20~30만(혼자 해도 내 월급 포함) · 월세 10~15만(15% 넘으면 위험) · 공과금 5~8만 · 수수료 3~10만 · <b>남는 돈 10~20만</b>.</p>
<p><b>손익은 네 줄</b> — 매출 − 매출원가(재료·포장) − 고정비(월세·인건비·보험) − 변동비(공과금·수수료·광고) = 영업이익.</p></div></details>`,
2:`<details class="lesson"><summary>브랜딩 기초 — 먼저 읽고 시작</summary><div class="lbody">
<p><b>브랜딩</b>은 손님 머릿속에 남는 우리 가게의 인상입니다. 로고 하나가 아니라 여덟 가지가 모여 만들어집니다 — ① 이름 ② 로고와 색 ③ 말투 ④ 공간 ⑤ 시그니처 메뉴 ⑥ 사장의 태도 ⑦ 작은 물건(포장·영수증·카드) ⑧ 손님 경험.</p>
<p><b>브랜딩과 마케팅은 다릅니다.</b> 브랜딩은 우리가 누구인지 정하고 지키는 것(안), 마케팅은 그것을 알리는 것(밖). <b>브랜딩이 먼저</b>입니다. 브랜딩 없이 마케팅만 하면 광고비는 나가는데 손님이 "그래서 거기가 뭐 하는 데지?"라고 합니다.</p>
<p><b>마케팅은 이 순서로</b> — ① 첫 손님 10명을 기억에 남게 대접 ② 그 손님이 친구에게 할 한 문장 만들기 ③ 리뷰 부탁(스마트플레이스·인스타) ④ 인스타는 주제 3개로 꾸준히(팔로워보다 저장·DM) ⑤ 광고는 마지막에 소액으로.</p></div></details>`,
3:`<details class="lesson"><summary>상권을 조사하는 사이트 세 곳 — 쓰는 법</summary><div class="lbody">
<p>세 곳 다 <b>무료</b>이고, 아래 순서대로 30분이면 이 교시의 칸을 다 채울 수 있습니다. ①은 <b>사람이 어디에 있나</b>, ②는 <b>무엇을 찾고 있나</b>, ③은 <b>그 말을 몇 명이나 검색하나</b>를 봅니다.</p>
<table><tr><th>사이트</th><th>무엇을 보는 곳</th><th>어느 칸에 옮겨 적나</th></tr>
<tr><td><b>① 소상공인365</b></td><td>그 동네에 사람이 몇 명 살고 몇 명 지나가나, 카페가 몇 곳인가</td><td>유동인구 · 주요 고객층 · 주변 경쟁 카페</td></tr>
<tr><td><b>② 네이버 데이터랩</b></td><td>어떤 단어가 뜨는 중인지 1년 흐름</td><td>트렌드 키워드(1교시) · 콘셉트 키워드</td></tr>
<tr><td><b>③ 마피아넷</b></td><td>그 단어를 한 달에 몇 명이 검색하는지 실제 숫자</td><td>메뉴 이름 · 해시태그 · 스마트플레이스 키워드</td></tr></table>
<p><b>① 소상공인365</b> (bigdata.sbiz.or.kr) — 위쪽 <b>「상권분석」</b> → 지도에서 들어갈 동네를 찍고 <b>반경 500m</b>로 영역을 그립니다 → <b>「분석하기」</b>.
보고서에서 딱 네 가지만 적어 오세요. ⑴ <b>유동인구</b>의 요일·시간대 그래프에서 <b>제일 높은 시간 두 개</b> ⑵ <b>주거·직장 인구</b>에서 많은 나이대 ⑶ <b>업종분석 → 커피·음료</b>의 가게 수와 늘고 있는지 줄고 있는지 ⑷ <b>매출분석</b>의 커피·음료 월평균 매출과 잘 팔리는 시간대. 첫 화면과 「간단분석」은 로그인 없이 보입니다(직접 확인했습니다). 상세분석 등 일부는 로그인을 요구할 수 있습니다. PDF로 저장해 두면 나중에 사업계획서에 그대로 씁니다.</p>
<p><b>② 네이버 데이터랩</b> (datalab.naver.com) — <b>「검색어트렌드」</b>에 내 키워드를 넣고 기간을 <b>1년 이상</b>으로 봅니다. 주제어 칸에 <b>서로 비교할 단어를 2~5개</b> 넣는 게 핵심입니다(예: 소금빵 / 크루키 / 말차). <b>선이 올라가는 것</b>만 내 것으로 삼고, 내려가는 것은 피합니다. 아래 <b>기기별·성별·연령</b>을 켜면 내 대표 고객 나이대가 진짜 그 단어를 찾는지 보입니다. 주의 — 여기 숫자는 <b>최고치를 100으로 놓은 상대값</b>이라 "몇 명"이 아닙니다. 그 숫자는 ③에서 봅니다.</p>
<p><b>③ 마피아넷</b> (ma-pia.net) — 네이버 검색광고 자료를 쉽게 보여 주는 곳입니다. <b>「키워드 검색량 조회」</b>에 단어를 넣으면 <b>한 달에 PC·모바일에서 몇 번 검색됐는지</b> 실제 숫자가 나옵니다(한 번에 100개까지). <b>「연관 키워드」</b>에는 사람들이 같이 찾는 말이 딸려 나옵니다.
이렇게 쓰세요 — ⑴ <b>"명지카페", "명지 디저트"처럼 「동네+업종」</b>을 넣어 내 동네를 찾는 사람이 한 달에 몇 명인지 봅니다 ⑵ 연관 키워드에서 <b>검색은 있는데 글이 적은 말</b>을 골라 인스타 해시태그·스마트플레이스 소개글에 씁니다 ⑶ 메뉴 이름 후보를 넣어 <b>사람들이 실제로 쓰는 말</b>로 정합니다(예: "생크림케이크" 대 "프레시크림케이크").</p>
<p><b>고르는 법 — 숫자 하나만 보지 않습니다.</b> <b>검색량은 「수요」</b>(찾는 사람이 얼마나 되나), <b>블로그 문서수는 「공급」</b>(이미 쓴 글이 얼마나 되나)입니다. 둘을 같이 봐야 실제로 내가 올라갈 수 있는 말이 보입니다.
<b>검색량이 제일 큰 말은 대개 대형 업체가 차지하고 있습니다.</b> 그래서 동네 가게는 <b>단어를 2~3개로 길게</b> 씁니다 — "카페"(경쟁 셈) → "명지 카페"(좁아짐) → <b>"명지 케이크 카페"</b>(찾는 사람은 적지만 <b>올 사람만 찾는 말</b>). 검색량이 큰 말 하나보다, <b>검색량이 있으면서 글이 적은 말 여러 개</b>가 낫습니다.
"몇 이상이면 좋다"는 <b>절대 기준은 없습니다.</b> 동네 크기에 따라 다릅니다 — 내 동네 이름을 넣어 본 숫자가 곧 내 기준입니다. 그 숫자를 적어 두고, 3개월 뒤 다시 재서 늘었는지 보세요.</p>
<p><b>세 곳을 다 보고 나면</b> 이렇게 한 줄이 나옵니다 — "명지동은 저녁 6~8시에 30~40대가 가장 많이 지나가고, 이들이 찾는 말은 「명지카페」(월 1,200회)·「명지 케이크」(월 380회)인데 케이크 전문점은 아직 없다." 이 한 줄이 아래 칸들의 답입니다.</p></div></details>`,
4:`<details class="lesson"><summary>이 돈은 어디에 적어야 하나 — 계정 항목</summary><div class="lbody">
<p>손익계산서를 쓸 때 <b>「이 지출을 어느 칸에 넣지?」</b>에서 막힙니다. 아래가 그 답입니다. <b>변동비</b>는 많이 팔면 같이 늘어나는 돈, <b>고정비</b>는 손님이 없어도 나가는 돈입니다.</p>
<table><tr><th colspan="2">변동비 — 음식 하나 파는 데 직접 관계있는 비용</th></tr>
<tr><td><b>매출원가</b> 식재료</td><td>가공식품, 육류, 어류, 야채, 농산, 기타 식재료</td></tr>
<tr><td><b>매출원가</b> 음료·주류</td><td>음료, 와인, 전통주, 맥주, 소주 등</td></tr>
<tr><td><b>매출원가</b> 부자재</td><td>음식 포장용기</td></tr>
<tr><td><b>수도광열비</b></td><td>전기요금 · 가스요금 · 수도요금</td></tr>
<tr><td>소모품·비품비</td><td>주방용품, 청소용품, 사무용품</td></tr>
<tr><td>수선비</td><td>유형자산 수리비, 세탁비</td></tr>
<tr><td>카드수수료</td><td>카드가맹점 수수료</td></tr>
<tr><td>배달관련비</td><td>배달마케팅, 결제정산수수료, 중개이용료</td></tr>
<tr><td>부가가치세예수금</td><td>부가가치세에 해당하는 부분으로 <b>나중에 납부해야 하는 금액</b></td></tr></table>
<table><tr><th colspan="2">고정비 — 음식 하나를 파는 것과 직접 관계 없는 비용</th></tr>
<tr><td><b>인건비</b> 정직원</td><td>임금, 상여금</td></tr>
<tr><td><b>인건비</b> 일용직</td><td>아르바이트 임금</td></tr>
<tr><td><b>인건비</b> 퇴직급여</td><td>퇴직금</td></tr>
<tr><td>임차료</td><td>건물임차료, 창고임차료</td></tr>
<tr><td>감가상각비</td><td>상표권, 영업권, 특허권, 시설투자비(5년 사용 기준), 대출이자</td></tr>
<tr><td>지급수수료</td><td>세무기장료, 중개수수료, 배달비용, 택배용역료, 비품관리비, 청소용역료, 벌레퇴치용역비, 보안업체용역비, 조경비</td></tr>
<tr><td>세금과공과금</td><td>등록면허세, 지방소득세 등</td></tr>
<tr><td>광고선전비</td><td>전단지, 인스타그램 광고비, 쿠폰, 기타 SNS 광고비, 카카오 친구톡, 옥외광고, 신문, 잡지</td></tr>
<tr><td>통신비</td><td>포스비, 전화요금, 인터넷사용료, 팩스요금, 우편</td></tr>
<tr><td>환경처리비</td><td>음식물쓰레기봉투, 정화조요금</td></tr>
<tr><td>보험</td><td>4대 보험비, 화재보험</td></tr>
<tr><td>복리후생비</td><td>회식비, 간식비, 식비</td></tr>
<tr><td>도서인쇄비</td><td>메뉴판, 명함, 시트, 전단지 제작비, 도서구입비, 복사비, 정기구독료, 인쇄 및 제작</td></tr>
<tr><td>교제비</td><td>접대비, 선물대, 영업활동교제비</td></tr>
<tr><td>여비교통비</td><td>시내교통비, 국내출장비, 해외출장비, 폐점교통비</td></tr>
<tr><td>교육훈련비</td><td>직원 자기계발비</td></tr>
<tr><td>조사연구비</td><td>자료조사비, 자료조사 시 경비, 메뉴개발비(신메뉴 개발에 필요한 식자재 구입)</td></tr></table>
<p><b>꼭 기억할 것 두 가지.</b> ① <b>부가가치세예수금은 내 돈이 아닙니다.</b> 손님에게 받아 두었다가 나라에 낼 돈이라, 통장에 있어도 쓰면 안 됩니다. ② <b>혼자 해도 「내 월급」을 인건비에 넣으세요.</b> 안 넣으면 남는 것처럼 보이지만 실제로는 내 몸값을 공짜로 넣고 있는 겁니다.</p>
<p>내려받은 <b>손익계산서 엑셀의 「계정항목」 시트</b>에 이 표가 그대로 들어 있습니다. 매달 적을 때 그 시트를 보면서 넣으면 됩니다.</p></div></details>`};

let PB={};   // 프롬프트 원문 (칸에 적을 때마다 다시 채워 넣습니다)

// ── 색 코드 자동 읽기 ─────────────────────────────
// 답 칸에 #RRGGBB를 적으면 실제 색·이름·대비를 바로 보여 줍니다.
function hexes(t){
  const out=[], seen={};
  (t||'').replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g,(m,h)=>{
    if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    h=h.toUpperCase(); if(!seen[h]){seen[h]=1; out.push(h)} return m});
  return out.slice(0,8);
}
function rgb(h){return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function lum(h){const c=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function ratio(a,b){const l1=lum(a),l2=lum(b),h=Math.max(l1,l2),o=Math.min(l1,l2);return (h+.05)/(o+.05)}
function hsl(h){let [r,g,b]=rgb(h).map(v=>v/255);
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; let H=0;
  if(d){ H = mx===r ? ((g-b)/d+(g<b?6:0)) : mx===g ? ((b-r)/d+2) : ((r-g)/d+4); H*=60 }
  const L=(mx+mn)/2, S=d===0?0:d/(1-Math.abs(2*L-1));
  return [H,S,L];
}
function colorName(h){
  const [r,g,b]=rgb(h), mx=Math.max(r,g,b), mn=Math.min(r,g,b), ch=mx-mn;  // ch = 색의 진하기(0~255)
  const [H,S,L]=hsl(h);
  const hue = H<8?'빨강':H<20?'주홍':H<45?'주황':H<57?'머스터드 · 황토':H<70?'노랑':H<100?'연두':H<150?'초록':H<178?'청록':H<198?'민트':H<215?'하늘':H<255?'파랑':H<272?'남색':H<292?'남보라':H<320?'보라':H<345?'자주':'분홍';
  // ① 색기 거의 없음 — 흰·검·회색
  if(ch<16) return L>.93?'흰색':L>.85?'거의 흰색':L<.10?'검정':L<.20?'거의 검정':L>.60?'밝은 회색':L<.38?'어두운 회색':'회색';
  // ② 아주 밝은 색 — 크림·파스텔
  if(L>.86) return (H>=20&&H<70) ? '크림 · 아이보리'
    : '아주 연한 ' + (H<20?'분홍':H<100?'연두':H<150?'민트':H<215?'하늘':H<292?'라벤더':'분홍');
  // ③ 아주 어두운 색
  if(L<.20) return (H>=15&&H<50) ? '아주 어두운 갈색' : '아주 어두운 ' + hue;
  // ④ 카페에서 자주 쓰는 이름
  if(H>=15&&H<50&&ch<110) return L<.40?'초콜릿 브라운':L<.62?'브라운 · 갈색':'베이지 · 모래빛';
  if(H>=8&&H<22&&L>=.45&&L<=.75) return ch<110?'탁한 코럴':'코럴 · 살구빛';
  if(H>=60&&H<105&&ch<100) return L>.50?'세이지 그린':'올리브 그린';
  if(H>=105&&H<160&&ch<100) return L>.55?'연한 초록':'짙은 초록';
  // ⑤ 나머지
  const light = L>.72?'연한 ':L<.35?'어두운 ':'';
  const sat = light?'':(ch<70?'탁한 ':ch>200?'쨍한 ':'');
  return light+sat+hue;
}

function useWhite(h){ return ratio(h,'FFFFFF') >= ratio(h,'000000') }
// 메뉴판 미리보기에 쓸 「메뉴명 가격」 — 내가 적은 첫 메뉴에서 뽑습니다
function menuSample(){
  const t=(st.ans.menu3||st.ans.sig3||'').trim();
  if(t){
    const line=t.split('\n').find(l=>l.trim())||'';
    const parts=line.replace(/^\s*\d+[.)]\s*/,'').split('/').map(x=>x.trim()).filter(Boolean);
    const nm=parts[0]||'', pr=parts.find(x=>/[0-9][0-9,]*\s*원/.test(x))||'';
    if(nm) return (nm.slice(0,14)+(pr?'  '+pr.match(/[0-9][0-9,]*\s*원/)[0]:'')).trim();
  }
  return '메뉴 이름  0,000원';
}
function swatchHTML(list){
  if(!list.length) return '';
  const cards = list.map(h=>{
    const w=useWhite(h), fg=w?'#fff':'#111', r=ratio(h,w?'FFFFFF':'000000');
    const ok = r>=4.5?['읽기 좋음','ok']:r>=3?['큰 글씨만','warn']:['글씨 올리지 마세요','bad'];
    return `<div class="swc"><div class="swb" style="background:#${h};color:${fg}">가나다 Aa</div>
      <div class="swm"><b>#${h}</b><span>${esc(colorName(h))}</span>
      <span class="swt ${ok[1]}">${w?'흰 글씨':'검은 글씨'} · ${ok[0]}</span></div></div>`;
  }).join('');
  const a=list[0], b=list[1]||list[0], c=list[2]||list[0];
  const sign = useWhite(a)?'#fff':'#111';
  return `<div class="sw"><div class="swh">🎨 적어 주신 색 — 실제로 이렇게 보입니다</div>
    <div class="swl">${cards}</div>
    <div class="swp">
      <div class="pv" style="background:#${a};color:${sign}"><b>간판</b><span>${esc((st.ans.name||'내 카페').trim().slice(0,12)||'내 카페')}</span></div>
      <div class="pv" style="background:#${b};color:${useWhite(b)?'#fff':'#111'}"><b>메뉴판 배경</b><span>${esc(menuSample())}</span></div>
      <div class="pv" style="background:#${b};color:${useWhite(b)?'#fff':'#111'};border:3px solid #${c}"><b>포인트</b><span>테두리·버튼에</span></div>
    </div>
    <div class="swn">대비는 밝기 차이입니다. <b>4.5 이상</b>이어야 작은 글씨도 읽힙니다. 「글씨 올리지 마세요」가 뜨면 그 색은 배경으로만 쓰고 글씨는 다른 색으로 하세요. 화면과 인쇄·간판은 색이 다르게 나오니 <b>실물 샘플을 꼭 확인</b>하세요.</div></div>`;
}

// 용어 설명 — 어려운 말이 나오는 교시에만 붙습니다
function termBox(list){
  const ok=list.filter(t=>TERMS[t]); if(!ok.length) return '';
  return `<div class="tms"><div class="tmh">🔤 이 교시에 나오는 말</div>${ok.map(t=>
    `<div class="tm"><b>${esc(t)}</b><span>${esc(TERMS[t]).replace(/\n/g,'<br>')}</span></div>`).join('')}</div>`;
}
// 프롬프트 위에 붙는 상태 줄 — 몇 칸 채웠는지, 비었으면 무엇이 비었는지
function pStatHTML(id,body){
  const st2=pStat(body), ex=!!PM[id];
  if(!st2.t) return '';
  if(ex) return `<span class="ps ex">👁 예시 답으로 채운 모습입니다</span>
    <span class="pn">빈 칸만 예시로 메웠습니다. <b>지금 복사하면 예시가 복사됩니다.</b> 어떻게 쓰는지 보는 용도예요</span>`;
  if(st2.n===st2.t) return `<span class="ps ok">✓ 필요한 답 ${st2.t}개를 다 적었습니다 — 그대로 복사하세요</span>`;
  return `<span class="ps no">${st2.t}개 중 ${st2.n}개 적음</span>
    <span class="pn">아직 빈 칸: <b>${esc(st2.miss.slice(0,3).join(' · '))}</b>${st2.miss.length>3?` 외 ${st2.miss.length-3}개`:''}.
    비워 두면 「(아직 없음)」으로 들어가서 AI가 제대로 답하지 못합니다 — 위 칸을 먼저 채우거나, <b>「예시 답으로 보기」</b>로 완성된 모습을 보세요</span>`;
}
function renderDay(){
  const d=DAYS[st.day], done=dCnt(st.day); PB={}; let seq=0;
  let h=`<div class="dh"><h3>${d.n} · ${esc(d.title)}</h3><p>${esc(d.goal)}</p>
   <div class="dp"><span id="dayCnt">${done}/5 교시 적음</span><div class="tr"><div class="fi" id="dayFill" style="width:${done/5*100}%"></div></div><span id="dayPct">${Math.round(done/5*100)}%</span></div>
   <button class="rp-btn" id="dayReport">📄 ${d.n} 보고서 만들기</button>
   <div class="rp-hint" id="dayHint"></div></div>`;
  d.p.forEach((p,i)=>{
    h+=`<div class="card d${st.day+1}"><div class="ph"><div class="num" id="mk${st.day}-${i}">${pDone(st.day,i)?'✓':p.no}</div><div>
      <h4>${esc(p.t)}</h4><div class="topic">${esc(p.topic)}</div>
      ${p.result?`<div class="result">${esc(p.result)}</div>`:''}</div></div>`;
    if(p.tm) h+=termBox(p.tm);
    if(p.lesson) h+=[].concat(p.lesson).map(n=>LESSON[n]||'').join('');
    if(p.links) h+=`<div class="links">${p.links.map(l=>`<a href="${l[1]}" target="_blank" rel="noopener">${esc(l[0])} ↗</a>`).join('')}</div>`;
    if(p.files) h+=`<div class="files">${p.files.map(f=>CAN_DL
      ? `<a class="dl" href="${f[1]}" download><b>⬇ ${esc(f[0])}</b><span>${esc(f[2])}</span></a>`
      : `<div class="dl off"><b>⬇ ${esc(f[0])}</b><span>${esc(f[2])}</span><span class="no">클로드 화면 안에서는 파일을 받을 수 없습니다 — 강사님이 따로 보내 드립니다</span></div>`).join('')
      }<div class="dlnote">눌러도 안 받아지면 <b>오른쪽 클릭 → 「다른 이름으로 링크 저장」</b>을 쓰세요. 엑셀·넘버스·구글시트에서 다 열립니다.</div></div>`;
    p.f.forEach((fl,m)=>{
      const k=fl.k, open=st.ex[k];
      h+=`<div class="fbox"><label for="a${k}">${esc(fl.p)}</label>
        ${fl.help?`<div class="fhelp">${esc(fl.help)}</div>`:''}
        <textarea id="a${k}" data-a="${k}" rows="3">${esc(st.ans[k]||'')}</textarea>
        <button class="exbtn" data-ex="${k}">${open?'▾ 예시 접기':'▸ 이렇게 적으면 됩니다 (예시 보기)'}</button>
        ${open?`<div class="ex"><span class="lbl">예시 — 가상의 카페 "카페 온기"</span>${esc(fl.ex)}<br><button data-put="${k}">이 예시를 칸에 넣기</button></div>`:''}
        <div class="swwrap" id="sw_${k}">${swatchHTML(hexes(st.ans[k]))}</div>
      </div>`;
    });
    (p.prompts||[]).forEach((pr,m)=>{
      const id=st.day+'-'+i+'-'+m; PB[id]=pr.body; seq++;
      const back=pKeys(pr.body).filter(k=>!p.f.some(f=>f.k===k)).length;
      const chain=pr.first
        ? `<span class="chain new">새 대화 시작</span>`
        : `<span class="chain">${d.n} 대화 · ${seq}번째${back?` · 앞에서 적은 답 ${back}개가 들어갑니다`:''}</span>`;
      syncPM(id,pr.body); const ex=!!PM[id];
      h+=`<div class="pr${ex?' exmode':''}"><div class="h"><b>💬 ${esc(pr.name)}</b>${chain}
          ${pKeys(pr.body).length?`<button class="pmx" data-pm="${id}">${ex?'↩ 내 답으로':'👁 예시 답으로 보기'}</button>`:''}
          <button class="cp" data-cp="${id}">복사</button></div>
        <div class="pst" id="pst${id}">${pStatHTML(id,pr.body)}</div>
        <pre id="pre${id}">${esc(fill(pr.body,ex))}</pre>
        <div class="how">${pr.first?'챗GPT·클로드 <b>새 대화</b>에 붙여넣으세요. 이 대화창 하나를 3일 동안 씁니다.':'같은 대화창에 <b>이어서</b> 붙여넣으세요.'} <b>위에 적은 답이 자동으로 들어가 있습니다.</b></div></div>`;
    });
    h+='</div>';
  });
  if(st.day===2) h+=`<div class="seam"><b>여기까지 하면 브랜드가 한 권으로 완성됩니다.</b> 위 「내일부터 할 세 가지」를 적고 <b>「보고서 만들기」</b>를 누르면 3일치가 한 권으로 모입니다. 그 세 가지는 왼쪽 「A. 팔리는지 먼저 확인」으로 이어집니다.</div>`;
  document.getElementById('day').innerHTML=h;
}
function renderSide(){
  const done=PREP.reduce((n,_,i)=>n+gCnt(i),0), pct=Math.round(done/PTOT*100);
  let h=`<div class="sh"><h2>창업 준비 체크리스트</h2>
    <div class="sbar"><div class="sfi" style="width:${pct}%"></div></div>
    <div class="snum"><b>${done}</b> / ${PTOT}개 완료 · ${pct}%</div>
    <div class="cap">브랜드를 정한 뒤 오픈까지 <b>A부터 K까지 순서대로</b>입니다.<br>
      <span class="keytag">중요</span> 표시는 빠뜨리면 되돌리기 어려운 것입니다.</div>
    <div class="next"><span>다음에 할 것</span><b>${esc(nextPrep())}</b></div></div>`;
  PREP.forEach((g,i)=>{
    const o=st.open[i], c=gCnt(i), n=g.items.length, p=Math.round(c/n*100);
    h+=`<div class="grp${o?' open':''}"><button class="gh" data-g="${i}">
      <span class="gn">${g.n}</span>
      <span class="gt">${esc(g.name)}<span class="gp"><span style="width:${p}%"></span></span></span>
      <span class="c">${c}/${n}</span><span class="ar">${o?'▾':'▸'}</span></button>`;
    if(o){
      h+=`<div class="gwhy">${esc(g.why)}</div>`;
      g.items.forEach((it,j)=>{
        const k=i+'-'+j, dn=!!st.checks[k];
        const chips=[];
        if(it.where) chips.push(`<span class="chip"><i>어디서</i>${esc(it.where)}</span>`);
        if(it.cost)  chips.push(`<span class="chip"><i>얼마쯤</i>${esc(it.cost)}</span>`);
        if(it.time)  chips.push(`<span class="chip"><i>기간</i>${esc(it.time)}</span>`);
        h+=`<div class="ck${dn?' done':''}${it.key?' key':''}">
          <div class="mk${dn?' on':''}" role="checkbox" tabindex="0" aria-checked="${dn}" data-k="${k}">✓</div>
          <div class="cbody">
            <div class="ctitle" data-k="${k}">${esc(it.t)}${it.key?'<span class="keytag">중요</span>':''}${dn&&st.at[k]?`<span class="at">${esc(st.at[k])}</span>`:''}</div>
            ${it.w?`<div class="cwhat">${esc(it.w)}</div>`:''}
            ${chips.length?`<div class="chips">${chips.join('')}</div>`:''}
            ${it.carry&&st.ans[it.carry]?`<div class="carry">DAY 3에서 적은 것 → ${esc(st.ans[it.carry])}</div>`:''}
            <input data-m="${k}" placeholder="메모 (선택)" value="${esc(st.memo[k]||'')}">
          </div></div>`;
      });
    }
    h+='</div>';
  });
  document.getElementById('side').innerHTML=h;
}
function render(){jbar();tabs();renderDay();renderSide();bind()}

// 칸에 적는 즉시 — 프롬프트·진행률·완료표시·왼쪽 목록만 갱신 (적던 칸은 건드리지 않음)
function live(){
  for(const id in PB){
    syncPM(id,PB[id]);
    const e=document.getElementById('pre'+id); if(e) e.textContent=fill(PB[id],!!PM[id]);
    const bt=document.querySelector(`[data-pm="${id}"]`);
    if(bt){const lb=PM[id]?'↩ 내 답으로':'👁 예시 답으로 보기'; if(bt.textContent!==lb) bt.textContent=lb;
      const box=bt.closest('.pr'); if(box) box.classList.toggle('exmode',!!PM[id]);}
    const q=document.getElementById('pst'+id); if(q){const nh=pStatHTML(id,PB[id]); if(q.innerHTML!==nh) q.innerHTML=nh;}
  }
  document.querySelectorAll('[id^="sw_"]').forEach(e=>{
    const k=e.id.slice(3), h=swatchHTML(hexes(st.ans[k]));
    if(e.innerHTML!==h) e.innerHTML=h;});
  const d=dCnt(st.day);
  DAYS[st.day].p.forEach((p,i)=>{const m=document.getElementById('mk'+st.day+'-'+i); if(m) m.textContent=pDone(st.day,i)?'✓':p.no;});
  const c=document.getElementById('dayCnt'), f=document.getElementById('dayFill'), pc=document.getElementById('dayPct');
  if(c) c.textContent=d+'/5 교시 적음';
  if(f) f.style.width=(d/5*100)+'%';
  if(pc) pc.textContent=Math.round(d/5*100)+'%';
  dayHint();
  jbar(); tabs(); renderSide(); bind(); paintFill();
}
function dayHint(){
  const el=document.getElementById('dayHint'); if(!el) return;
  const d=dCnt(st.day);
  const who=((st.me&&st.me.name)||'').trim();
  el.innerHTML = d===5
    ? `5교시 다 적었습니다 — <b>${esc((who?who+'_':'')+(st.day+1)+'일차')}.pdf</b> 로 저장됩니다`
    : `${5-d}교시가 아직 비어 있습니다. 지금 눌러도 적은 것까지 <b>${esc((who?who+'_':'')+(st.day+1)+'일차')}</b> 보고서로 나옵니다`;
  el.className = 'rp-hint'+(d===5?' ok':'');
}


// 아티팩트 안에서는 confirm 창이 막혀 있어, 되돌리기 어려운 것은 "한 번 더 누르기"로 확인받습니다
function arm(btn, msg, fn){
  if(btn.dataset.armed){ delete btn.dataset.armed; btn.textContent=btn.dataset.label; btn.classList.remove('armed'); fn(); return; }
  btn.dataset.label=btn.textContent; btn.dataset.armed='1';
  btn.textContent=msg; btn.classList.add('armed');
  clearTimeout(btn._t); btn._t=setTimeout(()=>{ if(btn.dataset.armed){delete btn.dataset.armed; btn.textContent=btn.dataset.label; btn.classList.remove('armed')} },4000);
}
// 용어 사전 전체 보기 — 묶음별 + 찾기
function glossary(){
  document.querySelectorAll('.gov').forEach(e=>e.remove());
  const o=document.createElement('div'); o.className='gov';
  const groups=TERM_GROUPS.map(([g,ks])=>
    `<div class="gsec" data-sec><h4>${esc(g)}</h4>${ks.map(t=>
      `<div class="tm" data-t="${esc(t)}"><b>${esc(t)}</b><span>${esc(TERMS[t]||'').replace(/\n/g,'<br>')}</span></div>`).join('')}</div>`).join('');
  o.innerHTML=`<div class="gbox"><div class="gtop"><h3>🔤 용어 사전</h3><button id="gClose">닫기</button></div>
    <p class="gsub">모르는 말이 나오면 여기서 찾으세요. 중학생에게 설명하듯 세 줄 안에 적었습니다. 모두 ${Object.keys(TERMS).length}개.</p>
    <input id="gFind" placeholder="🔍 찾을 말을 적으세요 (예: 권리금, 원가율)">
    <div class="glist">${groups}<div class="gnone" hidden>그런 말은 아직 없습니다. 궁금한 말을 알려 주시면 넣겠습니다.</div></div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  o.querySelector('#gClose').onclick=close;
  o.onclick=e=>{if(e.target===o)close()};
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
  const inp=o.querySelector('#gFind');
  inp.oninput=()=>{
    const q=inp.value.trim().toLowerCase(); let hit=0;
    o.querySelectorAll('.gsec').forEach(sec=>{
      let n=0;
      sec.querySelectorAll('.tm').forEach(el=>{
        const show=!q || el.textContent.toLowerCase().includes(q);
        el.hidden=!show; if(show)n++;
      });
      sec.hidden=!n; hit+=n;
    });
    o.querySelector('.gnone').hidden=!!hit;
  };
  inp.focus();
}
function bind(){
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{st.day=+b.dataset.d;save();render();window.scrollTo(0,0)});
  const put2=e=>{const k=e.target.dataset.a; st.ans[k]=e.target.value; offPM(k); save(); live()};
  document.querySelectorAll('[data-a]').forEach(c=>{ c.oninput=put2; c.onchange=put2; });
  document.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{const k=b.dataset.ex;st.ex[k]=!st.ex[k];save();renderDay();bind()});
  document.querySelectorAll('[data-put]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.put, f=DAYS.flatMap(d=>d.p).flatMap(p=>p.f).find(x=>x.k===k);
    const put=()=>{st.ans[k]=f.ex;st.ex[k]=false;save();render()};
    if((st.ans[k]||'').trim()) arm(b,'적은 것을 덮어씁니다 — 한 번 더 누르세요',put); else put()});
  document.querySelectorAll('[data-pm]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.pm; PM[id]=!PM[id]; renderDay(); bind();
    const el=document.getElementById('pre'+id); if(el) el.scrollIntoView({block:'nearest'});
  });
  document.querySelectorAll('[data-cp]').forEach(b=>b.onclick=async()=>{
    const t=document.getElementById('pre'+b.dataset.cp).textContent;
    try{await navigator.clipboard.writeText(t)}catch(e){
      const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy')}catch(_){}ta.remove()}
    b.textContent='복사됨 ✓';b.classList.add('done');setTimeout(()=>{b.textContent='복사';b.classList.remove('done')},1800)});
  const tog=k=>{if(st.checks[k]){st.checks[k]=0;delete st.at[k]}else{st.checks[k]=1;st.at[k]=today()}save();render()};
  document.querySelectorAll('[data-k]').forEach(c=>{c.onclick=()=>tog(c.dataset.k);
    c.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();tog(c.dataset.k)}}});
  document.querySelectorAll('.gh').forEach(b=>b.onclick=()=>{const g=b.dataset.g;st.open[g]=!st.open[g];save();renderSide();bind()});
  const dr=document.getElementById('dayReport'); if(dr) dr.onclick=()=>report(st.day);
  dayHint();
  document.querySelectorAll('[data-m]').forEach(c=>c.onchange=e=>{st.memo[e.target.dataset.m]=e.target.value;save()});
}

// 보고서 — DAY별 한 장씩 쌓여 3일차엔 한 권
function report(only){
  const A=k=>{const v=(st.ans[k]||'').trim();return v?esc(v):'<span class="em">아직 작성 전</span>'};
  const nm=(st.ans.name||'').trim()||'(카페 이름 미정)';
  const cc=(st.ans.conceptFinal||st.ans.conceptV2||st.ans.concept||'').trim();
  let done=DAYS.map((_,i)=>dCnt(i));
  const S=(n)=>only==null||only===n;   // only: 0=DAY1, 1=DAY2, 2=DAY3, null=전체
  const ttl = only==null ? '카페 브랜드 기획서' : `${DAYS[only].n} 보고서 — ${DAYS[only].title}`;
  let h=`<div class="rpwrap">
    <div class="cover"><h2>${esc(nm)}</h2><p>${cc?esc(cc):'콘셉트 한 줄 — 아직 작성 전'}</p>
      <div class="by">${esc(ttl)} · ${new Date().getFullYear()}.${String(new Date().getMonth()+1).padStart(2,'0')} · DAY 1 ${done[0]}/5 · DAY 2 ${done[1]}/5 · DAY 3 ${done[2]}/5${(st.me&&st.me.name)?` · 작성 ${esc(st.me.name)}${st.me.tail?'('+esc(st.me.tail)+')':''}`:''}</div></div>`;
  if(S(0)) h+=`<div class="rp"><h3>1. 콘셉트와 고객 <span style="font:400 12px var(--body);color:var(--grey)">DAY 1</span></h3><dl>
    <dt>내가 추구하는 것</dt><dd>${A('me')}</dd>
    <dt>트렌드 키워드</dt><dd>${A('kws10')}</dd>
    <dt>콘셉트 키워드 3개</dt><dd>${A('kw3')}</dd>
    <dt>타깃 고객</dt><dd>${A('targetFinal')}</dd>
    <dt>대표 고객</dt><dd>${A('persona')}</dd>
    <dt>굳이 와야 할 이유</dt><dd>${A('reason')}</dd>
    <dt>카페 이름</dt><dd>${A('name')}</dd>
    <dt>콘셉트 한 줄</dt><dd>${A('concept')}</dd></dl></div>`;
  if(S(0)) h+=`<div class="rp"><h3>2. 상권 <span style="font:400 12px var(--body);color:var(--grey)">DAY 1 · 3교시</span></h3><dl>
    <dt>동네·상권</dt><dd>${A('area')}</dd>
    <dt>유동인구</dt><dd>${A('traffic')}</dd>
    <dt>주요 고객층</dt><dd>${A('mainCust')}</dd>
    <dt>경쟁 카페</dt><dd>${A('comp')}</dd>
    <dt>장점</dt><dd>${A('pros')}</dd>
    <dt>단점</dt><dd>${A('cons')}</dd>
    <dt>다른 점</dt><dd>${A('diff')}</dd></dl></div>`;
  if(S(1)) h+=`<div class="rp"><h3>3. 시그니처 메뉴와 가격 <span style="font:400 12px var(--body);color:var(--grey)">DAY 2</span></h3><dl>
    <dt>메뉴 구성 방향</dt><dd>${A('menuFocus')}</dd>
    <dt>시그니처 후보</dt><dd>${A('sig3')}</dd>
    <dt>메뉴 3개 · 설명 · 가격</dt><dd>${A('menu3')}</dd>
    <dt>원가율</dt><dd>${A('cost3')}</dd>
    <dt>월 손익 미리보기</dt><dd>${A('pl')}</dd>
    <dt>기획안 정리</dt><dd>${A('menuPlan')}</dd></dl></div>`;
  if(S(1)) h+=`<div class="rp"><h3>4. 메뉴판과 비주얼 <span style="font:400 12px var(--body);color:var(--grey)">DAY 2 · 4교시</span></h3><dl>
    <dt>메뉴판 순서·개수</dt><dd>${A('menuboard')}</dd>
    <dt>컬러·폰트·로고</dt><dd>${A('visual')}</dd></dl></div>`;
  if(S(2)) h+=`<div class="rp"><h3>5. 인스타그램과 스마트플레이스 <span style="font:400 12px var(--body);color:var(--grey)">DAY 3</span></h3><dl>
    <dt>입소문 문장</dt><dd>${A('wom')}</dd>
    <dt>계정명·소개글</dt><dd>${A('insta')}</dd>
    <dt>콘텐츠 주제</dt><dd>${A('topics')}</dd>
    <dt>먼저 찍을 사진</dt><dd>${A('photos')}</dd>
    <dt>스마트플레이스</dt><dd>${A('smartplace')}</dd>
    <dt>홍보 문구</dt><dd>${A('adcopy')}</dd>
    <dt>릴스 아이디어</dt><dd>${A('reels')}</dd></dl></div>`;
  if(S(2)) h+=`<div class="rp"><h3>6. 홍보 계획과 단골 설계 <span style="font:400 12px var(--body);color:var(--grey)">DAY 3 · 4교시</span></h3><dl>
    <dt>오픈 전 4주</dt><dd>${A('preopen')}</dd>
    <dt>오픈 후 첫 달</dt><dd>${A('postopen')}</dd>
    <dt>리뷰·단골 방법</dt><dd>${A('repeat')}</dd>
    <dt>다시 오게 하는 경험</dt><dd>${A('comeback')}</dd></dl></div>`;
  const pd=PREP.reduce((n,_,i)=>n+gCnt(i),0);
  if(S(2)) h+=`<div class="rp"><h3>7. 내일부터 할 세 가지</h3><dl>
    <dt>콘셉트 최종</dt><dd>${A('conceptFinal')}</dd>
    <dt>세 가지</dt><dd>${A('three')}</dd>
    <dt>창업 준비 진행</dt><dd>${pd}/${PTOT}개 완료 · 다음: ${esc(nextPrep())}</dd></dl></div>`;
  if(only==null) h+=`<div class="rp aif"><h3>🧱 AI 기본 파일 <span style="font:400 12px var(--body);color:var(--grey)">아래를 그대로 복사해 새 대화 맨 앞에 붙여넣으세요</span></h3>
    <pre class="aifpre">${esc(aiFileText())}</pre></div>`;
  h+=`</div>`;
  // 인쇄창의 기본 파일 이름 = 문서 제목. 「이름_1일차」로 맞춥니다.
  const who=((st.me&&st.me.name)||'').trim();
  const fname=(who?who+'_':'') + (only==null ? '브랜드기획서_전체' : `${only+1}일차`);
  const bar=`<div class="rbar no-print">
      <b>${esc(ttl)}</b>
      <span>인쇄 화면에서 「대상」을 <b>PDF로 저장</b>으로 바꾸면 <b>${esc(fname)}.pdf</b> 로 저장됩니다</span>
      <button id="rPrint">🖨 인쇄 · PDF로 저장</button>
      <button id="rCopy">📋 글자만 복사</button>
      <button id="rClose">닫기</button>
    </div>`;
  const R=document.getElementById('report');
  R.innerHTML=bar+h;
  R.style.display='block';
  document.querySelector('.wrap').style.display='none';
  window.scrollTo(0,0);
  const close=()=>{R.style.display='none';R.innerHTML='';document.querySelector('.wrap').style.display=''};
  document.getElementById('rClose').onclick=close;
  document.getElementById('rPrint').onclick=e=>{
    const b=e.currentTarget;
    const keep=document.title; document.title=fname;   // 저장 이름이 이걸로 잡힙니다
    setTimeout(()=>{document.title=keep},4000);
    try{ window.print() }catch(_){}
    setTimeout(()=>{ if(!document.hasFocus()) return;
      b.textContent='🖨 인쇄창이 안 열리면 — 아래 「글자만 복사」를 쓰세요'; b.classList.add('armed');
      setTimeout(()=>{b.textContent='🖨 인쇄 · PDF로 저장';b.classList.remove('armed')},6000);
    },700);
  };
  document.getElementById('rCopy').onclick=async e=>{
    const cb=e.currentTarget;
    const t=R.innerText.replace(/^[\s\S]*?닫기\n/,'').trim();
    try{await navigator.clipboard.writeText(t)}catch(_){
      const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy')}catch(__){}ta.remove()}
    cb.textContent='복사됨 ✓ — 메모장·한글에 붙여넣으세요';
    setTimeout(()=>{cb.textContent='📋 글자만 복사'},2500);
  };
}
function nextPrep(){for(let i=0;i<PREP.length;i++)for(let j=0;j<PREP[i].items.length;j++)if(!st.checks[i+'-'+j])return PREP[i].n+'. '+PREP[i].items[j].t;return '전부 완료'}

// 지금 칸에 들어 있는 값이 예시 답 그대로인 것들
function exKeys(){return Object.keys(FLD).filter(k=>{
  const v=(st.ans[k]||'').trim(); return v && FLD[k].ex && v===FLD[k].ex.trim()})}
function paintFill(){
  const b=document.getElementById('bFill'); if(!b||b.dataset.armed)return;
  const n=exKeys().length;
  b.textContent = n ? `예시 지우기 (${n}칸)` : '예시로 채우기';
  b.classList.toggle('undo', !!n);
}
document.getElementById('bFill').onclick=e=>{
  const b=e.currentTarget, ek=exKeys();
  if(ek.length){   // 예시로 채운 칸만 비웁니다 — 내가 고쳐 쓴 것은 그대로 둡니다
    ek.forEach(k=>{delete st.ans[k]});
    for(const id in PM) PM[id]=false;
    save(); render();
    return;
  }
  arm(b,'모든 칸을 예시로 덮어씁니다 — 한 번 더',()=>{
    DAYS.flatMap(d=>d.p).flatMap(p=>p.f).forEach(f=>{if(f.ex)st.ans[f.k]=f.ex});
    st.open={0:1};save();render()});
};
document.getElementById('bClear').onclick=e=>arm(e.currentTarget,'정말 모두 지웁니다 — 한 번 더',()=>{
  st=JSON.parse(JSON.stringify(EMPTY));save();render()});
document.getElementById('bReport').onclick=()=>report(null);
document.getElementById('bTerms').onclick=glossary;
document.getElementById('bAI').onclick=aiFile;
document.getElementById('bWho').onclick=()=>{const g=document.getElementById('gate'); if(g)g.remove(); gate();};
document.getElementById('bSubmit').onclick=submitBox;
document.getElementById('bTeach').onclick=teacherBox;
document.getElementById('bBackup').onclick=async e=>{
  const b=e.currentTarget, t=JSON.stringify(st);
  try{await navigator.clipboard.writeText(t)}catch(_){
    const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy')}catch(__){}ta.remove()}
  b.textContent='복사됨 ✓ 메모장에 붙여 보관하세요';
  setTimeout(()=>{b.textContent='📋 답 백업'},2800);
};
document.getElementById('bRestore').onclick=()=>{
  const w=document.createElement('div'); w.className='gov';
  w.innerHTML=`<div class="gbox"><div class="gtop"><h3>📥 답 불러오기</h3><button id="rsX">닫기</button></div>
    <p class="gsub">「답 백업」으로 복사해 둔 글자를 아래에 붙여넣고 「불러오기」를 누르세요. 다른 컴퓨터·다른 브라우저로 옮길 때 씁니다. <b>지금 적은 것은 덮어씁니다.</b></p>
    <textarea id="rsT" rows="6" style="width:100%;font:12px monospace"></textarea>
    <button id="rsGo" class="rp-btn" style="margin-top:8px">불러오기</button>
    <div id="rsMsg" class="gsub"></div></div>`;
  document.body.appendChild(w);
  w.querySelector('#rsX').onclick=()=>w.remove();
  w.onclick=e=>{if(e.target===w)w.remove()};
  w.querySelector('#rsGo').onclick=()=>{
    try{
      const o=JSON.parse(w.querySelector('#rsT').value.trim());
      if(!o||typeof o!=='object'||!o.ans) throw 0;
      st=Object.assign(JSON.parse(JSON.stringify(EMPTY)),o);
      save();render();w.remove();
    }catch(_){ w.querySelector('#rsMsg').innerHTML='<b style="color:#B8862B">붙여넣은 글자를 읽지 못했습니다.</b> 「답 백업」으로 복사한 것 전체를 빠짐없이 붙여넣었는지 확인해 주세요.' }
  };
};
function paintWho(){
  const w=document.getElementById('who'); if(w) w.innerHTML=whoHTML();
  const t=document.getElementById('bTeach'); if(t) t.style.display=(st.me&&st.me.teacher)?'':'none';
  const b=document.getElementById('bSubmit'); if(b) b.style.display=(st.me&&st.me.teacher)?'none':'';
}
const _render=render;
render=function(){_render(); paintWho(); paintFill();};
render();
if(!st.me) gate();
