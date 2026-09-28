// 처음 화면(이름·연락처) · 강사님께 보내기 · 강사 확인 화면
// 적은 내용은 각자 브라우저에 저장되고, 「강사님께 보내기」를 누르면 카페스이 서버(Firestore)의
// workbook/이름_뒤4자리 문서로 올라가고, workbook/명단_0000 문서에 그 이름이 추가됩니다.
// 강사는 6자리 숫자로 들어와 명단에 있는 문서를 하나씩 읽어 목록을 봅니다(로그인 계정 불필요).

const SUBKEY = 'brand2open_subs_v1';
const PIN_HASH = 'cd4e0723c70b9257c04db53aeb8572150d7da184c0842755fde972d297e2bcbd';   // 강사 6자리 숫자의 지문(원문은 코드에 없음)
const ROSTER = '명단_0000';                  // 제출한 사람 목록 문서 (workbook/명단_0000)
let FB = null;
try {
  if (window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    FB = firebase.firestore();
  }
} catch (e) { FB = null }
function sid(name, code){ return String(name).replace(/[\/\s]+/g, '') + '_' + code }
function teacherOn(){ return !!(st.me && st.me.teacher) }

const TAG = 'CBSUB1:';

// 비밀번호는 저장하지 않고 「지문」만 남깁니다. 원문은 어디에도 적히지 않습니다.
async function pwHash(pw){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('b2o:' + pw));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function pwSet(){ try { return !!localStorage.getItem(PWKEY) } catch(e){ return false } }
async function pwSave(pw){ try { localStorage.setItem(PWKEY, await pwHash(pw)) } catch(e){} }
async function pwOK(pw){ try { return localStorage.getItem(PWKEY) === await pwHash(pw) } catch(e){ return false } }

function meOK(){ return !!(st.me && (st.me.name || '').trim()) }

// ── 처음 화면 ──────────────────────────────────────
function gate(){
  if (document.getElementById('gate')) return;
  const o = document.createElement('div');
  o.id = 'gate'; o.className = 'gate';
  o.innerHTML = `<div class="gcard">
    <h2>브랜드에서 오픈까지</h2>
    <p class="gp">AI 파트너와 함께 카페 브랜드를 만들고, 실제 오픈까지 갑니다.<br>시작하기 전에 누구인지만 적어 주세요.</p>
    <label for="gName">이름</label>
    <input id="gName" placeholder="예: 홍길동" autocomplete="off" maxlength="20">
    <label for="gTail">전화번호 끝 4자리</label>
    <input id="gTail" placeholder="예: 1234" inputmode="numeric" autocomplete="off" maxlength="4">
    <div class="gnote">같은 이름이 여럿일 때 구분하려고 받습니다. <b>전체 번호는 적지 마세요.</b>
      적은 내용은 이 브라우저에 저장되고, <b>「강사님께 보내기」를 누를 때만</b> 강사님 화면으로 전달됩니다.
      다음에 올 때도 <b>같은 이름·같은 4자리</b>로 들어오세요.</div>
    <label class="gchk"><input type="checkbox" id="gTeach"> 나는 <b>강사</b>입니다 (숫자 6자리만 넣으면 됩니다)</label>
    <div id="gPwWrap" hidden>
      <label for="gPw">강사 6자리 숫자</label>
      <input id="gPw" type="password" placeholder="숫자 6자리" inputmode="numeric" autocomplete="off" maxlength="6">
      <div class="gnote" id="gPwNote">강사만 아는 6자리 숫자입니다. 이름·번호는 안 적어도 됩니다. 맞으면 「제출 확인」 버튼이 생깁니다.</div>
    </div>
    <button class="gbtn" id="gGo">시작하기</button>
    <button class="gskip" id="gSkip">이름 없이 둘러보기</button>
  </div>`;
  document.body.appendChild(o);
  const n = o.querySelector('#gName'), t = o.querySelector('#gTail');
  n.value = (st.me && st.me.name) || ''; t.value = (st.me && st.me.tail) || '';
  t.oninput = () => { t.value = t.value.replace(/\D/g, '').slice(0, 4) };
  const tc = o.querySelector('#gTeach'), pwWrap = o.querySelector('#gPwWrap');
  tc.onchange = () => { pwWrap.hidden = !tc.checked; if (tc.checked) o.querySelector('#gPw').focus() };
  const bad = (el, why) => { el.focus(); el.classList.add('bad');
    const nt = o.querySelector('#gPwNote'); if (nt && why) nt.innerHTML = `<b style="color:#B4473A">${why}</b>`;
    setTimeout(() => el.classList.remove('bad'), 1400) };
  const go = async () => {
    let nm = n.value.trim();
    const teach = tc.checked;
    if (teach) {
      const pw = o.querySelector('#gPw').value.trim();
      if (!/^\d{6}$/.test(pw)) { bad(o.querySelector('#gPw'), '숫자 6자리를 적어 주세요.'); return }
      if (await pwHash(pw) !== PIN_HASH) { bad(o.querySelector('#gPw'), '강사 숫자가 맞지 않습니다.'); return }
      if (!nm) nm = '강사';
    } else if (!nm) { bad(n); return }
    st.me = { name: nm, tail: t.value.trim(), teacher: teach, at: today() };
    save(); o.remove(); render();
  };
  o.querySelector('#gGo').onclick = go;
  o.querySelector('#gSkip').onclick = () => {
    st.me = { name: '', tail: '', teacher: false, skip: 1 }; save(); o.remove(); render();
  };
  [n, t, o.querySelector('#gPw')].forEach(e => e.onkeydown = ev => { if (ev.key === 'Enter') go() });
  setTimeout(() => n.focus(), 50);
}

function whoHTML(){
  if (!st.me) return '';
  if (st.me.teacher) return `<span class="who t">🧑‍🏫 ${st.me.name && st.me.name !== '강사' ? esc(st.me.name) + ' ' : ''}강사님</span>`;
  if (meOK()) return `<span class="who">${esc(st.me.name)}${st.me.tail ? ' · ' + esc(st.me.tail) : ''}</span>`;
  return `<span class="who off">이름 없이 보는 중</span>`;
}

// ── 제출 코드 만들기 ────────────────────────────────
function subPayload(){
  const pd = PREP.reduce((n, _, i) => n + gCnt(i), 0);
  return {
    v: 1,
    name: (st.me && st.me.name) || '',
    tail: (st.me && st.me.tail) || '',
    at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' '),
    day: [dCnt(0), dCnt(1), dCnt(2)],
    prep: [pd, PTOT],
    ans: st.ans, checks: st.checks, atd: st.at, memo: st.memo
  };
}
function encodeSub(p){
  const json = JSON.stringify(p);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return TAG + b64;
}
function decodeSub(text){
  const m = (text || '').match(new RegExp(TAG + '([A-Za-z0-9+/=]+)'));
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return (o && o.ans) ? o : null;
  } catch (e) { return null }
}
function subText(){
  const p = subPayload();
  return `===== 브랜드에서 오픈까지 · 제출 =====
이름 : ${p.name || '(이름 없음)'}${p.tail ? ' (' + p.tail + ')' : ''}
제출 : ${p.at}
진행 : DAY1 ${p.day[0]}/5 · DAY2 ${p.day[1]}/5 · DAY3 ${p.day[2]}/5 · 창업 준비 ${p.prep[0]}/${p.prep[1]}
카페 : ${(st.ans.name || '').trim() || '(아직 안 정함)'}
콘셉트: ${(st.ans.conceptFinal || st.ans.conceptV2 || st.ans.concept || '').trim() || '(아직 안 정함)'}

--- 아래 한 줄은 지우지 마세요 (강사님 화면에서 읽습니다) ---
${encodeSub(p)}`;
}

function submitBox(){
  document.querySelectorAll('.gov').forEach(e => e.remove());
  const txt = subText();
  const o = document.createElement('div'); o.className = 'gov';
  const tailOK = /^\d{4}$/.test(((st.me && st.me.tail) || '').trim());
  o.innerHTML = `<div class="gbox"><div class="gtop"><h3>📤 강사님께 보내기</h3><button id="sbX">닫기</button></div>
    <p class="gsub">${meOK() ? '' : '<b style="color:var(--warn)">이름이 없습니다.</b> 오른쪽 위 「바꾸기」를 눌러 먼저 적어 주세요.<br>'}
      ${meOK() && !tailOK ? '<b style="color:var(--warn)">전화번호 끝 4자리가 없습니다.</b> 오른쪽 위 「바꾸기」에서 적어야 보낼 수 있습니다.<br>' : ''}
      「강사님께 보내기」를 누르면 지금까지 적은 답 전부가 <b>강사님 화면으로 바로 전달</b>됩니다.
      보낸 뒤에 더 적었으면 다시 누르세요. 최신 것으로 바뀝니다.${st.sent ? ` <b>마지막 보냄: ${esc(st.sent)}</b>` : ''}</p>
    <div class="afbtns">
      <button id="sbSend" class="rp-btn" style="margin:0">📤 강사님께 보내기</button>
      <button id="sbCopy">📋 제출 코드 복사 (인터넷이 안 될 때)</button>
      ${CAN_DL ? '<button id="sbDl">💾 .txt로 저장</button>' : ''}
    </div>
    <div id="sbMsg" class="gsub"></div>
    <details style="margin-top:10px"><summary class="gsub" style="cursor:pointer">제출 코드 보기 (예비용)</summary>
    <pre id="sbPre">${esc(txt)}</pre>
    <div class="swn">마지막 줄의 긴 글자에 <b>내가 적은 답 전부</b>가 들어 있습니다. 카톡·문자로 보낼 때 지우지 마세요.</div></details>
  </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#sbX').onclick = close;
  o.onclick = e => { if (e.target === o) close() };
  o.querySelector('#sbSend').onclick = async e => {
    const b = e.currentTarget, m = o.querySelector('#sbMsg');
    if (!meOK()) { m.innerHTML = '<b style="color:var(--warn)">이름을 먼저 적어 주세요.</b> (오른쪽 위 「바꾸기」)'; return }
    const tail = (st.me.tail || '').trim();
    if (!/^\d{4}$/.test(tail)) { m.innerHTML = '<b style="color:var(--warn)">전화번호 끝 4자리를 적어야 보낼 수 있습니다.</b> 오른쪽 위 「바꾸기」에서 적어 주세요.'; return }
    if (!FB) { m.innerHTML = '<b style="color:var(--warn)">서버에 연결되지 않았습니다.</b> 인터넷을 확인하고 새로고침하거나, 「제출 코드 복사」로 보내 주세요.'; return }
    b.disabled = true; b.textContent = '보내는 중…';
    try {
      const p = JSON.parse(JSON.stringify(subPayload())); p.kind = 'camp';
      const name = st.me.name.trim().slice(0, 30);
      const id = sid(name, tail), now = Date.now();
      await FB.collection('workbook').doc(id).set({ name: name, code: tail, day: 0, a: p, updatedAt: now });
      await FB.collection('workbook').doc(ROSTER).set({ name: '명단', code: '0000', day: 0, a: { [id]: now }, updatedAt: now }, { merge: true });
      st.sent = p.at; save();
      m.innerHTML = `<b style="color:var(--sage)">보냈습니다 ✓</b> ${esc(p.at)} · 강사님 화면에 바로 보입니다.`;
      b.textContent = '📤 다시 보내기';
    } catch (err) {
      m.innerHTML = '<b style="color:var(--warn)">보내지 못했습니다.</b> 인터넷을 확인하고 다시 누르거나, 「제출 코드 복사」로 보내 주세요.';
      b.textContent = '📤 강사님께 보내기';
    }
    b.disabled = false;
  };
  o.querySelector('#sbCopy').onclick = async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(txt) } catch (_) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') } catch (__) {} ta.remove()
    }
    b.textContent = '복사됨 ✓ — 강사님께 붙여넣어 보내세요';
    setTimeout(() => { b.textContent = '📋 제출 코드 복사' }, 2600);
  };
  const dl = o.querySelector('#sbDl');
  if (dl) dl.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = `${(st.me && st.me.name) || '제출'}${st.me && st.me.tail ? '_' + st.me.tail : ''} 브랜드 제출.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
}

// ── 강사 확인 화면 ──────────────────────────────────
function loadSubs(){ try { return JSON.parse(localStorage.getItem(SUBKEY) || '[]') } catch (e) { return [] } }
function saveSubs(a){ try { localStorage.setItem(SUBKEY, JSON.stringify(a)) } catch (e) {} }

function teacherBox(){
  document.querySelectorAll('.gov').forEach(e => e.remove());
  const o = document.createElement('div'); o.className = 'gov';
  o.innerHTML = `<div class="gbox wide"><div class="gtop"><h3>🧑‍🏫 수강생 제출 확인</h3><button id="tbX">닫기</button></div>
    <p class="gsub">수강생이 「강사님께 보내기」를 누르면 여기에 <b>바로</b> 쌓입니다. 이름을 누르면 답 전체를 볼 수 있습니다.
      인터넷이 안 돼서 카톡·문자로 받은 <b>제출 코드</b>는 아래 칸에 붙여넣어 불러올 수 있습니다.</p>
    <div class="afbtns"><button id="tbRefresh" class="rp-btn" style="margin:0">🔄 새로 불러오기</button>
      <button id="tbCsv">📊 표(CSV)로 내려받기</button></div>
    <div id="tbMsg" class="gsub"></div>
    <div id="tbList"><div class="tbnone">서버에서 불러오는 중…</div></div>
    <details style="margin-top:12px"><summary class="gsub" style="cursor:pointer">카톡·문자로 받은 제출 코드 붙여넣기</summary>
    <textarea id="tbIn" rows="4" placeholder="받은 제출 코드를 통째로 붙여넣으세요"></textarea>
    <div class="afbtns"><button id="tbGo">불러오기</button>
      <button id="tbClr">붙여넣은 목록 비우기</button></div></details>
  </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#tbX').onclick = close;
  o.onclick = e => { if (e.target === o) close() };
  const msg = t => o.querySelector('#tbMsg').innerHTML = t;
  let remote = [];
  const key = x => (x.name || '') + '|' + (x.tail || '');
  const allSubs = () => {
    const seen = {}; const out = [];
    remote.forEach(s => { seen[key(s)] = 1; out.push(s) });
    loadSubs().forEach((s, i) => { if (!seen[key(s)]) out.push(Object.assign({}, s, { _local: i })) });
    return out;
  };
  const fetchRemote = async () => {
    if (!FB) { msg('<b style="color:var(--warn)">서버에 연결되지 않았습니다.</b> 인터넷을 확인하고 새로고침해 주세요.'); remote = []; return }
    try {
      const r = await FB.collection('workbook').doc(ROSTER).get();
      const ids = r.exists ? Object.keys(r.data().a || {}) : [];
      const docs = await Promise.all(ids.map(id => FB.collection('workbook').doc(id).get()));
      remote = docs.filter(d => d.exists).map(d => d.data()).filter(d => d.a && d.a.kind === 'camp')
        .sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))
        .map(d => Object.assign({}, d.a, { name: d.name, tail: d.code, at: d.a.at || '', _remote: 1 }));
      msg(`서버에서 <b>${remote.length}명</b> 불러왔습니다. (${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`);
    } catch (e) { msg('<b style="color:var(--warn)">서버 목록을 불러오지 못했습니다.</b> ' + esc(e && e.message || '')); remote = [] }
  };

  const draw = () => {
    const subs = allSubs();
    const L = o.querySelector('#tbList');
    if (!subs.length) { L.innerHTML = '<div class="tbnone">아직 받은 제출이 없습니다.</div>'; return }
    L.innerHTML = `<div class="tbh">받은 제출 ${subs.length}명</div>` + subs.map((s, i) => {
      const done = (s.day[0] || 0) + (s.day[1] || 0) + (s.day[2] || 0);
      return `<div class="tbr">
        <button class="tbmain" data-open="${i}">
          <span class="tbn">${esc(s.name || '(이름 없음)')}${s.tail ? ' <i>' + esc(s.tail) + '</i>' : ''}${s._remote ? '' : ' <i>붙여넣기</i>'}</span>
          <span class="tbc">${esc(((s.ans || {}).name || '').trim() || '카페 이름 미정')}</span>
          <span class="tbg"><b>${done}/15</b> 교시 · 창업 준비 ${(s.prep || [0, 0])[0]}/${(s.prep || [0, 0])[1]}</span>
          <span class="tbd">${esc(s.at || '')}</span>
        </button>
        <button class="tbdel" data-del="${i}" title="지우기">✕</button>
      </div>`;
    }).join('');
    L.querySelectorAll('[data-open]').forEach(b => b.onclick = () => showSub(allSubs()[+b.dataset.open]));
    L.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const s = allSubs()[+b.dataset.del]; if (!s) return;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '정말 지움?'; setTimeout(() => { delete b.dataset.armed; b.textContent = '✕' }, 3000); return }
      if (s._remote) { try { await FB.collection('workbook').doc(ROSTER).set({ a: { [sid(s.name, s.tail)]: firebase.firestore.FieldValue.delete() } }, { merge: true }); await fetchRemote() } catch (e) { msg('<b style="color:var(--warn)">목록에서 빼지 못했습니다.</b>') } }
      else { const a = loadSubs(); a.splice(s._local, 1); saveSubs(a) }
      draw();
    });
  };
  o.querySelector('#tbRefresh').onclick = async () => { await fetchRemote(); draw() };
  o.querySelector('#tbCsv').onclick = () => {
    const subs = allSubs(); if (!subs.length) { msg('내려받을 제출이 없습니다.'); return }
    const cols = [['이름', s => s.name], ['뒤4자리', s => s.tail], ['보낸 때', s => s.at],
      ['DAY1', s => (s.day || [])[0]], ['DAY2', s => (s.day || [])[1]], ['DAY3', s => (s.day || [])[2]], ['창업준비', s => (s.prep || [])[0]]];
    DAYS.forEach(d => d.p.forEach(pg => pg.f.forEach(f => cols.push([d.n + ' ' + f.p, s => (s.ans || {})[f.k] || '']))));
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '\ufeff' + cols.map(c => q(c[0])).join(',') + '\n' + subs.map(s => cols.map(c => q(c[1](s))).join(',')).join('\n');
    if (!CAN_DL) { navigator.clipboard.writeText(csv).then(() => msg('클로드 화면에서는 파일을 못 받아 <b>표 내용을 복사</b>했습니다. 엑셀·구글시트에 붙여넣으세요.'), () => msg('복사하지 못했습니다.')); return }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '브랜드에서오픈까지_제출_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  fetchRemote().then(draw);
  o.querySelector('#tbGo').onclick = () => {
    const p = decodeSub(o.querySelector('#tbIn').value);
    if (!p) { msg('<b style="color:var(--warn)">제출 코드를 찾지 못했습니다.</b> 받은 글을 <b>통째로</b> 붙여넣었는지 확인해 주세요 (「CBSUB1:」로 시작하는 줄이 있어야 합니다).'); return }
    const a = loadSubs();
    const k = (x) => (x.name || '') + '|' + (x.tail || '');
    const at = a.findIndex(x => k(x) === k(p));
    if (at >= 0) { a[at] = p; msg(`<b>${esc(p.name)}</b> 님의 제출을 <b>최신 것으로 바꿨습니다.</b>`) }
    else { a.push(p); msg(`<b>${esc(p.name || '(이름 없음)')}</b> 님의 제출을 불러왔습니다.`) }
    saveSubs(a); o.querySelector('#tbIn').value = ''; draw();
  };
  o.querySelector('#tbClr').onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { saveSubs([]); delete b.dataset.armed; b.textContent = '붙여넣은 목록 비우기'; b.classList.remove('armed'); msg('붙여넣은 목록을 비웠습니다.'); draw(); return }
    b.dataset.armed = '1'; b.textContent = '정말 모두 지웁니다 — 한 번 더'; b.classList.add('armed');
    setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = '붙여넣은 목록 비우기'; b.classList.remove('armed') } }, 4000);
  };
}

// 한 사람의 제출 내용 전체 보기
function showSub(p){
  if (!p) return;
  const A = k => { const v = ((p.ans || {})[k] || '').trim(); return v ? esc(v) : '<span class="em">아직 작성 전</span>' };
  let h = `<div class="gbox wide"><div class="gtop"><h3>${esc(p.name || '(이름 없음)')}${p.tail ? ' · ' + esc(p.tail) : ''}</h3>
    <button id="ssBack">← 목록</button><button id="ssX">닫기</button></div>
    <p class="gsub">제출 ${esc(p.at || '')} · DAY1 ${p.day[0]}/5 · DAY2 ${p.day[1]}/5 · DAY3 ${p.day[2]}/5 · 창업 준비 ${p.prep[0]}/${p.prep[1]}</p>`;
  DAYS.forEach((d, i) => {
    h += `<div class="ssd"><h4>${d.n} · ${esc(d.title)} <span>${(p.day || [])[i] || 0}/5</span></h4><dl>`;
    d.p.forEach(pg => pg.f.forEach(f => { h += `<dt>${esc(f.p)}</dt><dd>${A(f.k)}</dd>` }));
    h += `</dl></div>`;
  });
  const cks = Object.keys(p.checks || {}).filter(k => p.checks[k]);
  h += `<div class="ssd"><h4>창업 준비 체크리스트 <span>${p.prep[0]}/${p.prep[1]}</span></h4>`;
  h += cks.length ? '<ul class="sscl">' + cks.map(k => {
    const [g, j] = k.split('-').map(Number);
    const it = PREP[g] && PREP[g].items[j];
    return it ? `<li>${esc(PREP[g].n)}. ${esc(it.t)}${p.atd && p.atd[k] ? ` <i>${esc(p.atd[k])}</i>` : ''}</li>` : '';
  }).join('') + '</ul>' : '<p class="gsub">아직 체크한 항목이 없습니다.</p>';
  h += '</div></div>';
  document.querySelectorAll('.gov').forEach(e => e.remove());
  const o = document.createElement('div'); o.className = 'gov'; o.innerHTML = h;
  document.body.appendChild(o);
  o.querySelector('#ssX').onclick = () => o.remove();
  o.querySelector('#ssBack').onclick = () => { o.remove(); teacherBox() };
  o.onclick = e => { if (e.target === o) o.remove() };
}
