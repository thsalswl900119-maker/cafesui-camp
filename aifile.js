// AI 기본 파일 — 새 대화 맨 앞에 한 번만 붙여넣으면 그 AI가 이 가게를 아는 상태로 시작합니다.
const USES = [
['인스타그램 캡션', '📸', `위 기본 파일을 기준으로, [여기에 무엇을 올릴지 적으세요 — 예: 이달의 과일 케이크 사진 3장] 인스타그램 게시물 캡션을 써줘.
구성: 스크롤을 멈추게 하는 첫 문장 1줄 → 본문 4~6줄 → 행동 유도 1줄 → 해시태그 10개(동네+업종 포함).
우리 가게 톤으로. 과장 광고처럼 들리는 말은 빼고. 3가지 버전으로 줘.`],
['새 메뉴 기획', '🍰', `위 기본 파일을 기준으로, [여기에 조건을 적으세요 — 예: 겨울 시즌 한정, 3주만 판매] 새 메뉴를 5개 제안해줘.
각각 — 이름 / 한 줄 설명 / 예상 판매가 / 대략의 원가율 / 왜 우리 대표 고객이 살지 / 만들기 어려운 점.
지금 파는 메뉴와 겹치지 않게, 기존 재료를 최대한 돌려 쓰는 쪽으로. 숫자는 "추정"이라고 표시해줘.`],
['리뷰·DM 답글', '💬', `위 기본 파일을 기준으로, 아래 손님 글에 대한 답글을 써줘.
[여기에 손님이 쓴 리뷰나 DM을 그대로 붙여넣으세요]
우리 가게 톤으로, 3~5줄. 변명하지 말고, 사실은 사실대로. 나쁜 후기면 사과 → 무엇을 바꿀지 → 다시 와 달라는 한 줄 순서로.
정중한 버전과 조금 더 다정한 버전 2가지로 줘.`],
['이벤트·프로모션', '🎁', `위 기본 파일을 기준으로, [여기에 시기나 목적을 적으세요 — 예: 오픈 한 달째, 재방문을 늘리고 싶음] 이벤트를 3개 제안해줘.
각각 — 무엇을 / 얼마나 들고 / 며칠 하고 / 어떻게 알리고 / 성공인지 아닌지 무엇으로 판단할지.
할인은 마지막 수단으로. 우리 객단가와 원가율을 깎아먹지 않는 쪽으로. 돈 안 드는 것 하나는 꼭 넣어줘.`],
['응대 멘트 · 직원 교육', '🧑‍🍳', `위 기본 파일을 기준으로, 우리 가게 응대 스크립트를 만들어줘.
① 손님이 들어올 때 ② 메뉴를 고민할 때(시그니처 추천 멘트) ③ 포장 손님 ④ 품절일 때 ⑤ 컴플레인이 들어왔을 때.
각 상황마다 그대로 읽으면 되는 2~3문장, 우리 가게 톤으로. 새로 온 아르바이트생이 첫날 보고 쓸 수 있게 쉬운 말로.`],
['사업계획서 · 지원사업', '📑', `위 기본 파일을 기준으로, [여기에 어디에 낼지 적으세요 — 예: 소상공인 정책자금 / 청년창업 지원사업] 사업계획서 초안을 써줘.
항목: 창업 동기 / 아이템 개요 / 시장·상권 분석 / 목표 고객 / 차별화 / 메뉴와 가격 / 매출 추정과 근거 / 자금 소요와 조달 / 앞으로 1년 계획.
기본 파일에 없는 숫자는 지어내지 말고 "[확인 필요]"로 비워 두고, 내가 무엇을 채워야 하는지 목록으로 알려줘.`]
];

function aiFileText(){
  const V=k=>{const v=(st.ans[k]||'').trim(); return v||'(아직 안 정함)'};
  const nm=(st.ans.name||'').trim()||'(이름 아직 안 정함)';
  const cc=(st.ans.conceptFinal||st.ans.conceptV2||st.ans.concept||'').trim()||'(아직 안 정함)';
  const tg=(st.ans.targetFinal||st.ans.target||'').trim()||'(아직 안 정함)';
  const pd=PREP.reduce((n,_,i)=>n+gCnt(i),0);
  return `# 내 가게 기본 파일 — ${nm}
아래는 내 가게에 대한 사실 정보야. 이 대화 내내 이걸 기준으로 답해줘.

## 지켜 줄 규칙
1. 여기 적힌 것만 사실로 다뤄. 없는 정보는 지어내지 말고 나에게 물어봐.
2. 새로 계산한 숫자는 반드시 "추정"이라고 표시해.
3. 답은 아래 6번의 톤에 맞춰. 과장 광고처럼 들리는 말은 쓰지 마.
4. 좋은 말만 하지 말고 걱정되는 점을 하나씩 솔직히 짚어줘.
5. "(아직 안 정함)"인 칸은 제안해도 되지만, 이미 정해진 것처럼 말하지 마.

## 1. 정체성
- 가게 이름: ${nm}
- 콘셉트 한 줄: ${cc}
- 콘셉트 키워드 3개: ${V('kw3')}
- 내가 추구하는 것 / 강점: ${V('me')}
- 손님이 굳이 여기까지 와야 할 이유: ${V('reason')}
- 경쟁 가게와 다른 점: ${V('diff')}

## 2. 손님
- 타깃 고객: ${tg}
- 대표 고객 한 명(페르소나): ${V('persona')}

## 3. 자리 · 상권
- 동네 / 상권: ${V('area')}
- 유동인구 특징: ${V('traffic')}
- 배후 인구(주요 고객층): ${V('mainCust')}
- 주변 경쟁 카페: ${V('comp')}
- 이 자리의 장점: ${V('pros')}
- 이 자리의 단점 / 위험: ${V('cons')}

## 4. 파는 것
- 메뉴 구성 방향: ${V('menuFocus')}
- 시그니처 후보: ${V('sig3')}
- 대표 메뉴 (이름 / 설명 / 판매가):
${V('menu3')}
- 메뉴판 구성: ${V('menuboard')}
- 메뉴 기획 정리: ${V('menuPlan')}

## 5. 숫자
- 메뉴별 판매가 / 원가 / 원가율:
${V('cost3')}
- 월 손익 구조:
${V('pl')}
(※ 이 숫자는 내가 원가계산표로 직접 계산한 것이야. 다시 계산하지 말고 그대로 놓고 써줘.)

## 6. 보이는 것 · 톤
- 컬러 / 폰트 / 로고 방향: ${V('visual')}
- 손님이 남에게 옮길 한 문장(입소문): ${V('wom')}

## 7. 알리는 법
- 인스타그램 계정명 · 소개글: ${V('insta')}
- 콘텐츠 주제: ${V('topics')}
- 먼저 찍을 사진: ${V('photos')}
- 네이버 스마트플레이스: ${V('smartplace')}
- 홍보 문구: ${V('adcopy')}
- 릴스 아이디어: ${V('reels')}

## 8. 오픈 전후 · 단골
- 오픈 전 4주 홍보: ${V('preopen')}
- 오픈 후 첫 달: ${V('postopen')}
- 리뷰 · 단골 장치: ${V('repeat')}
- 다시 오게 하는 경험: ${V('comeback')}
- 내가 먼저 할 세 가지: ${V('three')}

## 9. 이 가게와 안 맞는 것 (제안하지 마)
- 위 콘셉트 · 대표 고객 · 톤에 어긋나는 것
- 영업신고와 사업자등록 전에 돈을 받고 파는 것 (식품위생법 위반이야)
- 근거 없는 숫자, 출처 없는 통계
- 객단가와 원가율을 무너뜨리는 큰 할인

## 10. 지금 진행 상황
- 브랜드 정하기: DAY1 ${dCnt(0)}/5 · DAY2 ${dCnt(1)}/5 · DAY3 ${dCnt(2)}/5 교시 작성
- 창업 준비 체크리스트: ${PTOT}개 중 ${pd}개 완료 · 다음에 할 것: ${nextPrep()}
- 이 파일을 만든 날: ${(()=>{const d=new Date();return d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일'})()}
(※ 이 뒤로 바뀐 것이 있으면 내가 대화 중에 "[업데이트]"로 알려줄게. 그건 이 파일보다 우선이야.)

---
여기까지가 기본 파일이야. 이제 내가 시키는 일을 이 정보를 바탕으로 해줘.`;
}

function aiFile(){
  document.querySelectorAll('.gov').forEach(e=>e.remove());
  const txt=aiFileText();
  const o=document.createElement('div'); o.className='gov';
  o.innerHTML=`<div class="gbox wide"><div class="gtop"><h3>🧱 AI 기본 파일</h3><button id="afX">닫기</button></div>
    <p class="gsub"><b>한 번 만들어 두고 계속 씁니다.</b> 이 글을 메모장이나 카톡 「나에게 보내기」에 저장해 두세요.
    챗GPT·클로드·제미나이 어디든 <b>새 대화를 열 때 맨 앞에 한 번 붙여넣으면</b>, 그때부터 그 AI는 내 가게를 아는 상태로 일합니다. 매번 설명할 필요가 없습니다.</p>
    <div class="afbtns">
      <button id="afCopy" class="rp-btn" style="margin:0">📋 기본 파일 복사</button>
      ${CAN_DL?'<button id="afDl">💾 .txt 파일로 저장</button>':'<span class="afno">클로드 화면에서는 파일 저장이 막혀 있습니다 — 위 「복사」를 쓰세요</span>'}
    </div>
    <pre id="afPre">${esc(txt)}</pre>
    <h4 class="afh">이 파일을 붙여넣은 다음, 이어서 쓰는 프롬프트</h4>
    <p class="gsub">기본 파일을 먼저 붙여넣고 → 아래 중 하나를 이어서 붙여넣으세요. 대괄호 [ ] 안만 내 상황으로 바꾸면 됩니다.</p>
    <div class="uses">${USES.map(([n,ic,b],i)=>
      `<div class="use"><div class="uh"><b>${ic} ${esc(n)}</b><button class="cp" data-u="${i}">복사</button></div>
       <pre>${esc(b)}</pre></div>`).join('')}</div>
  </div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  o.querySelector('#afX').onclick=close;
  o.onclick=e=>{if(e.target===o)close()};
  document.addEventListener('keydown',function k(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',k)}});
  const cp=async(t,btn,ok)=>{
    try{await navigator.clipboard.writeText(t)}catch(_){
      const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy')}catch(__){}ta.remove()}
    const old=btn.textContent; btn.textContent=ok; btn.classList.add('done');
    setTimeout(()=>{btn.textContent=old;btn.classList.remove('done')},2200);
  };
  o.querySelector('#afCopy').onclick=e=>cp(txt,e.currentTarget,'복사됨 ✓ — 새 대화 맨 앞에 붙여넣으세요');
  const dl=o.querySelector('#afDl');
  if(dl) dl.onclick=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}));
    a.download=((st.ans.name||'내 가게').trim().replace(/[\/\\:*?"<>|]/g,'')||'내 가게')+' 기본 파일.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  };
  o.querySelectorAll('[data-u]').forEach(b=>b.onclick=e=>cp(USES[+b.dataset.u][2],e.currentTarget,'복사됨 ✓'));
}
