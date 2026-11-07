/* Money Skills: short lessons + interactive quizzes, each based on a NatWest guide (linked).
 * Penny can open a quiz on screen (start_quiz) or teach/quiz by voice (get_lesson). */
(function () {
  const App = window.App;
  const esc = App.esc;

  const TOPICS = [
    {
      id: 'safety-net', emoji: '🛟', title: 'Build a safety net', level: 'Saving',
      source: { title: 'How much of a safety net should I have?', url: 'https://www.natwest.com/money-blog/saving-and-budgeting/how-much-of-a-safety-net-should-i-have.html' },
      points: [
        'An emergency fund covers surprises like a broken boiler or losing income, so you don\'t have to borrow.',
        'A common rule of thumb is 3 to 6 months of essential costs. NatWest\'s save-or-invest guide suggests around 4 months of essential spending.',
        'Work it out: add up monthly essentials (rent, bills, food, travel) and multiply by the number of months.',
        'Keep it somewhere you can get to quickly, like an instant-access savings account.',
        'Start small — regular saving, even a little each payday, builds the habit.',
      ],
      quiz: [
        { q: 'What is a common target for an emergency fund?', options: ['Two weeks of pay', '3–6 months of essential costs', 'A full year\'s salary', 'Exactly £100'], a: 1, why: 'NatWest suggests at least 3 and ideally up to 6 months of living expenses — its save-or-invest guide points to about 4 months of essentials.' },
        { q: 'Where is the best place to keep an emergency fund?', options: ['Stocks and shares', 'A 5-year fixed bond', 'Instant-access savings', 'Under the mattress'], a: 2, why: 'You need to reach it quickly without penalties or the risk of it falling in value.' },
        { q: 'How do you work out your target?', options: ['Monthly essential costs × number of months', 'Salary × 2', 'Whatever is left at month end', 'Your overdraft limit'], a: 0, why: 'Total your essentials — rent, bills, food — then multiply by 3, 4 or 6 months.' },
      ],
    },
    {
      id: 'compound', emoji: '🌱', title: 'Compound interest', level: 'Saving',
      source: { title: 'What is compound interest?', url: 'https://www.natwest.com/savings/savings-guides/what-is-compound-interest.html' },
      points: [
        'Compound interest is interest paid on your original savings plus the interest you\'ve already earned.',
        'Leaving your money and its interest untouched lets it keep growing — interest earns interest.',
        'The earlier you start, the longer compounding has to work.',
        'Compare accounts using the AER (Annual Equivalent Rate), which shows what you\'d earn over a year including compounding.',
      ],
      quiz: [
        { q: 'What is compound interest?', options: ['Interest only on your first deposit', 'Interest on your savings plus interest already earned', 'A fee for saving', 'Interest that goes down each year'], a: 1, why: 'Interest is added to your balance, so next time you earn interest on that too.' },
        { q: '£1,000 earns 5% a year, compounded yearly. Roughly what\'s it worth after 2 years?', options: ['£1,050', '£1,100', '£1,102.50', '£1,200'], a: 2, why: 'Year 1: £1,050. Year 2: 5% of £1,050 = £52.50, making £1,102.50 — the extra £2.50 is interest on interest.' },
        { q: 'What helps compounding work best?', options: ['Withdrawing interest every month', 'Leaving the money and interest untouched', 'Switching accounts weekly', 'Keeping it in cash at home'], a: 1, why: 'Every withdrawal shrinks the base that interest is calculated on.' },
      ],
    },
    {
      id: 'save-or-invest', emoji: '⚖️', title: 'Save or invest?', level: 'Investing',
      source: { title: 'Should I save or invest?', url: 'https://www.natwest.com/investments/our-insights/savings-vs-investment.html' },
      points: [
        'Saving keeps cash safe and easy to reach — best for emergencies and goals in the next few years.',
        'Investing aims to grow money over the longer term, but values can go down as well as up.',
        'NatWest suggests having about 4 months of essential spending in instant-access savings and clearing high-interest debts before investing.',
        'Investing usually suits money you won\'t need for at least 5 years.',
      ],
      quiz: [
        { q: 'You want money for a holiday next year. Which suits best?', options: ['Saving', 'Investing in shares', 'Cryptocurrency', 'Lending it to a friend'], a: 0, why: 'Short-term goals need money that won\'t drop in value right when you need it.' },
        { q: 'What should usually come before investing?', options: ['A new phone', 'An emergency fund and clearing high-interest debt', 'A bigger overdraft', 'Nothing — invest straight away'], a: 1, why: 'Paying 20%+ on debt usually costs more than investments are likely to earn.' },
        { q: 'For how long should you generally plan to invest?', options: ['A week', 'A few months', 'At least 5 years', 'Until it drops, then sell'], a: 2, why: 'A longer time frame gives investments time to recover from dips.' },
      ],
    },
    {
      id: 'isa', emoji: '🧾', title: 'ISAs explained', level: 'Saving',
      source: { title: 'Cash ISA', url: 'https://www.natwest.com/savings/isa-overview/cash-isa.html' },
      points: [
        'An ISA is a tax-free wrapper: interest or investment growth inside it isn\'t taxed.',
        'You can put up to £20,000 a year in total across all your ISAs.',
        'The allowance resets every tax year on 6 April — unused allowance doesn\'t roll over.',
        'Cash ISAs hold savings; Stocks and Shares ISAs hold investments (NatWest\'s starts from £50).',
      ],
      quiz: [
        { q: 'What is the yearly ISA allowance across all ISAs?', options: ['£4,000', '£10,000', '£20,000', 'Unlimited'], a: 2, why: '£20,000 per tax year, split however you like between ISA types.' },
        { q: 'How much tax do you pay on interest in a Cash ISA?', options: ['None', '20%', '40%', 'It depends on the bank'], a: 0, why: 'That\'s the point of an ISA — returns are tax-free.' },
        { q: 'When does the ISA allowance reset?', options: ['1 January', '6 April', 'Your birthday', 'It never resets'], a: 1, why: 'The UK tax year starts on 6 April. Unused allowance is lost.' },
      ],
    },
    {
      id: 'investing', emoji: '📊', title: 'Investing basics', level: 'Investing',
      source: { title: 'Stocks and Shares ISA', url: 'https://www.natwest.com/investments/stocks-and-shares-isa.html' },
      points: [
        'Investing means buying things like company shares or funds, aiming to grow your money over time.',
        'Growth isn\'t guaranteed — you could get back less than you put in.',
        'Higher risk can mean bigger rises and bigger falls. Choose a risk level you\'re comfortable with.',
        'Investing a set amount monthly smooths out the market\'s ups and downs.',
      ],
      quiz: [
        { q: 'Are investment returns guaranteed?', options: ['Yes, always', 'Only with a bank', 'No — you could get back less', 'Yes, after a year'], a: 2, why: 'Values can fall as well as rise.' },
        { q: 'Why do many people invest monthly?', options: ['It\'s required by law', 'It smooths out market ups and downs', 'It avoids all risk', 'It doubles returns'], a: 1, why: 'You buy at different prices over time instead of putting everything in at a peak.' },
        { q: 'What does "higher risk" usually mean?', options: ['Guaranteed higher returns', 'Potential for bigger rises and bigger falls', 'Lower fees', 'You can\'t withdraw'], a: 1, why: 'Risk and potential reward go together — in both directions.' },
      ],
    },
    {
      id: 'credit', emoji: '💳', title: 'Your credit score', level: 'Borrowing',
      source: { title: 'Protect your credit score', url: 'https://www.natwest.com/fraud-and-security/protect-your-credit-score.html' },
      points: [
        'Paying bills and credit on time is one of the biggest things you can do for your score.',
        'Check that the information credit reference agencies hold about you is correct.',
        'Every credit application means a credit check, which can affect your score — avoid lots of applications at once.',
        'A sudden unexpected drop in your score, or letters about credit you didn\'t apply for, can be a sign of identity fraud.',
      ],
      quiz: [
        { q: 'Which helps your credit score most?', options: ['Applying for lots of cards', 'Paying on time, every time', 'Closing your current account', 'Never using credit at all'], a: 1, why: 'A track record of on-time payments shows lenders you\'re reliable.' },
        { q: 'What happens when you apply for credit?', options: ['Nothing', 'A credit check is done, which can affect your score', 'Your score automatically goes up', 'Your bank closes your account'], a: 1, why: 'Lots of applications in a short time can look risky to lenders.' },
        { q: 'Your score suddenly drops and you get letters about a loan you never applied for. What could it be?', options: ['A good sign', 'Identity fraud', 'A bank holiday', 'Normal monthly change'], a: 1, why: 'Contact your bank and the credit reference agencies straight away.' },
      ],
    },
    {
      id: 'scams', emoji: '🛡️', title: 'Spot a scam', level: 'Safety',
      source: { title: 'NatWest Security Centre', url: 'https://www.natwest.com/fraud-and-security.html' },
      points: [
        'Only criminals ask you to move your money to a "safe account". Your bank will never do this.',
        'Scammers create urgency. Don\'t be rushed into giving details or making sudden payments.',
        'If a call, text or email seems off, hang up and contact the company using a number you trust.',
        'Never share one-time passcodes, your PIN or full passwords.',
      ],
      quiz: [
        { q: 'Someone from "your bank" says your account is at risk and asks you to move money to a safe account. What is it?', options: ['Normal bank procedure', 'A scam', 'A new savings product', 'A fraud refund'], a: 1, why: 'NatWest says only criminals ask you to move money to a "safe account".' },
        { q: 'A message says you must pay in the next 10 minutes or face a fine. What should you do?', options: ['Pay quickly', 'Stop, and check with the organisation using a trusted number', 'Reply with your details', 'Forward it to friends'], a: 1, why: 'Urgency is a classic pressure tactic. Take your time.' },
        { q: 'Who should you share a one-time passcode with?', options: ['Your bank\'s caller', 'A delivery driver', 'No one', 'A friend'], a: 2, why: 'One-time passcodes approve payments — anyone asking for one is a red flag.' },
      ],
    },
    {
      id: 'budget', emoji: '🗂️', title: 'Budget like a pro', level: 'Budgeting',
      source: { title: 'Understanding your overdraft', url: 'https://www.natwest.com/life-moments/Struggling-financially/overdraft-debt.html' },
      points: [
        'Start with your take-home pay — what actually lands after tax and other deductions.',
        'List essentials (rent, bills, food, travel) separately from nice-to-haves.',
        'Track your spending for a month — the app\'s spending insights can do it for you.',
        'A budget helps you spot cuts and pay off an overdraft faster.',
        'Move savings on payday, before you can spend it.',
      ],
      quiz: [
        { q: 'What should a budget start with?', options: ['Your gross salary', 'Your take-home pay', 'Your credit limit', 'Last year\'s bonus'], a: 1, why: 'Plan with the money that actually reaches your account.' },
        { q: 'Which is a "nice-to-have" rather than an essential?', options: ['Rent', 'Council tax', 'Takeaways', 'Energy bill'], a: 2, why: 'Non-essentials are usually where the easiest savings are.' },
        { q: 'Best time to move money into savings?', options: ['Whatever\'s left at month end', 'On payday', 'Only in December', 'Never'], a: 1, why: '"Pay yourself first" means saving before spending.' },
      ],
    },
  ];

  const progress = (() => { try { return JSON.parse(localStorage.getItem('penny.learn') || '{}'); } catch (e) { return {}; } })();
  const saveProgress = () => { try { localStorage.setItem('penny.learn', JSON.stringify(progress)); } catch (e) {} };
  const xp = () => Object.values(progress).reduce((a, p) => a + (p.best || 0) * 10, 0);
  const doneCount = () => Object.values(progress).filter((p) => p.best > 0).length;
  const find = (id) => TOPICS.find((t) => t.id === id) || TOPICS.find((t) => t.title.toLowerCase().includes(String(id).toLowerCase())) || TOPICS[0];

  function hubHTML() {
    return `<div class="learn-hero"><div><b>Money skills</b><small>${doneCount()}/${TOPICS.length} topics · ${xp()} XP</small></div><div class="xp-ring" style="--p:${(doneCount() / TOPICS.length) * 100}%"><span>🎓</span></div></div>
      <div class="learn-grid">${TOPICS.map((t) => `<button class="learn-card" data-topic="${t.id}"><span class="lc-emoji">${t.emoji}</span><b>${esc(t.title)}</b><small>${t.level}${progress[t.id]?.best ? ` · ⭐ ${progress[t.id].best}/${t.quiz.length}` : ''}</small></button>`).join('')}</div>
      <p class="learn-src">Lessons are based on NatWest money guides. Tap a guide link inside each lesson to read the original.</p>`;
  }
  function bindHub(root) { root.querySelectorAll('[data-topic]').forEach((b) => (b.onclick = () => openLesson(b.dataset.topic))); }

  function openLesson(id) {
    const t = find(id);
    const s = App.openSheet(`<div class="lesson-head"><span class="lc-emoji big">${t.emoji}</span><div><h3>${esc(t.title)}</h3><div class="sub">${t.level} · 2 min read</div></div></div>
      <div class="sum-card"><ul class="lesson-points">${t.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
      <a class="src-link" href="${t.source.url}" target="_blank" rel="noopener">📖 Based on NatWest: ${esc(t.source.title)} ↗</a></div>
      <div class="btn-row"><button class="btn ghost" id="lsAsk">🎙️ Ask Penny</button><button class="btn primary" id="lsQuiz">Take the quiz</button></div>`);
    s.querySelector('#lsQuiz').onclick = () => openQuiz(t.id);
    s.querySelector('#lsAsk').onclick = () => { App.closeSheet(); window.Penny && window.Penny.openAndAsk(`Can you quiz me on ${t.title.toLowerCase()} out loud?`); };
  }

  function openQuiz(id) {
    const t = find(id);
    let i = 0, score = 0;
    const render = () => {
      if (i >= t.quiz.length) {
        const prev = progress[t.id]?.best || 0;
        progress[t.id] = { best: Math.max(prev, score), at: Date.now() }; saveProgress();
        const perfect = score === t.quiz.length;
        const s = App.openSheet(`<div class="quiz-done"><div class="qd-emoji">${perfect ? '🏆' : score ? '⭐' : '💪'}</div><h3>${score}/${t.quiz.length} correct</h3>
          <div class="sub">${perfect ? 'Perfect! You\'ve mastered this one.' : score ? 'Nice work — try again to get them all.' : 'Good start — have another go.'} +${score * 10} XP</div>
          <a class="src-link" href="${t.source.url}" target="_blank" rel="noopener">📖 Read the full NatWest guide ↗</a></div>
          <div class="btn-row"><button class="btn ghost" id="qAgain">Try again</button><button class="btn primary" id="qMore">More topics</button></div>`);
        s.querySelector('#qAgain').onclick = () => openQuiz(t.id);
        s.querySelector('#qMore').onclick = () => { App.closeSheet(); App.show('help'); };
        window.dispatchEvent(new Event('learn:changed'));
        return;
      }
      const q = t.quiz[i];
      const s = App.openSheet(`<div class="quiz-top"><span>${t.emoji} ${esc(t.title)}</span><span>${i + 1}/${t.quiz.length}</span></div>
        <div class="quiz-bar"><span style="width:${(i / t.quiz.length) * 100}%"></span></div>
        <h3 class="quiz-q">${esc(q.q)}</h3>
        <div class="quiz-opts">${q.options.map((o, k) => `<button class="quiz-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
        <div class="quiz-fb" id="qFb"></div>`);
      s.querySelectorAll('.quiz-opt').forEach((b) => (b.onclick = () => {
        if (s.querySelector('.quiz-opt.right')) return;
        const k = +b.dataset.k, ok = k === q.a;
        if (ok) score++;
        s.querySelectorAll('.quiz-opt').forEach((x) => { const kk = +x.dataset.k; if (kk === q.a) x.classList.add('right'); else if (kk === k) x.classList.add('wrong'); x.disabled = true; });
        const fb = s.querySelector('#qFb');
        fb.className = 'quiz-fb ' + (ok ? 'ok' : 'no');
        fb.innerHTML = `<b>${ok ? 'Correct! 🎉' : 'Not quite.'}</b> ${esc(q.why)}<button class="btn primary" id="qNext" style="width:100%;margin-top:10px">${i + 1 < t.quiz.length ? 'Next question' : 'See results'}</button>`;
        fb.querySelector('#qNext').onclick = () => { i++; render(); };
      }));
    };
    render();
  }

  function lessonForAI(id) {
    const t = find(id);
    return { id: t.id, title: t.title, keyPoints: t.points, quiz: t.quiz.map((q) => ({ question: q.q, options: q.options, answer: q.options[q.a], explanation: q.why })), source: t.source, userBestScore: progress[t.id]?.best || 0 };
  }

  window.Learn = { TOPICS, hubHTML, bindHub, openLesson, openQuiz, lessonForAI, xp, doneCount, topicsForAI: () => TOPICS.map((t) => ({ id: t.id, title: t.title, done: !!progress[t.id]?.best })) };
})();
