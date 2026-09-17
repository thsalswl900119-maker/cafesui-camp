// 처음 화면(이름·연락처) · 강사님께 제출 · 강사 확인 화면
// 적은 내용은 각자 브라우저에만 저장됩니다. 제출은 「제출 코드」를 복사해 보내는 방식입니다.

const SUBKEY = 'brand2open_subs_v1';
const PWKEY  = 'brand2open_teacher_v1';   // 강사가 직접 정한 비밀번호의 지문만 담깁니다 (원문 아님)

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
      적은 내용은 <b>이 브라우저 안에만</b> 저장되고 아무 데도 전송되지 않습니다.</div>
    <label class="gchk"><input type="checkbox" id="gTeach"> 나는 <b>강사</b>입니다 (수강생 제출을 확인합니다)</label>
    <div id="gPwWrap" hidden>
      <label for="gPw">강사 비밀번호</label>
      <input id="gPw" type="password" placeholder="${pwSet() ? '강사 비밀번호를 입력하세요' : '쓸 비밀번호를 처음 정해 주세요'}" autocomplete="off" maxlength="30">
      <div class="gnote" id="gPwNote">${pwSet()
        ? '이 기기에 정해 둔 강사 비밀번호입니다. 잊었으면 아래 「비밀번호 다시 정하기」를 누르세요.'
        : '<b>처음이라 아직 비밀번호가 없습니다.</b> 지금 정하면 이 기기에 저장됩니다. 비밀번호 자체는 저장되지 않고 알아볼 수 없는 형태(지문)로만 남습니다.'}</div>
      ${pwSet() ? '<button class="gskip" id="gPwReset" type="button">비밀번호 다시 정하기 (이 기기의 제출 목록도 함께 지웁니다)</button>' : ''}
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
  const rs = o.querySelector('#gPwReset');
  if (rs) rs.onclick = () => {
    if (rs.dataset.armed) { try { localStorage.removeItem(PWKEY); localStorage.removeItem(SUBKEY) } catch(e){}
      o.remove(); gate(); return }
    rs.dataset.armed = '1'; rs.textContent = '정말 지웁니다 — 한 번 더 누르세요';
    setTimeout(() => { if (rs.dataset.armed) { delete rs.dataset.armed;
      rs.textContent = '비밀번호 다시 정하기 (이 기기의 제출 목록도 함께 지웁니다)' } }, 4000);
  };
  const bad = (el, why) => { el.focus(); el.classList.add('bad');
    const nt = o.querySelector('#gPwNote'); if (nt && why) nt.innerHTML = `<b style="color:#B4473A">${why}</b>`;
    setTimeout(() => el.classList.remove('bad'), 1400) };
  const go = async () => {
    const nm = n.value.trim();
    if (!nm) { bad(n); return }
    const teach = tc.checked;
    if (teach) {
      const pw = o.querySelector('#gPw').value;
      if (pw.length < 4) { bad(o.querySelector('#gPw'), '비밀번호는 4자 이상으로 정해 주세요.'); return }
      if (pwSet()) { if (!await pwOK(pw)) { bad(o.querySelector('#gPw'), '비밀번호가 맞지 않습니다.'); return } }
      else { await pwSave(pw) }
    }
    st.me = { name: nm, tail: t.value.trim(), teacher: teach, at: today() };
    save(); o.remove(); render();
  };
  o.querySelector('#gGo').onclick = go;
  o.querySelector('#gSkip').onclick = () => {
    st.me = { name: '', tail: '', teacher: false, skip: 1 }; save(); o.remove(); render();
  };
  [n, t].forEach(e => e.onkeydown = ev => { if (ev.key === 'Enter') go() });
  setTimeout(() => n.focus(), 50);
}

function whoHTML(){
  if (!st.me) return '';
  if (st.me.teacher) return `<span class="who t">🧑‍🏫 ${esc(st.me.name)} 강사님</span>`;
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
    at: new Date().toISOString().slice(0, 16).replace('T', ' '),
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
  o.innerHTML = `<div class="gbox"><div class="gtop"><h3>📤 강사님께 제출</h3><button id="sbX">닫기</button></div>
    <p class="gsub">${meOK() ? '' : '<b style="color:var(--warn)">이름이 없습니다.</b> 오른쪽 위 이름을 눌러 먼저 적어 주세요.<br>'}
      아래 글 전체를 복사해서 <b>카카오톡·문자·이메일</b>로 강사님께 보내세요.
      파일로 내고 싶으면 「.txt로 저장」을 누르세요. <b>인터넷으로 저절로 전송되지 않습니다.</b></p>
    <div class="afbtns">
      <button id="sbCopy" class="rp-btn" style="margin:0">📋 제출 코드 복사</button>
      ${CAN_DL ? '<button id="sbDl">💾 .txt로 저장</button>' : '<span class="afno">클로드 화면에서는 파일 저장이 막혀 있습니다 — 위 「복사」를 쓰세요</span>'}
    </div>
    <pre id="sbPre">${esc(txt)}</pre>
    <div class="swn">마지막 줄의 긴 글자에 <b>내가 적은 답 전부</b>가 들어 있습니다. 지우면 강사님이 내용을 볼 수 없습니다.</div>
  </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#sbX').onclick = close;
  o.onclick = e => { if (e.target === o) close() };
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
    <p class="gsub">수강생이 보낸 <b>제출 코드</b>를 아래에 붙여넣고 「불러오기」를 누르세요. 여러 명을 계속 쌓을 수 있습니다.
      <b>이 목록은 강사님 브라우저에만 저장됩니다.</b></p>
    <textarea id="tbIn" rows="4" placeholder="받은 제출 코드를 통째로 붙여넣으세요"></textarea>
    <div class="afbtns"><button id="tbGo" class="rp-btn" style="margin:0">불러오기</button>
      <button id="tbClr">목록 비우기</button></div>
    <div id="tbMsg" class="gsub"></div>
    <div id="tbList"></div>
  </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#tbX').onclick = close;
  o.onclick = e => { if (e.target === o) close() };
  const msg = t => o.querySelector('#tbMsg').innerHTML = t;

  const draw = () => {
    const subs = loadSubs();
    const L = o.querySelector('#tbList');
    if (!subs.length) { L.innerHTML = '<div class="tbnone">아직 불러온 제출이 없습니다.</div>'; return }
    L.innerHTML = `<div class="tbh">받은 제출 ${subs.length}명</div>` + subs.map((s, i) => {
      const done = s.day[0] + s.day[1] + s.day[2];
      return `<div class="tbr">
        <button class="tbmain" data-open="${i}">
          <span class="tbn">${esc(s.name || '(이름 없음)')}${s.tail ? ' <i>' + esc(s.tail) + '</i>' : ''}</span>
          <span class="tbc">${esc((s.ans.name || '').trim() || '카페 이름 미정')}</span>
          <span class="tbg"><b>${done}/15</b> 교시 · 창업 준비 ${s.prep[0]}/${s.prep[1]}</span>
          <span class="tbd">${esc(s.at || '')}</span>
        </button>
        <button class="tbdel" data-del="${i}" title="지우기">✕</button>
      </div>`;
    }).join('');
    L.querySelectorAll('[data-open]').forEach(b => b.onclick = () => showSub(loadSubs()[+b.dataset.open]));
    L.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const a = loadSubs(); a.splice(+b.dataset.del, 1); saveSubs(a); draw();
    });
  };
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
    if (b.dataset.armed) { saveSubs([]); delete b.dataset.armed; b.textContent = '목록 비우기'; b.classList.remove('armed'); msg('목록을 비웠습니다.'); draw(); return }
    b.dataset.armed = '1'; b.textContent = '정말 모두 지웁니다 — 한 번 더'; b.classList.add('armed');
    setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = '목록 비우기'; b.classList.remove('armed') } }, 4000);
  };
  draw();
}

// 한 사람의 제출 내용 전체 보기
function showSub(p){
  if (!p) return;
  const A = k => { const v = (p.ans[k] || '').trim(); return v ? esc(v) : '<span class="em">아직 작성 전</span>' };
  let h = `<div class="gbox wide"><div class="gtop"><h3>${esc(p.name || '(이름 없음)')}${p.tail ? ' · ' + esc(p.tail) : ''}</h3>
    <button id="ssBack">← 목록</button><button id="ssX">닫기</button></div>
    <p class="gsub">제출 ${esc(p.at || '')} · DAY1 ${p.day[0]}/5 · DAY2 ${p.day[1]}/5 · DAY3 ${p.day[2]}/5 · 창업 준비 ${p.prep[0]}/${p.prep[1]}</p>`;
  DAYS.forEach((d, i) => {
    h += `<div class="ssd"><h4>${d.n} · ${esc(d.title)} <span>${p.day[i]}/5</span></h4><dl>`;
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
