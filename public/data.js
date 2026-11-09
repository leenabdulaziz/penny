/* Bank data + financial engine.
 * Everything numeric (forecasts, totals, comparisons) is calculated here in code.
 * The language model only interprets requests and explains these results.
 * Scenarios are computed on copies — they never touch the real account balance. */
(function () {
  const DAY = 86400000;
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  // The demo story (e.g. £1,250 balance, ~£1,000 reserved, £250 free before payday) is tuned to this date,
  // so the numbers are identical every time you present. Add ?today=real to the URL to use the real date.
  const DEMO_DATE = new Date(2026, 10, 7);
  const TODAY = sod(/[?&]today=real/.test((typeof location !== 'undefined' && location.search) || '') ? new Date() : DEMO_DATE);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((sod(b) - sod(a)) / DAY);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtShort = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const r2 = (n) => Math.round(n * 100) / 100;
  const gbp = (n, sign) => {
    const s = '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return '-' + s;
    return sign ? '+' + s : s;
  };
  const gbp0 = (n) => (n < 0 ? '-' : '') + '£' + Math.round(Math.abs(n)).toLocaleString('en-GB');

  // ---------- customer + accounts ----------
  const customer = { firstName: 'Leen', lastName: '', email: 'leen@example.com', initials: 'L' };

  const accounts = {
    current: { id: 'current', name: 'Current', type: 'Current', number: '41290388', sort: '60-12-44', balance: 1250.0, overdraft: 1000 },
    credit: { id: 'credit', name: 'Credit card', type: 'Credit card', balance: -250.0, limit: 1000 },
    saver: { id: 'saver', name: 'Saver', type: 'Instant saver', balance: 400.0 },
  };

  const SALARY = { amount: 2350, payer: 'Northlight Studios Ltd', day: 28 };

  // Recurring payments. `history` overrides the amount N months back (energy price rise story).
  const BILLS = [
    { name: 'Rent', payee: 'Harbour Lettings', day: 1, amount: 750, cat: 'Rent', kind: 'bill' },
    { name: 'Water', payee: 'Riverside Water', day: 8, amount: 38, cat: 'Bills', kind: 'bill' },
    { name: 'Disney+', payee: 'Disney+', day: 9, amount: 7.99, cat: 'Subscriptions', kind: 'subscription' },
    { name: 'Council Tax', payee: 'Kingsbridge Council', day: 10, amount: 142, cat: 'Bills', kind: 'bill' },
    { name: 'Bright Energy', payee: 'Bright Energy', day: 12, amount: 96, cat: 'Bills', kind: 'bill',
      history: { '-1': 79.5, '-2': 68, '-3': 68, '-4': 68, '-5': 68, '-6': 68, '-7': 68 },
      contact: 'customerservice@brightenergy.co.uk', account: 'BE-2209-4471' },
    { name: 'VoxTel Mobile', payee: 'VoxTel Mobile', day: 14, amount: 28, cat: 'Bills', kind: 'bill', contact: 'help@voxtel.co.uk' },
    { name: 'Netflix', payee: 'Netflix', day: 15, amount: 10.99, cat: 'Subscriptions', kind: 'subscription' },
    { name: 'Spotify', payee: 'Spotify', day: 17, amount: 11.99, cat: 'Subscriptions', kind: 'subscription' },
    { name: 'PureGym', payee: 'PureGym', day: 18, amount: 34.99, cat: 'Subscriptions', kind: 'subscription' },
    { name: 'Broadband', payee: 'Fibrelink Broadband', day: 20, amount: 32, cat: 'Bills', kind: 'bill', contact: 'support@fibrelink.co.uk' },
    { name: 'Car insurance', payee: 'Shield Insurance', day: 22, amount: 68.5, cat: 'Bills', kind: 'bill' },
    { name: 'iCloud+', payee: 'Apple iCloud', day: 24, amount: 2.99, cat: 'Subscriptions', kind: 'subscription' },
    { name: 'Credit card payment', payee: 'Credit card', day: 25, amount: 50, cat: 'Card repayment', kind: 'bill' },
  ];

  const ESSENTIAL_CATS = ['Groceries', 'Transport'];

  // ---------- dates ----------
  function prevWeekday(d) { const x = new Date(d); while (x.getDay() === 0 || x.getDay() === 6) x.setDate(x.getDate() - 1); return x; }
  function paydayIn(year, month) { return prevWeekday(new Date(year, month, SALARY.day)); }
  function nextPayday(from = TODAY) {
    let p = paydayIn(from.getFullYear(), from.getMonth());
    if (p <= from) p = paydayIn(from.getFullYear(), from.getMonth() + 1);
    return p;
  }
  function lastPayday(from = TODAY) {
    let p = paydayIn(from.getFullYear(), from.getMonth());
    if (p > from) p = paydayIn(from.getFullYear(), from.getMonth() - 1);
    return p;
  }
  function billOn(bill, date) {
    const dim = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() === Math.min(bill.day, dim);
  }
  function billAmount(bill, date) {
    const monthsBack = (date.getFullYear() - TODAY.getFullYear()) * 12 + date.getMonth() - TODAY.getMonth();
    if (bill.history && monthsBack < 0 && bill.history[String(monthsBack)] != null) return bill.history[String(monthsBack)];
    return bill.amount;
  }

  // ---------- generate transaction history (seeded, relative to today) ----------
  function rngFrom(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rngFrom(20261107);
  const between = (a, b) => r2(a + rand() * (b - a));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const tx = [];
  let txId = 1;
  function add(date, merchant, amount, cat, extra = {}) {
    tx.push({ id: 't' + txId++, date: iso(date), merchant, amount: r2(amount), cat, ...extra });
  }

  const HISTORY_DAYS = 200;
  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const d = addDays(TODAY, -i);
    const dow = d.getDay();
    const weekday = dow > 0 && dow < 6;
    if (iso(d) === iso(paydayIn(d.getFullYear(), d.getMonth()))) add(d, SALARY.payer, SALARY.amount, 'Income', { note: 'Salary' });
    for (const b of BILLS) if (billOn(b, d) && i > 0) add(d, b.payee, -billAmount(b, d), b.cat, { recurring: true, bill: b.name });
    if (i === 0) { add(d, 'Pret A Manger', -3.85, 'Eating out'); continue; }
    if (rand() < 0.5) add(d, pick(['Tesco', "Sainsbury's", 'Aldi', 'Lidl', 'M&S Food', 'Co-op']), -between(10, 44), 'Groceries');
    if (weekday) add(d, 'TfL Travel', -between(6.8, 8.6), 'Transport');
    else if (rand() < 0.3) add(d, 'TfL Travel', -between(3.2, 6.4), 'Transport');
    if (i % 11 === 3) add(d, 'Shell', -between(48, 62), 'Transport');
    if (weekday && rand() < 0.5) add(d, pick(['Pret A Manger', 'Costa Coffee', 'Gail\'s Bakery']), -between(3.2, 4.8), 'Eating out');
    if (weekday && rand() < 0.2) add(d, pick(['Itsu', 'Leon', 'Wasabi', 'Tortilla']), -between(7.5, 12.5), 'Eating out');
    if (!weekday && rand() < 0.35) add(d, pick(['Wagamama', 'Franco Manca', 'The Crown & Anchor', 'Honest Burgers']), -between(22, 46), 'Eating out');
    if (rand() < 0.1 && i > 7) add(d, pick(['Deliveroo', 'Just Eat', 'Uber Eats']), -between(17, 31), 'Takeaways');
    if (rand() < 0.07 && i > 7) add(d, pick(['Amazon', 'ASOS', 'Boots', 'Uniqlo', 'Waterstones']), -between(11, 48), 'Shopping');
    if (rand() < 0.04 && i > 7) add(d, pick(['Odeon', 'Steam', 'Everyman Cinema']), -between(9, 22), 'Entertainment');
    if (rand() < 0.04 && i > 7) add(d, 'Uber', -between(9, 16), 'Taxis');
  }
  // This week's story: a busier-than-usual week.
  const story = [
    [1, 'Uber', -18.6, 'Taxis'], [1, 'Deliveroo', -24.4, 'Takeaways'],
    [2, 'Dishoom', -68.4, 'Eating out', 'Birthday dinner'], [2, 'Uber', -14.2, 'Taxis'],
    [3, 'ASOS', -59.99, 'Shopping'], [4, 'Ticketmaster', -45.0, 'Entertainment', 'Concert ticket'],
    [4, 'Uber', -11.8, 'Taxis'], [5, 'Deliveroo', -27.5, 'Takeaways'], [6, 'Amazon', -23.49, 'Shopping'],
  ];
  for (const [ago, m, a, c, note] of story) add(addDays(TODAY, -ago), m, a, c, note ? { note } : {});
  tx.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // ---------- analysis ----------
  const isSpend = (t) => t.amount < 0 && t.cat !== 'Card repayment';
  function spendBetween(from, to) { // inclusive dates
    const a = iso(from), b = iso(to);
    const rows = tx.filter((t) => t.date >= a && t.date <= b && isSpend(t));
    const byCat = {}, byMerchant = {};
    let total = 0;
    for (const t of rows) {
      total += -t.amount;
      byCat[t.cat] = r2((byCat[t.cat] || 0) - t.amount);
      byMerchant[t.merchant] = r2((byMerchant[t.merchant] || 0) - t.amount);
    }
    const top = Object.entries(byMerchant).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([merchant, amt]) => ({ merchant, amount: amt }));
    return { from: iso(from), to: iso(to), total: r2(total), byCategory: byCat, topMerchants: top, count: rows.length };
  }

  function essentialsDaily() {
    const days = 56;
    const s = spendBetween(addDays(TODAY, -days), addDays(TODAY, -1));
    const total = ESSENTIAL_CATS.reduce((acc, c) => acc + (s.byCategory[c] || 0), 0);
    return r2(total / days);
  }

  function subscriptions() {
    return BILLS.filter((b) => b.kind === 'subscription').map((b) => ({ name: b.name, monthly: b.amount, nextDate: iso(nextBillDate(b)) }));
  }
  function nextBillDate(b) {
    for (let i = 1; i <= 62; i++) { const d = addDays(TODAY, i); if (billOn(b, d)) return d; }
    return null;
  }

  function weekComparison() {
    const thisWeek = spendBetween(addDays(TODAY, -6), TODAY);
    const lastWeek = spendBetween(addDays(TODAY, -13), addDays(TODAY, -7));
    // typical week = average over prior 8 weeks, excluding bills/rent
    const discretionary = (s) => s.total - ['Rent', 'Bills', 'Subscriptions'].reduce((a, c) => a + (s.byCategory[c] || 0), 0);
    let typ = 0;
    for (let w = 1; w <= 8; w++) typ += discretionary(spendBetween(addDays(TODAY, -6 - 7 * w), addDays(TODAY, -7 * w)));
    const cats = new Set([...Object.keys(thisWeek.byCategory), ...Object.keys(lastWeek.byCategory)]);
    const deltas = [...cats].filter((c) => !['Rent', 'Bills', 'Subscriptions', 'Income'].includes(c)).map((c) => ({ category: c, thisWeek: thisWeek.byCategory[c] || 0, lastWeek: lastWeek.byCategory[c] || 0, change: r2((thisWeek.byCategory[c] || 0) - (lastWeek.byCategory[c] || 0)) }))
      .sort((a, b) => b.change - a.change);
    const notable = tx.filter((t) => t.date >= iso(addDays(TODAY, -6)) && isSpend(t) && !t.recurring && -t.amount >= 20)
      .map((t) => ({ date: t.date, merchant: t.merchant, amount: -t.amount, category: t.cat, note: t.note }));
    return {
      thisWeekTotal: thisWeek.total, lastWeekTotal: lastWeek.total,
      thisWeekDiscretionary: r2(discretionary(thisWeek)), typicalWeekDiscretionary: r2(typ / 8),
      categoryChanges: deltas, notableThisWeek: notable,
    };
  }

  function payCycleComparison() {
    const lp = lastPayday(), daysIn = diffDays(lp, TODAY);
    const prevLp = lastPayday(addDays(lp, -1));
    const cur = spendBetween(lp, TODAY);
    const prev = spendBetween(prevLp, addDays(prevLp, daysIn));
    return { cycleStart: iso(lp), daysIntoCycle: daysIn + 1, spentSoFar: cur.total, samePointLastCycle: prev.total, difference: r2(cur.total - prev.total), byCategory: cur.byCategory, lastCycleByCategory: prev.byCategory };
  }

  function monthlyTotals(n = 6) {
    const out = [];
    for (let k = n - 1; k >= 0; k--) {
      const start = new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1);
      const end = k === 0 ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - k + 1, 0);
      const s = spendBetween(start, end);
      out.push({ label: start.toLocaleDateString('en-GB', { month: 'short' }), total: s.total, byCategory: s.byCategory, partial: k === 0 });
    }
    return out;
  }

  function categoryMonthlyAverages() { // over the last 3 full months
    const out = {};
    for (let k = 1; k <= 3; k++) {
      const s = spendBetween(new Date(TODAY.getFullYear(), TODAY.getMonth() - k, 1), new Date(TODAY.getFullYear(), TODAY.getMonth() - k + 1, 0));
      for (const [c, v] of Object.entries(s.byCategory)) out[c] = (out[c] || 0) + v / 3;
    }
    for (const c in out) out[c] = r2(out[c]);
    return out;
  }

  // ---------- forecast ("financial time travel") ----------
  const settings = { buffer: 100, essentialsUncertainty: 0.2 };

  /** scenario: { spends:[{amount,label,daysFromNow}], salaryDelayDays, monthlySaving, cancelSubscriptions:[names], label } */
  function forecast(scenario = {}) {
    const spends = (scenario.spends || []).filter((s) => s && +s.amount > 0);
    const delay = Math.max(0, Math.round(+scenario.salaryDelayDays || 0));
    const saving = Math.max(0, +scenario.monthlySaving || 0);
    const cancelled = (scenario.cancelSubscriptions || []).map((s) => String(s).toLowerCase());
    const buffer = scenario.buffer != null ? +scenario.buffer : settings.buffer;
    const ess = essentialsDaily();
    const unc = settings.essentialsUncertainty;
    const expectedPayday = nextPayday();
    const payday = addDays(expectedPayday, delay);
    const horizon = Math.max(35, diffDays(TODAY, payday) + 10);
    const isCancelled = (b) => cancelled.some((c) => b.name.toLowerCase().includes(c) || c.includes(b.name.toLowerCase()));

    let bal = accounts.current.balance, low = bal, high = bal;
    const series = [{ date: iso(TODAY), day: 0, balance: r2(bal), low: r2(low), high: r2(high) }];
    const events = [];
    for (const s of spends) if ((+s.daysFromNow || 0) <= 0) { bal -= +s.amount; low -= +s.amount; high -= +s.amount; events.push({ date: iso(TODAY), label: s.label || 'Planned spend', amount: -s.amount, type: 'scenario' }); }
    series[0] = { date: iso(TODAY), day: 0, balance: r2(bal), low: r2(low), high: r2(high) };

    let billsBeforePayday = 0, essentialsBeforePayday = 0;
    const billsList = [];
    for (let i = 1; i <= horizon; i++) {
      const d = addDays(TODAY, i);
      let out = ess;
      low -= ess * (1 + unc); high -= ess * (1 - unc);
      const before = d < payday;
      if (before) essentialsBeforePayday += ess;
      for (const b of BILLS) {
        if (!billOn(b, d)) continue;
        if (b.kind === 'subscription' && isCancelled(b)) { events.push({ date: iso(d), label: b.name + ' (cancelled)', amount: 0, type: 'cancelled' }); continue; }
        out += b.amount; low -= b.amount; high -= b.amount;
        events.push({ date: iso(d), label: b.name, amount: -b.amount, type: 'bill' });
        if (before) { billsBeforePayday += b.amount; billsList.push({ date: iso(d), name: b.name, amount: b.amount }); }
      }
      for (const s of spends) if ((+s.daysFromNow || 0) === i) { out += +s.amount; low -= +s.amount; high -= +s.amount; events.push({ date: iso(d), label: s.label || 'Planned spend', amount: -s.amount, type: 'scenario' }); }
      bal -= out;
      if (iso(d) === iso(payday)) {
        bal += SALARY.amount; low += SALARY.amount; high += SALARY.amount;
        events.push({ date: iso(d), label: 'Salary', amount: SALARY.amount, type: 'income' });
        if (saving) { bal -= saving; low -= saving; high -= saving; events.push({ date: iso(d), label: 'Transfer to Saver', amount: -saving, type: 'saving' }); }
      }
      series.push({ date: iso(d), day: i, balance: r2(bal), low: r2(low), high: r2(high) });
    }
    const pre = series.filter((p) => p.date < iso(payday));
    const lowest = pre.reduce((m, p) => (p.balance < m.balance ? p : m), pre[0]);
    const lowestLow = pre.reduce((m, p) => (p.low < m.low ? p : m), pre[0]);
    const lowestOverall = series.reduce((m, p) => (p.balance < m.balance ? p : m), series[0]);
    const scenarioSpendTotal = spends.reduce((a, s) => a + +s.amount, 0);
    const monthlySubsCancelled = BILLS.filter((b) => b.kind === 'subscription' && isCancelled(b)).reduce((a, b) => a + b.amount, 0);
    const reserved = r2(billsBeforePayday + essentialsBeforePayday);
    return {
      scenarioLabel: scenario.label || null,
      isScenario: !!(spends.length || delay || saving || cancelled.length),
      today: iso(TODAY), currentBalance: accounts.current.balance,
      expectedPayday: iso(expectedPayday), assumedPayday: iso(payday), salaryDelayDays: delay, salary: SALARY.amount,
      reservedBeforePayday: { bills: r2(billsBeforePayday), essentials: r2(essentialsBeforePayday), total: reserved, billList: billsList },
      essentialsPerDay: ess, essentialsUncertaintyPct: unc * 100,
      scenarioSpendTotal: r2(scenarioSpendTotal), monthlySaving: saving, subscriptionsCancelledMonthly: r2(monthlySubsCancelled),
      balanceBeforePayday: pre.length ? pre[pre.length - 1].balance : bal,
      lowestBeforePayday: lowest ? lowest.balance : bal, lowestDate: lowest ? lowest.date : iso(TODAY),
      worstCaseLowest: lowestLow ? r2(lowestLow.low) : bal,
      bestCaseLowest: lowest ? r2(pre.reduce((m, p) => Math.min(m, p.high), Infinity)) : bal,
      lowestInHorizon: lowestOverall.balance, lowestInHorizonDate: lowestOverall.date,
      buffer, headroomAboveBuffer: lowest ? r2(lowest.balance - buffer) : 0,
      belowBuffer: lowest ? lowest.balance < buffer : false,
      goesOverdrawn: series.some((p) => p.balance < 0), daysOverdrawn: series.filter((p) => p.balance < 0).length,
      exceedsOverdraft: series.some((p) => p.balance < -accounts.current.overdraft),
      series, events,
      assumptions: [
        `Salary of ${gbp0(SALARY.amount)} lands ${fmtDate(payday)}${delay ? ` (${delay} day${delay > 1 ? 's' : ''} late)` : ''}`,
        `${billsList.length} scheduled payments before payday: ${gbp(billsBeforePayday)}`,
        `Essentials (groceries + transport) ~${gbp(ess)}/day, ±${unc * 100}%`,
        `Excludes non-essentials (eating out, shopping) — that's your free-to-spend`,
        `Minimum buffer ${gbp0(buffer)}`,
      ],
    };
  }

  function forecastSummaryForAI(f) {
    const { series, events, ...rest } = f;
    const pick = series.filter((p, i) => i % 3 === 0 || p.date === f.assumedPayday).map((p) => ({ d: p.date, bal: p.balance }));
    return { ...rest, keyEvents: events.filter((e) => e.type !== 'bill' || Math.abs(e.amount) >= 50).slice(0, 14), balancePath: pick };
  }

  function savingsPlan(goal, months, label) {
    goal = +goal; months = Math.max(1, +months || 3);
    const perMonth = r2(goal / months), perWeek = r2(goal / (months * 4.33));
    const avg = categoryMonthlyAverages();
    const base = forecast();
    const ideas = [];
    const eo = avg['Eating out'] || 0, ta = avg['Takeaways'] || 0, sh = avg['Shopping'] || 0, tx2 = avg['Taxis'] || 0;
    if (ta) ideas.push({ idea: 'Halve takeaways', saves: r2(ta / 2), basis: `you average ${gbp(ta)}/month on takeaways` });
    if (eo) ideas.push({ idea: 'Trim eating out by a quarter', saves: r2(eo / 4), basis: `you average ${gbp(eo)}/month eating out` });
    ideas.push({ idea: 'Pause Disney+ (you also have Netflix)', saves: 7.99, basis: 'overlapping streaming subscriptions' });
    if (sh) ideas.push({ idea: 'One less shopping order', saves: r2(sh / 3), basis: `you average ${gbp(sh)}/month on shopping` });
    if (tx2) ideas.push({ idea: 'Swap some taxis for the Tube', saves: r2(tx2 / 2), basis: `you average ${gbp(tx2)}/month on taxis` });
    ideas.push({ idea: 'Keep Round Ups on', saves: 18, basis: 'round ups saved about £18/month recently' });
    const totalIdeas = r2(ideas.reduce((a, i) => a + i.saves, 0));
    return {
      goal, label: label || 'Savings goal', months, perMonth, perWeek,
      freeToSpendThisCycle: r2(base.headroomAboveBuffer),
      monthlyAverages: avg, ideas, ideasTotalPerMonth: totalIdeas,
      coversGoal: totalIdeas >= perMonth,
      currentSaver: accounts.saver.balance,
    };
  }

  function pressures() {
    const f = forecast();
    const wk = weekComparison();
    const energy = BILLS.find((b) => b.name === 'Bright Energy');
    const subs = subscriptions();
    const subsTotal = r2(subs.reduce((a, s) => a + s.monthly, 0));
    const list = [
      { id: 'energy', severity: 0.9, title: 'Energy bill has risen 41% in two months',
        detail: `Bright Energy direct debit went ${gbp(68)} → ${gbp(79.5)} → ${gbp(96)} (due ${fmtDate(nextBillDate(energy))}). That's ${gbp(28 * 12)} more a year than in the summer.`,
        provider: { name: 'Bright Energy', email: energy.contact, accountRef: energy.account } },
      { id: 'headroom', severity: f.headroomAboveBuffer < 300 ? 0.8 : 0.4, title: `Only about ${gbp0(f.headroomAboveBuffer)} free before payday`,
        detail: `After ${gbp0(f.reservedBeforePayday.total)} reserved for bills and essentials and your ${gbp0(f.buffer)} buffer.` },
      { id: 'week', severity: wk.thisWeekDiscretionary > wk.typicalWeekDiscretionary * 1.4 ? 0.7 : 0.3, title: 'Busier spending week',
        detail: `${gbp(wk.thisWeekDiscretionary)} on non-bill spending this week vs a typical ${gbp(wk.typicalWeekDiscretionary)}.` },
      { id: 'subs', severity: 0.4, title: `${subs.length} subscriptions costing ${gbp(subsTotal)}/month`, detail: 'Netflix and Disney+ overlap.' },
    ].sort((a, b) => b.severity - a.severity);
    return list;
  }

  // Personalised alerts for the "Penny noticed" banner, most significant first.
  function spendingAlerts() {
    const out = [];
    const wk = weekComparison();
    const name = customer.firstName;
    const nonBill = (c) => !['Rent', 'Bills', 'Subscriptions', 'Income', 'Card repayment'].includes(c.category);
    if (wk.typicalWeekDiscretionary > 0) {
      const pct = Math.round((wk.thisWeekDiscretionary / wk.typicalWeekDiscretionary - 1) * 100);
      if (pct >= 20) {
        const top = wk.categoryChanges.filter(nonBill).filter((c) => !['Groceries', 'Transport'].includes(c.category)).filter((c) => c.change > 0).slice(0, 2).map((c) => c.category.toLowerCase());
        out.push({ id: 'week', severity: Math.min(1, pct / 80), icon: '📈',
          title: `you've spent ${gbp0(wk.thisWeekDiscretionary)} on extras this week`,
          detail: `That's ${pct}% more than your usual week (${gbp0(wk.typicalWeekDiscretionary)})${top.length ? `, mostly ${top.join(' and ')}` : ''}.`,
          ask: `Why did I spend more than usual this week?` });
      }
    }
    const pc = payCycleComparison();
    const avg = categoryMonthlyAverages();
    const frac = pc.daysIntoCycle / 30.4;
    const over = Object.entries(pc.byCategory).filter(([c]) => !['Rent', 'Bills', 'Subscriptions', 'Card repayment', 'Groceries', 'Transport'].includes(c))
      .map(([c, v]) => ({ c, v, exp: (avg[c] || 0) * frac })).filter((x) => x.exp >= 25 && x.v > x.exp * 1.3).sort((a, b) => b.v / b.exp - a.v / a.exp);
    if (over[0]) {
      const x = over[0], pct = Math.round((x.v / x.exp - 1) * 100);
      out.push({ id: 'cat', severity: Math.min(0.95, pct / 120), icon: '🍽️',
        title: pct >= 100 ? `you've spent ${(x.v / x.exp).toFixed(1)}× your usual on ${x.c.toLowerCase()} this pay cycle` : `${x.c.toLowerCase()} is running ${pct}% above your normal`,
        detail: `${gbp0(x.v)} so far this pay cycle vs about ${gbp0(x.exp)} by now usually.`,
        ask: `Am I overspending on ${x.c.toLowerCase()}? How could I cut back?` });
    }
    const f = forecast();
    if (f.headroomAboveBuffer < 300) out.push({ id: 'headroom', severity: f.headroomAboveBuffer < 150 ? 0.85 : 0.55, icon: '🛟',
      title: `only about ${gbp0(f.headroomAboveBuffer)} is free until payday`,
      detail: `After bills, essentials and your ${gbp0(f.buffer)} buffer. Payday is ${fmtDate(new Date(f.assumedPayday))}.`,
      ask: 'How much can I safely spend before payday?' });
    out.push({ id: 'energy', severity: 0.5, icon: '⚡', title: 'your energy bill has gone up 41% since the summer',
      detail: 'Bright Energy: £68 → £79.50 → £96 a month.', ask: 'My energy bill went up a lot. What can I do about it?' });
    return out.sort((a, b) => b.severity - a.severity);
  }

  function snapshotForAI() {
    const f = forecast();
    return {
      today: `${fmtDate(TODAY)} (${iso(TODAY)})`,
      customer: { firstName: customer.firstName, email: customer.email },
      accounts: {
        current: { balance: accounts.current.balance, arrangedOverdraft: accounts.current.overdraft },
        creditCard: { balance: accounts.credit.balance, available: accounts.credit.limit + accounts.credit.balance },
        saver: { balance: accounts.saver.balance },
      },
      income: { salary: SALARY.amount, payer: SALARY.payer, nextExpected: iso(nextPayday()), lastPaid: iso(lastPayday()), rule: '28th of each month, or the previous working day' },
      minimumBuffer: settings.buffer,
      baselineForecast: forecastSummaryForAI(f),
      upcomingRecurring: BILLS.map((b) => ({ name: b.name, kind: b.kind, amount: b.amount, next: iso(nextBillDate(b)) })).sort((a, b) => (a.next < b.next ? -1 : 1)),
      subscriptions: subscriptions(),
      thisPayCycle: payCycleComparison(),
      thisWeekVsLastWeek: weekComparison(),
      monthlyCategoryAverages_last3Months: categoryMonthlyAverages(),
      monthlyTotals: monthlyTotals(4).map(({ label, total, partial }) => ({ month: label, total, partial })),
      financialPressures_ranked: pressures().map(({ id, title, detail, provider }) => ({ id, title, detail, provider })),
      recentTransactions: tx.slice(0, 18).map((t) => ({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.cat, note: t.note })),
    };
  }

  function getTransactions({ days_back = 30, category, merchant } = {}) {
    const from = iso(addDays(TODAY, -Math.min(200, +days_back || 30)));
    let rows = tx.filter((t) => t.date >= from);
    if (category) rows = rows.filter((t) => t.cat.toLowerCase().includes(String(category).toLowerCase()));
    if (merchant) rows = rows.filter((t) => t.merchant.toLowerCase().includes(String(merchant).toLowerCase()));
    const spend = rows.filter(isSpend).reduce((a, t) => a - t.amount, 0);
    return { count: rows.length, totalSpent: r2(spend), transactions: rows.slice(0, 60).map((t) => ({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.cat, note: t.note })) };
  }

  window.Bank = {
    TODAY, customer, accounts, BILLS, SALARY, settings, tx,
    iso, fmtDate, fmtShort, gbp, gbp0, addDays, diffDays,
    nextPayday, lastPayday, essentialsDaily, spendBetween, weekComparison, payCycleComparison, monthlyTotals,
    categoryMonthlyAverages, subscriptions, spendingAlerts, forecast, forecastSummaryForAI, savingsPlan, pressures, snapshotForAI, getTransactions, nextBillDate,
  };
})();
