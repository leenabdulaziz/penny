/* Banking app UI: dashboard, forecast widget, insights, transactions, sheets, toasts, reminders, email composer. */
(function () {
  const B = window.Bank;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    tab: 'home',
    scenario: null, // what-if preview; never mutates accounts
    reminders: [
      { id: 1, title: 'Check council tax band', due: 'This month', done: false },
    ],
    email: null, // current draft
    sentEmails: [],
  };

  // ---------- phone scaling + clock ----------
  function fit() {
    const wrap = $('#phoneWrap');
    const s = Math.min(1, (window.innerHeight - 32) / 876, (window.innerWidth - 24) / 417);
    wrap.style.transform = `scale(${s})`;
    wrap.style.margin = `${(876 * (s - 1)) / 2}px ${(417 * (s - 1)) / 2}px`;
  }
  window.addEventListener('resize', fit);
  fit();
  function tick() { const d = new Date(); $('#clock').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }
  tick(); setInterval(tick, 15000);

  // ---------- icons ----------
  const ICON = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17Z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    brief: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/></svg>',
  };
  const CAT_EMOJI = { Groceries: '🛒', Transport: '🚇', 'Eating out': '🍽️', Takeaways: '🥡', Shopping: '🛍️', Entertainment: '🎟️', Taxis: '🚕', Bills: '💡', Subscriptions: '🔁', Rent: '🏠', Income: '💷', 'Card repayment': '💳' };

  // ---------- HOME ----------
  function renderHome() {
    const a = B.accounts;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const alerts = B.spendingAlerts();
    const group = window.Profile ? window.Profile.ageGroup() : 'adult';
    const lead = { teen: `Heads up ${B.customer.firstName} 👀`, older: `${B.customer.firstName}, a gentle heads-up`, adult: `${B.customer.firstName}`, 'young-adult': `${B.customer.firstName}` }[group];
    $('#view-home').innerHTML = `
      <div class="topbar">
        <div class="avatar">${B.customer.initials}</div>
        <div class="seg"><span class="pill">Personal</span><span class="biz">${ICON.brief}</span></div>
        <div class="tb-icons">${ICON.bell}${ICON.search}</div>
      </div>
      <div class="greet">${greet}, ${B.customer.firstName}<small>${B.fmtDate(B.TODAY)}</small></div>
      <div class="insight-banner" id="insightBanner">
        <div class="ib-orb"></div>
        <div class="ib-slides">${alerts.slice(0, 3).map((a, i) => `<p class="ib-slide ${i ? '' : 'on'}" data-ask="${esc(a.ask)}"><b>${a.icon} ${esc(lead)}, ${esc(a.title)}.</b><br><span>${esc(a.detail)}</span> <u>Talk to Penny</u></p>`).join('')}</div>
        <div class="ib-dots">${alerts.slice(0, 3).map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      </div>
      <div class="section-h"><span>Accounts</span><a href="#">Edit ›</a></div>
      <div class="card acct-main" data-open="transactions">
        <div class="acct-top"><div><h4>Current</h4><div class="muted">Current · ${a.current.number.replace(/\d(?=\d{4})/g, '•')} · ${a.current.sort}</div></div><span style="color:var(--purple);font-weight:800">•••</span></div>
        <div class="acct-illu">
          <svg width="58" height="44" viewBox="0 0 58 44"><rect x="4" y="10" width="44" height="30" rx="5" fill="#e9e3f1" stroke="#5a287d" stroke-width="1.6"/><rect x="30" y="18" width="24" height="14" rx="4" fill="#fff" stroke="#5a287d" stroke-width="1.6"/><circle cx="37" cy="25" r="2.4" fill="#5a287d"/><path d="M14 4l3 4M22 2v5M30 4l-3 4" stroke="#5a287d" stroke-width="1.6" stroke-linecap="round"/></svg>
          <div><div class="balance" id="homeBalance">${B.gbp(a.current.balance)}</div><div class="muted" style="text-align:right">Overdraft limit: ${B.gbp(a.current.overdraft)}</div></div>
        </div>
      </div>
      <div class="acct-stack">
        <div class="card row-card acct-row"><div><h5>Credit card</h5><div class="muted">Credit card</div></div><div style="text-align:right"><div class="amt">${B.gbp(a.credit.balance)}</div><div class="muted">Available ${B.gbp(a.credit.limit + a.credit.balance)}</div></div></div>
        <div class="card row-card acct-row"><div><h5>Saver</h5><div class="muted">Instant saver</div></div><div class="amt">${B.gbp(a.saver.balance)}</div></div>
      </div>
      <div class="section-h"><span>Widgets</span><a href="#">Edit ›</a></div>
      <div class="card forecast" id="forecastCard"></div>
      <div class="card reminders" id="remindersCard"></div>
      <div class="widgets">
        <div class="card tappable" id="learnWidget"><h6>Money skills</h6><div style="font-size:24px;margin:2px 0 4px">🎓</div><b style="font-size:15px">${window.Learn ? window.Learn.doneCount() : 0}/${window.Learn ? window.Learn.TOPICS.length : 8} topics</b><div class="muted">${window.Learn ? window.Learn.xp() : 0} XP · Quiz yourself</div></div>
        <div class="card tappable" id="benefitWidget"><h6>Benefits check</h6><div style="font-size:24px;margin:2px 0 4px">💷</div><b style="font-size:15px">${window.Profile ? '£' + window.Profile.benefits().estimatedAnnualValueLikely.toLocaleString('en-GB') : '—'}</b><div class="muted">a year you may be missing</div></div>
      </div>
      <div class="widgets">
        <div class="card"><h6>Credit score</h6>
          <svg class="gauge" viewBox="0 0 64 40"><path d="M6 36a26 26 0 0 1 52 0" fill="none" stroke="#e9e3f1" stroke-width="7" stroke-linecap="round"/><path d="M6 36a26 26 0 0 1 40-22" fill="none" stroke="#7d3fc0" stroke-width="7" stroke-linecap="round"/><path d="M32 36l12-14" stroke="#3c1053" stroke-width="2.5" stroke-linecap="round"/></svg>
          <div>Track your credit score</div></div>
        <div class="card"><h6>Round Ups</h6><div style="font-size:24px;margin:2px 0 4px">🐷</div><b style="font-size:15px">£50.00</b><div class="muted">Saved this month</div></div>
      </div>
      <div class="card"><div class="muted" style="text-align:center;margin-bottom:8px">Favourite payees</div>
        <div class="payees"><div class="payee"><b>SS</b>Sarah Smith</div><div class="payee"><b>AY</b>Amy Young</div><div class="payee"><b>JJ</b>Jared Johnson</div></div></div>
      <div class="card"><div class="muted" style="text-align:center;margin-bottom:8px">Shortcuts</div>
        <div class="shortcut"><div class="sc-ic">⇄</div><div><b style="font-weight:600">Transfer money</b><div class="muted">From Current to Saver</div></div><span style="margin-left:auto;color:var(--purple)">›</span></div></div>
      <div style="height:40px"></div>`;
    $('#insightBanner').onclick = () => { const on = $('#insightBanner .ib-slide.on'); window.Penny && window.Penny.openAndAsk(on ? on.dataset.ask : 'How am I doing?'); };
    $('.topbar .avatar').onclick = () => window.PennySettings && window.PennySettings.open();
    const ls = $('#learnWidget'); if (ls) ls.onclick = () => show('help');
    const bw = $('#benefitWidget'); if (bw) bw.onclick = () => window.PennySettings && window.PennySettings.showBenefits(window.Profile.benefits());
    $('[data-open="transactions"]').onclick = () => show('transactions');
    renderForecast();
    renderReminders();
  }

  // ---------- forecast widget ----------
  function renderForecast(flash) {
    const el = $('#forecastCard');
    if (!el) return;
    const base = B.forecast();
    const sc = state.scenario ? B.forecast(state.scenario) : null;
    const f = sc || base;
    const cls = f.lowestBeforePayday < 0 ? 'bad' : f.belowBuffer ? 'warn' : '';
    const verdict = sc
      ? f.exceedsOverdraft ? ['bad', `This would push you past your overdraft limit.`]
        : f.goesOverdrawn ? ['bad', `You'd dip into your overdraft — lowest ${B.gbp(f.lowestInHorizon)} on ${B.fmtDate(new Date(f.lowestInHorizonDate))}.`]
        : f.belowBuffer ? ['warn', `Leaves ${B.gbp(f.lowestBeforePayday)} before payday — under your ${B.gbp0(f.buffer)} buffer.`]
        : ['ok', `Stays above your ${B.gbp0(f.buffer)} buffer — ${B.gbp(f.headroomAboveBuffer)} to spare.`]
      : ['', `About ${B.gbp0(base.reservedBeforePayday.total)} is set aside for bills & essentials. ${B.gbp0(Math.max(0, base.headroomAboveBuffer))} is free to spend above your buffer.`];
    el.innerHTML = `
      <div class="fc-head">
        <div><h4>Future balance</h4><div class="muted">Lowest before payday</div><div class="big ${cls}">${B.gbp(f.lowestBeforePayday)}</div></div>
        <div class="right"><div class="muted">Payday</div><b style="font-size:13.5px">${B.fmtDate(new Date(f.assumedPayday))}</b><div class="muted" style="margin-top:4px">Today ${B.gbp(B.accounts.current.balance)}</div></div>
      </div>
      <div class="fc-chip ${sc ? 'on' : ''}"><span>🔮 <b>What if:</b> ${esc(state.scenario?.label || 'Scenario')}<br><small>Preview only · your actual balance hasn't changed</small></span><button id="fcClear">Clear</button></div>
      ${chartSVG(base, sc)}
      <div class="fc-legend"><span><i style="background:#5a287d"></i>Expected</span>${sc ? '<span><i style="background:#d6327e"></i>What if</span>' : ''}<span><i style="background:#e4d7f1;height:8px"></i>Likely range</span><span><i style="background:#c4314b"></i>Buffer ${B.gbp0(f.buffer)}</span></div>
      <div class="fc-verdict ${verdict[0]}">${verdict[1]}</div>
      <details class="fc-assume"><summary>How we worked this out ›</summary><ul>${f.assumptions.map((x) => `<li>${esc(x)}</li>`).join('')}<li>Range shows essentials varying ±${f.essentialsUncertaintyPct}% (worst case ${B.gbp(f.worstCaseLowest)})</li></ul></details>`;
    const c = $('#fcClear');
    if (c) c.onclick = () => clearScenario();
    if (flash) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
    }
  }

  function chartSVG(base, sc) {
    const W = 330, H = 150, padL = 4, padR = 4, padT = 14, padB = 18;
    const main = sc || base;
    const all = [...base.series, ...(sc ? sc.series : [])];
    const n = main.series.length - 1;
    let max = Math.max(...all.map((p) => p.high), main.buffer) * 1.05;
    let min = Math.min(...all.map((p) => p.low), 0);
    min = min < 0 ? min * 1.1 : -max * 0.06;
    const x = (i) => padL + (i / n) * (W - padL - padR);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const line = (s, k) => s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
    const band = main.series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.high).toFixed(1)}`).join('') +
      main.series.slice().reverse().map((p, j) => `L${x(n - j).toFixed(1)},${y(p.low).toFixed(1)}`).join('') + 'Z';
    const pdIdx = main.series.findIndex((p) => p.date === main.assumedPayday);
    const lowIdx = main.series.findIndex((p) => p.date === main.lowestDate);
    const ticks = [0, Math.round(n / 3), Math.round((2 * n) / 3), n].map((i) => `<text x="${Math.min(W - 26, Math.max(2, x(i) - 12))}" y="${H - 3}" font-size="9" fill="#8c8494">${i === 0 ? 'Today' : B.fmtShort(new Date(main.series[i].date))}</text>`).join('');
    return `<svg class="fc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d3fc0" stop-opacity=".18"/><stop offset="1" stop-color="#7d3fc0" stop-opacity="0"/></linearGradient></defs>
      <path d="${band}" fill="#e4d7f1" opacity=".75"/>
      <line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="#b9aec4" stroke-width="1"/>
      <line x1="0" x2="${W}" y1="${y(main.buffer)}" y2="${y(main.buffer)}" stroke="#c4314b" stroke-width="1" stroke-dasharray="4 3"/>
      ${pdIdx > 0 ? `<line x1="${x(pdIdx)}" x2="${x(pdIdx)}" y1="${padT - 6}" y2="${H - padB}" stroke="#5a287d" stroke-width="1" stroke-dasharray="2 3"/><text x="${x(pdIdx) + 3}" y="${padT - 3}" font-size="9" fill="#5a287d" font-weight="600">Payday 💷</text>` : ''}
      <path d="${line(base.series, 'balance')}L${x(n)},${H - padB}L${x(0)},${H - padB}Z" fill="url(#fg)" opacity="${sc ? 0.4 : 1}"/>
      <path d="${line(base.series, 'balance')}" fill="none" stroke="#5a287d" stroke-width="2" opacity="${sc ? 0.45 : 1}"/>
      ${sc ? `<path d="${line(sc.series, 'balance')}" fill="none" stroke="#d6327e" stroke-width="2.4" stroke-dasharray="5 3"/>` : ''}
      ${lowIdx >= 0 ? `<circle cx="${x(lowIdx)}" cy="${y(main.series[lowIdx].balance)}" r="3.5" fill="${sc ? '#d6327e' : '#5a287d'}" stroke="#fff" stroke-width="1.5"/>` : ''}
      ${ticks}
    </svg>`;
  }

  function setScenario(scenario) {
    state.scenario = scenario;
    if (state.tab !== 'home') show('home');
    renderForecast(true);
    const el = $('#forecastCard');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return B.forecast(scenario);
  }
  function clearScenario() {
    state.scenario = null;
    renderForecast(true);
  }
  function setBuffer(n) {
    B.settings.buffer = Math.max(0, Math.round(+n));
    const bv = $('#bufVal'); if (bv) bv.textContent = B.gbp0(B.settings.buffer);
    renderForecast(true);
    return B.settings.buffer;
  }

  // ---------- reminders ----------
  function renderReminders(newIds = []) {
    const el = $('#remindersCard');
    if (!el) return;
    const open = state.reminders.filter((r) => !r.done).length;
    el.innerHTML = `<h4><span>✅ Reminders</span><span class="muted">${open} open</span></h4>` +
      (state.reminders.length ? state.reminders.map((r) => `<label class="rem ${r.done ? 'done' : ''} ${newIds.includes(r.id) ? 'new' : ''}"><input type="checkbox" data-id="${r.id}" ${r.done ? 'checked' : ''}/><span>${esc(r.title)}<small>${esc(r.due || '')}${r.source ? ' · from Penny' : ''}</small></span></label>`).join('') : '<div class="empty">No reminders yet.</div>');
    el.querySelectorAll('input').forEach((i) => (i.onchange = () => { const r = state.reminders.find((x) => x.id === +i.dataset.id); r.done = i.checked; renderReminders(); }));
  }
  function addReminders(items) {
    const ids = [];
    for (const it of items || []) {
      if (!it || !it.title) continue;
      const id = Date.now() + Math.floor(Math.random() * 1e6);
      state.reminders.unshift({ id, title: it.title, due: it.due || '', done: false, source: 'penny' });
      ids.push(id);
    }
    renderReminders(ids);
    return ids.length;
  }

  // ---------- INSIGHTS ----------
  function renderInsights() {
    const months = B.monthlyTotals(6);
    const max = Math.max(...months.map((m) => m.total), 1);
    const pc = B.payCycleComparison();
    const lp = B.lastPayday(), np = B.nextPayday();
    const total = B.diffDays(lp, np), done = B.diffDays(lp, B.TODAY), left = total - done;
    const avg = B.categoryMonthlyAverages();
    const monthlyAvg = Object.entries(avg).filter(([c]) => c !== 'Card repayment').reduce((a, [, v]) => a + v, 0);
    const cats = Object.entries(pc.byCategory).sort((a, b) => b[1] - a[1]);
    const cmax = cats[0] ? cats[0][1] : 1;
    const diff = pc.difference;
    $('#view-insights').innerHTML = `
      <div class="navbar"><button data-back>‹</button><h2>Insights</h2><span style="width:30px;color:var(--purple);font-weight:800">•••</span></div>
      <div class="tabs2"><button>Transactions</button><button class="on">Spending</button></div>
      <div class="cycle">${left} days remaining<div class="cycle-bar"><span style="width:${(done / total) * 100}%"></span></div>
        <div style="color:var(--purple);font-weight:600">‹ &nbsp; ${B.fmtShort(lp)} - ${B.fmtShort(np)} &nbsp; ›</div>
        <h3>${B.gbp(pc.spentSoFar)}</h3></div>
      <div class="bars">${months.map((m) => `<div class="${m.partial ? 'cur' : ''}" style="height:${(m.total / max) * 100}%" title="${B.gbp(m.total)}"></div>`).join('')}</div>
      <div class="bar-labels">${months.map((m) => `<span>${m.label}</span>`).join('')}</div>
      <div class="card compare" style="margin-top:14px"><div class="ci">${diff >= 0 ? '↑' : '↓'}</div><div>You've spent ${B.gbp(Math.abs(diff))} ${diff >= 0 ? 'more' : 'less'} compared to this time last pay cycle.</div></div>
      <div class="section-h"><span>Spending averages explained ⓘ</span></div>
      <div class="card avgs"><div>Daily<b>${B.gbp(monthlyAvg / 30.4)}</b></div><div>Weekly<b>${B.gbp(monthlyAvg / 4.35)}</b></div><div>Monthly<b>${B.gbp(monthlyAvg)}</b></div></div>
      <div class="section-h"><span>This pay cycle by category</span></div>
      <div class="card">${cats.map(([c, v]) => `<div class="cat-row"><span>${CAT_EMOJI[c] || '•'} ${c}</span><b class="amt">${B.gbp(v)}</b><div class="track"><span style="width:${(v / cmax) * 100}%"></span></div></div>`).join('')}</div>`;
    $('[data-back]', $('#view-insights')).onclick = () => show('home');
    $('.tabs2 button', $('#view-insights')).onclick = () => show('transactions');
  }

  // ---------- TRANSACTIONS ----------
  function renderTransactions() {
    const rows = B.tx.slice(0, 80);
    const groups = {};
    for (const t of rows) (groups[t.date] = groups[t.date] || []).push(t);
    $('#view-transactions').innerHTML = `
      <div class="navbar"><button data-back>‹</button><h2>My transactions</h2><span style="width:30px;color:var(--purple);font-weight:800">•••</span></div>
      <div class="tabs2"><button class="on">Transactions</button><button>Spending</button></div>
      ${Object.entries(groups).map(([d, ts]) => `<div class="tx-date">${B.iso(B.TODAY) === d ? 'Today' : B.fmtDate(new Date(d))}</div>` +
        ts.map((t) => `<div class="tx"><div class="tx-l"><div class="tx-ic">${CAT_EMOJI[t.cat] || '•'}</div><div>${esc(t.merchant)}<small>${esc(t.note || t.cat)}</small></div></div><div class="amt ${t.amount > 0 ? 'in' : ''}">${t.amount > 0 ? '+' : ''}${B.gbp(t.amount)}</div></div>`).join('')).join('')}`;
    $('[data-back]', $('#view-transactions')).onclick = () => show('home');
    $('.tabs2 button:last-child', $('#view-transactions')).onclick = () => show('insights');
  }

  // ---------- PAYMENTS ----------
  function renderPayments() {
    const np = B.nextPayday();
    const list = B.BILLS.map((b) => ({ ...b, next: B.nextBillDate(b) })).sort((a, b) => a.next - b.next);
    $('#view-payments').innerHTML = `
      <div class="navbar"><span style="width:30px"></span><h2>Payments</h2><span style="width:30px"></span></div>
      <div class="section-h"><span>Upcoming direct debits & subscriptions</span></div>
      <div class="card" style="padding:4px 0">${list.map((b) => `<div class="tx" style="border-radius:0"><div class="tx-l"><div class="tx-ic">${CAT_EMOJI[b.cat] || '•'}</div><div>${esc(b.name)}<small>${B.fmtDate(b.next)}${b.next < np ? ' · before payday' : ''}${b.history ? ' · <b style="color:var(--red)">price rise</b>' : ''}</small></div></div><div class="amt">${B.gbp(-b.amount)}</div></div>`).join('')}</div>
      <div class="section-h"><span>Emails sent with Penny</span></div>
      <div class="card" id="sentList">${state.sentEmails.length ? state.sentEmails.map((e) => `<div style="padding:6px 0;font-size:13.5px"><b>${esc(e.subject)}</b><span class="sent-badge">Sent</span><div class="muted">To ${esc(e.to)} · ${e.at}</div></div>`).join('') : '<div class="muted">Nothing yet.</div>'}</div>`;
  }

  function renderPlaceholder(id, title, text) {
    $('#view-' + id).innerHTML = `<div class="navbar"><span style="width:30px"></span><h2>${title}</h2><span style="width:30px"></span></div><div class="placeholder">${text}<br><br><button class="btn primary" id="ph-${id}">Talk to Penny</button></div>`;
    $('#ph-' + id).onclick = () => window.Penny && window.Penny.open();
  }

  function renderLearn() {
    const v = $('#view-help');
    v.innerHTML = `<div class="navbar"><span style="width:30px"></span><h2>Help & learning</h2><span style="width:30px"></span></div>` + (window.Learn ? window.Learn.hubHTML() : '');
    if (window.Learn) window.Learn.bindHub(v);
  }

  // ---------- bill breakdown (from an uploaded bill) ----------
  function showBillBreakdown(d) {
    const dir = d.rtl ? 'rtl' : 'auto';
    const s = openSheet(`<div dir="${dir}">
      <div class="sum-head"><div class="ib-orb"></div><div><h3>${esc(d.title || 'Your bill explained')}</h3><div class="sub">${esc(d.issuer || '')}${d.reference ? ' · ' + esc(d.reference) : ''}</div></div></div>
      <div class="bill-key">${d.total_due ? `<div><small>${esc(d.labels?.total || 'Total to pay')}</small><b>${esc(d.total_due)}</b></div>` : ''}${d.due_date ? `<div><small>${esc(d.labels?.due || 'Due')}</small><b>${esc(d.due_date)}</b></div>` : ''}</div>
      ${d.summary ? `<div class="sum-card">${esc(d.summary)}</div>` : ''}
      ${(d.items || []).length ? `<div class="sum-card bill-items">${d.items.map((i) => `<div class="bill-item"><div class="bi-top"><b>${esc(i.label)}</b><span class="amt">${esc(i.amount || '')}</span></div><div class="muted">${esc(i.explanation || '')}</div></div>`).join('')}</div>` : ''}
      ${(d.watch_out || []).length ? `<div class="warn-note">⚠️ ${d.watch_out.map(esc).join('<br>⚠️ ')}</div>` : ''}
      ${(d.actions || []).length ? `<div class="sum-card"><b>${esc(d.labels?.actions || 'What you can do')}</b><ul>${d.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="btn-row"><button class="btn ghost" id="billRem">Remind me to pay</button><button class="btn primary" id="billDone">Got it</button></div>`);
    s.querySelector('#billDone').onclick = closeSheet;
    s.querySelector('#billRem').onclick = () => { addReminders([{ title: `Pay ${d.issuer || 'bill'}${d.total_due ? ' — ' + d.total_due : ''}`, due: d.due_date || '' }]); toast('Reminder added', d.issuer || 'Bill', '✅', '#5a287d'); closeSheet(); };
  }

  // ---------- savings plan card ----------
  function showPlan(pl) {
    const target = B.addDays(B.TODAY, Math.round(pl.months * 30.4));
    const s = openSheet(`<div class="sum-head"><div class="ib-orb"></div><div><h3>Plan: ${esc(pl.label)}</h3><div class="sub">Goal ${B.gbp0(pl.goal)} by ${B.fmtDate(target)}</div></div></div>
      <div class="bill-key"><div><small>Each month</small><b>${B.gbp(pl.perMonth)}</b></div><div><small>Each week</small><b>${B.gbp(pl.perWeek)}</b></div></div>
      <div class="sum-card"><b>Where it could come from</b>${pl.ideas.map((i) => `<div class="bill-item"><div class="bi-top"><span>${esc(i.idea)}</span><b class="amt" style="color:var(--green)">+${B.gbp(i.saves)}/mo</b></div><div class="muted">${esc(i.basis)}</div></div>`).join('')}
      <div class="bill-item"><div class="bi-top"><b>Total from these ideas</b><b class="amt">${B.gbp(pl.ideasTotalPerMonth)}/mo</b></div><div class="muted">${pl.coversGoal ? '✅ Enough to hit your goal on time' : `About ${B.gbp(Math.max(0, pl.perMonth - pl.ideasTotalPerMonth))}/mo short — a longer timeline would close the gap`}</div></div></div>
      <div class="ben-note">Free to spend above your buffer before payday: ${B.gbp(Math.max(0, pl.freeToSpendThisCycle))}. Nothing has been moved — this is a plan.</div>
      <div class="btn-row"><button class="btn primary" id="planOk">Looks good</button></div>`);
    s.querySelector('#planOk').onclick = closeSheet;
  }

  // ---------- navigation ----------
  function show(tab) {
    state.tab = tab;
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + tab));
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === (tab === 'transactions' ? 'home' : tab)));
    if (tab === 'home') renderHome();
    if (tab === 'insights') renderInsights();
    if (tab === 'transactions') renderTransactions();
    if (tab === 'payments') renderPayments();
    if (tab === 'help') renderLearn();
    if (tab === 'apply') renderPlaceholder('apply', 'Apply', 'Products and applications would live here.');
    const v = $('#view-' + tab); if (v) v.scrollTop = 0;
  }
  document.querySelectorAll('.tabbar button').forEach((b) => (b.onclick = () => show(b.dataset.tab)));

  // ---------- toast ----------
  let toastT;
  function toast(title, body, icon = '✓', color) {
    $('#toastTitle').textContent = title;
    $('#toastBody').textContent = body || '';
    const ic = $('.toast-icon'); ic.textContent = icon; ic.style.background = color || '';
    const el = $('#toast');
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 3400);
  }

  // ---------- sheets ----------
  function openSheet(html) {
    const s = $('#sheet');
    s.innerHTML = '<div class="grab"></div>' + html;
    s.classList.add('show');
    $('#sheetBackdrop').classList.add('show');
    window.dispatchEvent(new Event('app:sheet-opened'));
    return s;
  }
  function closeSheet() {
    $('#sheet').classList.remove('show');
    $('#sheetBackdrop').classList.remove('show');
    window.dispatchEvent(new Event('app:sheet-closed'));
  }
  $('#sheetBackdrop').onclick = closeSheet;

  // ---------- email composer ----------
  function openEmailDraft(d, opts = {}) {
    state.email = { to: d.recipient_email || '', name: d.recipient_name || '', subject: d.subject || '', body: d.body || '', sent: false };
    const s = openSheet(`
      <h3>Review email</h3>
      <div class="email-note">✨ Penny drafted this from your account data. Edit anything before sending.</div>
      <div class="email">
        <div class="f"><label>To</label><input id="emTo" value="${esc(state.email.name)}${state.email.to ? ' <' + esc(state.email.to) + '>' : ''}"/></div>
        <div class="f"><label>From</label><span style="color:var(--ink-2)">${esc(B.customer.email)}</span></div>
        <div class="f"><label>Subject</label><input id="emSubj" value="${esc(state.email.subject)}"/></div>
        <textarea id="emBody">${esc(state.email.body)}</textarea>
      </div>
      <div class="btn-row"><button class="btn ghost" id="emCancel">Not now</button><button class="btn primary" id="emSend">Send email</button></div>`);
    const sync = () => {
      if (!state.email) return;
      const toVal = $('#emTo').value; const m = toVal.match(/<([^>]+)>/);
      state.email.to = m ? m[1] : toVal.includes('@') ? toVal.trim() : state.email.to;
      state.email.name = toVal.replace(/<[^>]+>/, '').trim() || state.email.name;
      state.email.subject = $('#emSubj').value; state.email.body = $('#emBody').value;
    };
    s.querySelectorAll('input,textarea').forEach((i) => (i.oninput = sync));
    $('#emCancel').onclick = () => { closeSheet(); toast('Draft saved', "Penny will keep it for later.", '✎', '#7d3fc0'); };
    $('#emSend').onclick = () => { sendCurrentEmail(); opts.onSent && opts.onSent(); };
    return state.email;
  }
  function sendCurrentEmail() {
    const e = state.email;
    if (!e) return { sent: false, reason: 'No draft is open.' };
    if (e.sent) return { sent: true, already: true, to: e.to, subject: e.subject };
    if ($('#emSubj')) { $('#emSubj').disabled = true; $('#emBody').disabled = true; }
    e.sent = true;
    state.sentEmails.unshift({ to: e.name || e.to, subject: e.subject, at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) });
    closeSheet();
    toast('Email sent', `To ${e.name || e.to} — "${e.subject}"`, '✉', '#1f8a4c');
    window.dispatchEvent(new CustomEvent('penny:email-sent', { detail: e }));
    return { sent: true, to: e.to, recipient: e.name, subject: e.subject, finalBody: e.body };
  }

  window.App = { state, show, showBillBreakdown, showPlan, toast, openSheet, closeSheet, setScenario, clearScenario, setBuffer, addReminders, renderReminders, openEmailDraft, sendCurrentEmail, esc };
  show('home');
  ['profile:changed', 'learn:changed'].forEach((ev) => window.addEventListener(ev, () => { if (state.tab === 'home') renderHome(); if (state.tab === 'help') renderLearn(); }));
  // rotate the Penny insight banner
  setInterval(() => {
    const sl = document.querySelectorAll('#insightBanner .ib-slide'); if (sl.length < 2) return;
    const dots = document.querySelectorAll('#insightBanner .ib-dots i');
    let i = [...sl].findIndex((x) => x.classList.contains('on'));
    sl[i].classList.remove('on'); dots[i] && dots[i].classList.remove('on');
    i = (i + 1) % sl.length; sl[i].classList.add('on'); dots[i] && dots[i].classList.add('on');
  }, 6000);
})();
