/* Penny: voice assistant — orb, speech in/out, Claude conversation with tools, post-call action cards. */
(function () {
  const B = window.Bank, App = window.App;
  const $ = (s) => document.querySelector(s) || document.createElement('div'); // missing optional elements become no-ops
  const esc = App.esc;

  const PS = () => window.PennySettings;
  const SUGGESTIONS = [
    'Can I afford a £200 trip?',
    'How am I doing this month?',
    'Why did I spend more this week?',
    "What's stressing my budget most?",
    'What if my next salary is late?',
    'What subscriptions am I paying for?',
    'How could I save £600 by summer?',
  ];

  const S = {
    open: false, call: false, muted: false,
    mode: 'idle', // idle | connecting | listening | thinking | speaking
    level: 0, micLevel: 0,
    gen: 0, chain: Promise.resolve(),
    messages: [], turns: [], toolsUsed: [],
    callStart: 0, timerId: null,
    tts: 'browser', currentReply: '',
    greeted: false, callTurnStart: 0, lastTools: [],
  };

  // ======================= ORB =======================
  const PALETTE = {
    idle: ['#ffffff', '#e2b8ff', '#9a4fe0', '#4b1d77'],
    connecting: ['#ffffff', '#e2b8ff', '#9a4fe0', '#4b1d77'],
    listening: ['#ffffff', '#ffc2e6', '#e0459b', '#6a1f80'],
    thinking: ['#ffffff', '#c9d4ff', '#6f5cff', '#3a1a7a'],
    speaking: ['#ffffff', '#f3d0ff', '#b25cff', '#5a287d'],
  };
  function drawOrb(canvas, t, scale = 1) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    const mode = S.call || S.mode === 'thinking' || S.mode === 'speaking' ? S.mode : 'idle';
    const pal = PALETTE[mode] || PALETTE.idle;
    const R = W * 0.3 * scale;
    const lvl = S.level;
    // glow
    const g = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.65);
    g.addColorStop(0, pal[2] + '66'); g.addColorStop(1, pal[2] + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * (1.6 + lvl * 0.2), 0, Math.PI * 2); ctx.fill();
    // listening ripple
    if (mode === 'listening') {
      for (let k = 0; k < 2; k++) {
        const p = ((t / 1600 + k / 2) % 1);
        ctx.strokeStyle = `rgba(255,190,230,${0.35 * (1 - p)})`; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.05 + p * 0.55), 0, Math.PI * 2); ctx.stroke();
      }
    }
    // blob
    const amp = mode === 'idle' ? 0.035 : mode === 'thinking' ? 0.05 : 0.04 + lvl * 0.22;
    const speed = mode === 'thinking' ? 0.004 : 0.0022;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const n = Math.sin(a * 3 + t * speed) * 0.5 + Math.sin(a * 5 - t * speed * 1.3) * 0.3 + Math.sin(a * 2 + t * speed * 0.7) * 0.2;
      const r = R * (1 + amp * n + (mode === 'idle' ? Math.sin(t / 900) * 0.02 : 0));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    const rot = mode === 'thinking' ? t / 500 : t / 3000;
    const gx = cx + Math.cos(rot) * R * 0.35, gy = cy + Math.sin(rot) * R * 0.35;
    const fill = ctx.createRadialGradient(gx - R * 0.2, gy - R * 0.3, R * 0.05, cx, cy, R * 1.1);
    fill.addColorStop(0, pal[0]); fill.addColorStop(0.25, pal[1]); fill.addColorStop(0.65, pal[2]); fill.addColorStop(1, pal[3]);
    ctx.fillStyle = fill; ctx.fill();
    // thinking orbiters
    if (mode === 'thinking') {
      for (let k = 0; k < 3; k++) {
        const a = t / 380 + (k * Math.PI * 2) / 3;
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.25, cy + Math.sin(a) * R * 1.25, 3.2 * scale, 0, Math.PI * 2); ctx.fill();
      }
    }
    // specular
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(cx - R * 0.32, cy - R * 0.42, R * 0.22, R * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  let simPhase = 0;
  function frame(t) {
    // level smoothing
    let target = 0;
    if (S.mode === 'listening') target = Math.min(1, S.micLevel * 3.2);
    else if (S.mode === 'speaking') target = S.ttsLevelFn ? S.ttsLevelFn() : 0.35 + 0.3 * Math.abs(Math.sin(t / 110)) * (0.6 + 0.4 * Math.sin((simPhase += 0.07)));
    S.level += (target - S.level) * 0.25;
    drawOrb($('#orb'), t, 1);
    drawOrb($('#fabOrb'), t, 1.1);
    if ($('#island').classList.contains('active')) {
      drawOrb($('#islandOrb'), t, 1.25);
      document.querySelectorAll('#islandWave i').forEach((el, i) => { el.style.height = 4 + Math.abs(Math.sin(t / 120 + i)) * S.level * 12 + 'px'; });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ======================= earcons =======================
  let toneCtx;
  function tone(kind) {
    try {
      toneCtx = toneCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { start: [660, 880], end: [740, 520], done: [880] }[kind] || [800];
      notes.forEach((f, i) => {
        const o = toneCtx.createOscillator(), g = toneCtx.createGain(), t = toneCtx.currentTime + i * 0.09;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(toneCtx.destination); o.start(t); o.stop(t + 0.25);
      });
    } catch (e) { /* sound is optional */ }
  }

  // ======================= UI helpers =======================
  const STATE_LABEL = {
    idle: 'Ready when you are', connecting: 'Connecting…', listening: 'Listening…',
    thinking: 'Thinking…', speaking: 'Speaking · tap orb to interrupt',
  };
  function setMode(m) {
    S.mode = m;
    $('#ppState').textContent = S.muted && S.call && m === 'listening' ? 'Mic muted · type or unmute' : STATE_LABEL[m];
    const hint = $('#orbHint');
    hint.textContent = m === 'speaking' ? 'Tap to interrupt' : '';
    hint.classList.toggle('show', m === 'speaking');
  }
  function setUserLine(text, interim) {
    const el = $('#subUser');
    el.textContent = text ? `“${text}”` : '';
    el.classList.toggle('interim', !!interim);
  }
  function setPennyLine(text, highlightAll = true) {
    const el = $('#subPenny');
    const words = String(text).split(/(\s+)/);
    el.innerHTML = words.map((w) => (/^\s+$/.test(w) ? w : `<span class="w${highlightAll ? ' on' : ''}">${esc(w)}</span>`)).join('');
    $('#subtitles').scrollTop = 0;
  }
  function highlightWords(n) {
    const ws = document.querySelectorAll('#subPenny .w');
    ws.forEach((w, i) => w.classList.toggle('on', i < n));
    const cur = ws[Math.min(n, ws.length - 1)];
    if (cur) { const box = $('#subtitles'); const top = cur.offsetTop - box.offsetTop; if (top > box.scrollTop + box.clientHeight - 30) box.scrollTop = top - 30; }
  }
  function thinkingLine(label) {
    $('#subPenny').innerHTML = `<span class="working">${esc(label || 'Checking your accounts…')}<i></i><i></i><i></i></span>`;
    if (label) $('#ppState').textContent = label;
  }
  const WORKING = {
    run_forecast: 'Running the numbers…', plan_savings_goal: 'Building your plan…', get_transactions: 'Looking through your transactions…',
    draft_email: 'Writing your email…', send_email: 'Sending…', show_bill_breakdown: 'Reading your bill…', check_benefits: 'Checking what you could claim…',
    get_lesson: 'Getting a lesson ready…', start_quiz: 'Getting a quiz ready…', add_reminders: 'Adding reminders…',
  };
  function addHistory(role, text) {
    S.turns.push({ role, text });
    const el = document.createElement('div');
    el.className = 'hmsg ' + role;
    el.textContent = text;
    $('#historyList').appendChild(el);
    $('#historyList').scrollTop = 1e6;
    const n = S.turns.filter((t) => t.role !== 'tool').length;
    $('#histCount').textContent = n ? `(${n})` : '';
  }
  const FOLLOW_UPS = {
    run_forecast: ['Make me a plan to afford it', 'What if I wait until payday?', 'Clear the what-if'],
    plan_savings_goal: ['Add this to my reminders', 'Can I do it faster?'],
    draft_email: ['Send it', 'Make it a bit firmer', 'Not now'],
    show_bill_breakdown: ['Remind me to pay it', 'Can I get a discount on this?'],
    check_benefits: ['How do I claim the first one?', 'Remind me to apply'],
    get_lesson: ['Quiz me on another topic'], start_quiz: ['Explain it more simply'],
  };
  function renderChips(list) {
    const items = list && list.length ? list : SUGGESTIONS;
    $('#chips').innerHTML = items.map((q) => `<button>${esc(q)}</button>`).join('');
    $('#chips').scrollLeft = 0;
    $('#chips').querySelectorAll('button').forEach((b) => (b.onclick = () => ask(b.textContent)));
  }
  renderChips();

  function openPanel() {
    S.open = true;
    $('#pennyPanel').classList.add('open');
    $('#pennyPanel').setAttribute('aria-hidden', 'false');
    $('#pennyFab').classList.add('hidden');
    $('#island').classList.remove('active');
  }
  function minimisePanel() {
    S.open = false;
    $('#pennyPanel').classList.remove('open');
    $('#pennyPanel').setAttribute('aria-hidden', 'true');
    if (S.call) { $('#island').classList.add('active'); }
    else $('#pennyFab').classList.remove('hidden');
  }
  $('#pennyFab').onclick = () => { openPanel(); if (!S.call) startCall(); };
  $('#btnMin').onclick = minimisePanel;
  $('#island').onclick = () => { if (S.call) openPanel(); };
  $('#btnText').onclick = () => { $('#pennyPanel').classList.toggle('big'); $('#btnText').classList.toggle('on'); };
  $('#btnSettings').onclick = () => $('#ppSettings').classList.toggle('open');
  $('#btnAllSettings').onclick = () => { $('#ppSettings').classList.remove('open'); PS().open(); };
  $('#btnAttach').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) handleUpload(f); };
  $('#btnKeyboard').onclick = () => { const p = $('#pennyPanel'); p.classList.toggle('typing'); $('#btnKeyboard').classList.toggle('on', p.classList.contains('typing')); if (p.classList.contains('typing')) $('#typeInput').focus(); };
  $('#typeForm').onsubmit = (e) => { e.preventDefault(); const v = $('#typeInput').value.trim(); if (!v) return; $('#typeInput').value = ''; ask(v); };
  document.querySelectorAll('.stepper button').forEach((b) => (b.onclick = () => App.setBuffer(B.settings.buffer + +b.dataset.step)));
  $('#orbWrap').onclick = () => { if (S.mode === 'speaking') interrupt(); else if (!S.call) startCall(); };
  $('#btnCall').onclick = () => (S.call ? endCall() : startCall());
  $('#btnMute').onclick = () => {
    S.muted = !S.muted;
    $('#btnMute').classList.toggle('on', S.muted);
    $('#btnMute span').textContent = S.muted ? 'Unmute' : 'Mute';
    if (S.muted) stopRec(); else if (S.call && S.mode === 'listening') startRec();
    setMode(S.mode);
  };

  function startTimer() {
    S.callStart = Date.now();
    const upd = () => {
      const s = Math.floor((Date.now() - S.callStart) / 1000);
      const txt = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      $('#ppTimer').textContent = txt; $('#islandTime').textContent = txt;
    };
    upd(); S.timerId = setInterval(upd, 1000);
  }
  function stopTimer() { clearInterval(S.timerId); $('#ppTimer').textContent = ''; }

  // ======================= MIC LEVEL =======================
  let audioCtx, micStream, micRAF;
  async function startMicLevel() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.createMediaStreamSource(micStream);
      const an = audioCtx.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (const v of buf) { const d = (v - 128) / 128; sum += d * d; }
        S.micLevel = S.muted ? 0 : Math.sqrt(sum / buf.length);
        micRAF = requestAnimationFrame(loop);
      };
      loop();
      return true;
    } catch (e) {
      console.warn('mic', e);
      return false;
    }
  }
  function stopMicLevel() {
    cancelAnimationFrame(micRAF); S.micLevel = 0;
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }

  // ======================= SPEECH RECOGNITION =======================
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, recRunning = false, wantRec = false, finalBuf = '', commitT = null;

  function ensureRec() {
    if (!SR || rec) return rec;
    rec = new SR();
    rec.lang = PS().lang().sr;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => (recRunning = true);
    rec.onend = () => { recRunning = false; if (wantRec && S.call && !S.muted) setTimeout(() => wantRec && !recRunning && safeStart(), 120); };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRec = false;
        setPennyLine("I can't access your microphone. Allow mic access in the browser, or tap the keyboard to type.");
        $('#pennyPanel').classList.add('typing');
      }
    };
    rec.onresult = (ev) => {
      let interim = '', fin = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript;
      }
      const heard = (fin || interim).trim();
      if (!heard) return;
      if (S.mode === 'speaking') {
        // Barge-in (headphones mode): ignore Penny's own voice leaking into the mic.
        if (!$('#optBarge').checked || isEcho(heard) || heard.split(/\s+/).length < 2) return;
        interrupt(true);
      }
      if (S.mode !== 'listening') return;
      if (fin) finalBuf = (finalBuf + ' ' + fin).trim();
      setUserLine((finalBuf + ' ' + interim).trim(), !fin);
      clearTimeout(commitT);
      if (finalBuf) commitT = setTimeout(commitUtterance, interim ? 1400 : 750);
    };
    return rec;
  }
  function safeStart() { try { rec.start(); } catch (e) { /* already started */ } }
  function startRec() {
    if (!SR || S.muted || !S.call) return;
    ensureRec(); wantRec = true; finalBuf = '';
    if (rec.lang !== PS().lang().sr) { rec.lang = PS().lang().sr; if (recRunning) { try { rec.abort(); } catch (e) {} return; } }
    if (!recRunning) safeStart();
  }
  function stopRec() {
    wantRec = false; clearTimeout(commitT);
    if (rec && recRunning) { try { rec.abort(); } catch (e) {} }
  }
  function commitUtterance() {
    const text = finalBuf.trim(); finalBuf = '';
    if (!text || S.mode !== 'listening') return;
    ask(text, { voice: true });
  }
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9£ ]/g, ' ').split(/\s+/).filter(Boolean);
  function isEcho(heard) {
    const spoken = new Set(norm(S.currentReply));
    const w = norm(heard);
    if (!w.length) return true;
    const hit = w.filter((x) => spoken.has(x)).length;
    return hit / w.length >= 0.6;
  }

  // ======================= TEXT TO SPEECH =======================
  function pickVoice() { return PS().pickVoice(); }
  let warnedNoVoice = '';
  let speakResolve = null, audioEl = null, audioAnalyser = null;
  function speak(text) {
    return new Promise((resolve) => {
      S.currentReply = text;
      speakResolve = resolve;
      const words = text.split(/\s+/).filter(Boolean);
      setPennyLine(text, false);
      if (!$('#optVoice').checked) { highlightWords(words.length); return setTimeout(done, 300); }
      setMode('speaking');
      if ($('#optBarge').checked) startRec(); else stopRec(); // echo protection: mic closed while Penny talks
      if (S.tts === 'elevenlabs') return speakEleven(text, words.length).catch(() => speakBrowser(text, words));
      speakBrowser(text, words);
    });
  }
  function done() {
    S.ttsLevelFn = null;
    const r = speakResolve; speakResolve = null;
    if (r) r();
  }
  function speakBrowser(text, words) {
    if (!window.speechSynthesis) { highlightWords(words.length); return setTimeout(done, 600); }
    speechSynthesis.cancel();
    const chunks = text.match(/[^.!?؟。！？۔]+[.!?؟。！？۔]*\s*/g) || [text];
    let wordBase = 0, gotBoundary = false, fallbackT;
    const v = pickVoice();
    const sp = PS().speech();
    if (!v && warnedNoVoice !== sp.lang) { warnedNoVoice = sp.lang; App.toast(`No ${PS().lang().name} voice installed`, 'Add one in System Settings → Accessibility → Spoken Content', '🔈', '#c77700'); }
    const playChunk = (i) => {
      if (!speakResolve) return;
      if (i >= chunks.length) { highlightWords(words.length); return done(); }
      const c = chunks[i];
      const u = new SpeechSynthesisUtterance(c.trim());
      if (v) u.voice = v; u.lang = v ? v.lang : sp.lang; u.rate = sp.rate; u.pitch = sp.pitch;
      const cw = c.trim().split(/\s+/).filter(Boolean).length;
      u.onboundary = (e) => {
        if (e.name && e.name !== 'word') return;
        gotBoundary = true;
        const idx = c.trim().slice(0, e.charIndex).split(/\s+/).filter(Boolean).length;
        highlightWords(wordBase + idx + 1);
      };
      u.onstart = () => {
        // If the voice doesn't fire boundary events, reveal words at a natural pace.
        let k = 0; clearInterval(fallbackT);
        fallbackT = setInterval(() => { if (gotBoundary) return clearInterval(fallbackT); k++; highlightWords(wordBase + Math.min(cw, k)); }, 330);
      };
      u.onend = () => { clearInterval(fallbackT); wordBase += cw; highlightWords(wordBase); playChunk(i + 1); };
      u.onerror = () => { clearInterval(fallbackT); wordBase += cw; playChunk(i + 1); };
      speechSynthesis.speak(u);
    };
    playChunk(0);
  }
  async function speakEleven(text, nWords) {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice_id: PS().elevenVoice(), language: PS().lang().code }) });
    if (!r.ok) throw new Error('tts');
    const blob = await r.blob();
    if (!speakResolve) return;
    audioEl = audioEl || new Audio();
    audioEl.src = URL.createObjectURL(blob);
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioAnalyser) {
        const src = audioCtx.createMediaElementSource(audioEl);
        audioAnalyser = audioCtx.createAnalyser(); audioAnalyser.fftSize = 512;
        src.connect(audioAnalyser); audioAnalyser.connect(audioCtx.destination);
      }
      const buf = new Uint8Array(audioAnalyser.fftSize);
      S.ttsLevelFn = () => { audioAnalyser.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; } return Math.min(1, Math.sqrt(s / buf.length) * 4); };
    } catch (e) { /* level animation falls back to simulated */ }
    audioEl.ontimeupdate = () => { if (audioEl.duration) highlightWords(Math.ceil((audioEl.currentTime / audioEl.duration) * nWords)); };
    audioEl.onended = () => { highlightWords(nWords); done(); };
    await audioEl.play();
  }
  function stopSpeaking() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (audioEl) { audioEl.pause(); audioEl.onended = null; }
    done();
  }
  function interrupt(fromVoice) {
    if (S.mode !== 'speaking') return;
    stopSpeaking();
    highlightWords(1e6);
    setMode('listening');
    if (!fromVoice) setUserLine('');
    startRec();
  }

  // ======================= CONVERSATION (Claude) =======================
  // Full account snapshot for the system prompt. Frozen for the whole conversation: the model
  // binds its reasoning to the exact prompt prefix, so it must not change between turns.
  function context() {
    if (!S.frozenContext) { S.frozenContext = { ...B.snapshotForAI(), pennySettings: PS().forAI(), userProfile: window.Profile.forAI(), learningTopics: window.Learn.topicsForAI() }; S.sentKey = PS().key(); }
    return S.frozenContext;
  }
  // Live app state travels with each new user message instead (append-only, never edits history).
  function appStateNote() {
    const f = B.forecast(App.state.scenario || {});
    return `[Live app state, not said by the user: ${JSON.stringify({
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      minimumBuffer: B.settings.buffer,
      whatIfPreviewOnDashboard: App.state.scenario ? App.state.scenario.label : null,
      lowestBeforePaydayOnScreen: f.lowestBeforePayday,
      openReminders: App.state.reminders.filter((r) => !r.done).map((r) => r.title),
      emailDraftOnScreen: App.state.email && !App.state.email.sent ? { to: App.state.email.name, subject: App.state.email.subject } : null,
      emailsSentThisSession: App.state.sentEmails.map((e) => e.subject),
      inVoiceCall: S.call,
    })}]`;
  }

  const TOOL_LABEL = {
    run_forecast: '📈 Updated your forecast preview', clear_forecast_scenario: '↺ Cleared the what-if', get_transactions: '🔎 Checked transactions',
    plan_savings_goal: '🎯 Built a savings plan', set_minimum_buffer: '🛟 Updated your buffer', draft_email: '✉️ Drafted an email for review',
    send_email: '📤 Sent the email', add_reminders: '✅ Added reminders', show_screen: '📱 Opened a screen', set_language: '🌍 Switched language', show_bill_breakdown: '🧾 Explained your bill', check_benefits: '💷 Checked your benefits', start_quiz: '🎓 Opened a quiz', get_lesson: '📖 Pulled up a lesson', open_penny_settings: '⚙️ Opened settings',
  };

  function runTool(name, input) {
    input = input || {};
    switch (name) {
      case 'run_forecast': {
        const sc = {
          label: input.label || (input.one_off_spends?.length ? input.one_off_spends.map((s) => `${s.label || 'Spend'} ${B.gbp0(s.amount)}`).join(' + ') : input.salary_delay_days ? `Salary ${input.salary_delay_days} days late` : input.monthly_saving ? `Save ${B.gbp0(input.monthly_saving)}/month` : 'Scenario'),
          spends: (input.one_off_spends || []).map((s) => ({ amount: +s.amount, label: s.label, daysFromNow: +s.days_from_now || 0 })),
          salaryDelayDays: +input.salary_delay_days || 0,
          monthlySaving: +input.monthly_saving || 0,
          cancelSubscriptions: input.cancel_subscriptions || [],
        };
        const isBaseline = !sc.spends.length && !sc.salaryDelayDays && !sc.monthlySaving && !sc.cancelSubscriptions.length;
        const f = isBaseline ? B.forecast() : App.setScenario(sc);
        return { ...B.forecastSummaryForAI(f), shownOnDashboard: !isBaseline, note: 'Preview only; the real account balance is unchanged.' };
      }
      case 'clear_forecast_scenario': App.clearScenario(); return { ok: true };
      case 'get_transactions': return B.getTransactions(input);
      case 'plan_savings_goal': { const plan = B.savingsPlan(input.goal_amount, input.months, input.goal_label); App.showPlan(plan); return { ...plan, shownOnScreen: true }; }
      case 'set_minimum_buffer': { const b = App.setBuffer(input.amount); return { buffer: b, forecast: B.forecastSummaryForAI(B.forecast(App.state.scenario || {})) }; }
      case 'draft_email': {
        const d = App.openEmailDraft(input, { onSent: () => {} });
        return { status: 'Draft is open on screen for the user to review and edit. NOT sent yet.', to: d.name, subject: d.subject };
      }
      case 'send_email': {
        const r = App.sendCurrentEmail();
        return r;
      }
      case 'add_reminders': {
        const n = App.addReminders(input.items);
        if (App.state.tab !== 'home') App.show('home');
        App.toast('Added to Reminders', `${n} new reminder${n === 1 ? '' : 's'} from Penny`, '✅', '#5a287d');
        return { added: n };
      }
      case 'show_screen': App.show(input.screen === 'learn' ? 'help' : input.screen); return { shown: input.screen };
      case 'set_language': {
        const l = PS().setLang(input.language);
        if (!l) return { error: 'Unsupported language', supported: PS().LANGS.map((x) => x.name) };
        if (S.call) startRec();
        return { language: l.name, note: `Speech recognition and voice switched to ${l.name}. Reply in ${l.name} from now on.` };
      }
      case 'show_bill_breakdown': {
        App.showBillBreakdown({ ...input, rtl: !!PS().lang().rtl });
        return { shown: true, note: 'Breakdown card is open on screen.' };
      }
      case 'check_benefits': {
        const { extra_details, ...patch } = input;
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== ''));
        if (Object.keys(clean).length) window.Profile.set(clean);
        const r = window.Profile.benefits();
        PS().showBenefits(r);
        return { ...r, shownOnScreen: true };
      }
      case 'start_quiz': window.Learn.openQuiz(input.topic); return { opened: window.Learn.lessonForAI(input.topic).title };
      case 'get_lesson': return window.Learn.lessonForAI(input.topic);
      case 'open_penny_settings': PS().open(input.section); return { opened: true };
      default: return { error: 'Unknown tool' };
    }
  }

  async function callClaude() {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: S.messages, context: context() }) });
    const j = await r.json().catch(() => ({ error: 'Bad response from server' }));
    if (!r.ok) { const err = new Error(j.error || `Server error ${r.status}`); err.status = r.status; throw err; }
    return j;
  }

  function ask(text, opts = {}) {
    text = String(text || '').trim();
    if (!text) return;
    if (!S.open) openPanel();
    if (S.mode === 'speaking') stopSpeaking();
    stopRec();
    const gen = ++S.gen;
    setUserLine(text);
    addHistory('user', text);
    setMode('thinking');
    thinkingLine(opts.attachment ? 'Reading your bill…' : 'Checking your accounts…');
    if (opts.attachment) {
      addHistory('tool', `📎 ${opts.attachment.name}`);
      if (opts.attachment.thumb) $('#subUser').insertAdjacentHTML('afterbegin', `<img class="up-thumb" src="${opts.attachment.thumb}" alt="Uploaded bill"><br>`);
    }
    S.chain = S.chain.then(() => converse(text, gen, opts.attachment)).catch((e) => console.error(e));
    return S.chain;
  }

  async function converse(text, gen, attachment, retried) {
    if (!retried) S.lastTools = [];
    if (S.messages.length > 80) { S.messages = []; S.frozenContext = null; S.sentKey = null; } // keep long sessions fast
    const startLen = S.messages.length;
    context();
    const content = [{ type: 'text', text: appStateNote() }];
    if (attachment) content.push(attachment.block);
    content.push({ type: 'text', text });
    S.messages.push({ role: 'user', content });
    const k = PS().key();
    if (k !== S.sentKey) { // settings changed mid-conversation: tell Penny without editing earlier turns
      S.sentKey = k;
      S.messages.push({ role: 'system', content: `Settings updated by the user. Follow these from now on (they replace earlier ones): ${JSON.stringify({ pennySettings: PS().forAI(), userProfile: window.Profile.forAI() })}` });
    }
    let reply = '';
    try {
      for (let step = 0; step < 6; step++) {
        const res = await callClaude();
        if (res.stop_reason === 'refusal') {
          reply = res.text;
          S.messages.push({ role: 'assistant', content: [{ type: 'text', text: reply }] });
          break;
        }
        S.messages.push({ role: 'assistant', content: res.content });
        const texts = res.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
        if (texts) reply = texts;
        const uses = res.content.filter((b) => b.type === 'tool_use');
        if (res.stop_reason !== 'tool_use' || !uses.length) break;
        thinkingLine(WORKING[uses[0].name] || 'Working on it…');
        const results = uses.map((u) => {
          S.lastTools.push(u.name);
          let out;
          try { out = runTool(u.name, u.input); } catch (e) { out = { error: String(e.message || e) }; }
          S.toolsUsed.push(u.name);
          addHistory('tool', TOOL_LABEL[u.name] || u.name);
          return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) };
        });
        S.messages.push({ role: 'user', content: results });
      }
    } catch (e) {
      console.error('[Penny]', e.status, e.message);
      S.messages.length = startLen; // drop the unfinished turn so the conversation stays valid
      const authProblem = e.status === 401 || /api key|ANTHROPIC|credit balance/i.test(e.message);
      if (!retried && !authProblem) {
        // Recover silently: start a fresh conversation with the same question (fixes most one-off API errors).
        S.messages = []; S.frozenContext = null; S.sentKey = null;
        await new Promise((r) => setTimeout(r, 400));
        return converse(text, gen, attachment, true);
      }
      addHistory('tool', `⚠️ ${String(e.message || e).slice(0, 220)}`);
      reply = authProblem ? e.message : "Sorry, I lost connection for a second. Could you say that again?";
    }
    reply = reply || "Done — it's on your screen.";
    addHistory('penny', reply);
    const fu = S.lastTools.map((t) => FOLLOW_UPS[t]).filter(Boolean).pop();
    renderChips(fu);
    if (gen !== S.gen) return; // superseded by a newer question or the call ended
    if (!S.call && $('#optVoice').checked) {
      await speak(reply);
      if (gen === S.gen && !S.call) setMode('idle');
      return;
    }
    if (S.call) {
      await speak(reply);
      if (gen !== S.gen || !S.call) return;
      tone('start');
      setMode('listening');
      setUserLine('');
      startRec();
    } else {
      setPennyLine(reply);
      setMode('idle');
    }
  }

  // ======================= UPLOADS (bills, letters) =======================
  async function handleUpload(file) {
    try {
      let block, thumb;
      if (file.type === 'application/pdf') {
        if (file.size > 8e6) return App.toast('File too big', 'Please use a PDF under 8MB', '!', '#c4314b');
        const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); });
        block = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
      } else if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
        return App.toast("Can't open iPhone HEIC photos here", 'Take a screenshot of the bill, or export it as JPG/PNG', '!', '#c4314b');
      } else if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        thumb = c.toDataURL('image/jpeg', 0.85);
        block = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: thumb.split(',')[1] } };
      } else return App.toast('Unsupported file', 'Upload a photo or PDF of a bill', '!', '#c4314b');
      const l = PS().lang();
      if (!S.open) openPanel();
      ask(l.code === 'en' ? 'Can you break down this bill for me in plain English?' : `Can you break down this bill for me? Please explain it in ${l.name}.`, { attachment: { block, name: file.name, thumb } });
    } catch (e) { console.error(e); App.toast("Couldn't read that file", 'Try a screenshot or a JPG/PNG/PDF of the bill', '!', '#c4314b'); }
  }

  function previewVoice(text) {
    if (S.call) return;
    const prev = $('#optVoice').checked; $('#optVoice').checked = true;
    speak(text).then(() => { $('#optVoice').checked = prev; setMode('idle'); });
  }
  window.addEventListener('penny:lang', () => { const l = PS().lang(); $('#subtitles').setAttribute('dir', l.rtl ? 'rtl' : 'auto'); if (S.call && S.mode === 'listening') startRec(); });

  // ======================= CALL LIFECYCLE =======================
  async function startCall(opts = {}) {
    if (S.call) return;
    openPanel();
    S.call = true; S.muted = false;
    $('#btnMute').classList.remove('on'); $('#btnMute span').textContent = 'Mute';
    $('#btnCall').classList.add('end'); $('#btnCall').setAttribute('aria-label', 'End call');
    $('#pennyFab').classList.add('live');
    setMode('connecting');
    startTimer();
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (!SR) { $('#pennyPanel').classList.add('typing'); $('#btnKeyboard').classList.add('on'); }
    await startMicLevel();
    const gen = ++S.gen;
    S.callTurnStart = S.turns.length; // Penny remembers earlier calls; the summary covers just this one
    setUserLine('');
    if (opts.silent) return; // e.g. opened from an alert: the question is asked straight away
    if (!S.greeted) {
      S.greeted = true;
      const greeting = PS().greeting();
      addHistory('penny', greeting);
      await speak(greeting);
    } else {
      setPennyLine("I'm listening…");
    }
    if (gen !== S.gen || !S.call) return;
    tone('start');
    setMode('listening');
    if (!SR) setPennyLine("Voice input isn't supported in this browser — type below and I'll answer out loud.");
    startRec();
  }

  function endCall() {
    if (!S.call) return;
    S.call = false; S.gen++;
    stopRec(); stopSpeaking(); stopMicLevel(); stopTimer();
    $('#btnCall').classList.remove('end'); $('#btnCall').setAttribute('aria-label', 'Start call');
    $('#pennyFab').classList.remove('live');
    $('#island').classList.remove('active');
    setMode('idle');
    setUserLine('');
    tone('end');
    setPennyLine('Call ended. Tap the green button to talk again.');
    const hadConversation = S.turns.slice(S.callTurnStart).some((t) => t.role === 'user');
    if (hadConversation) {
      minimisePanel();
      showPostCall();
    }
  }

  // ======================= POST-CALL ACTION CARDS =======================
  async function showPostCall() {
    const transcript = S.turns.slice(S.callTurnStart).map((t) => (t.role === 'user' ? `Customer: ${t.text}` : t.role === 'penny' ? `Penny: ${t.text}` : `[action: ${t.text}]`)).join('\n');
    App.openSheet(`<div class="sum-head"><div class="ib-orb"></div><div><h3>Call with Penny</h3><div class="sub">${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · ${$('#islandTime').textContent}</div></div></div>
      <div class="loading"><div class="spinner"></div>Penny is writing up your call…</div>`);
    let w;
    try {
      const r = await fetch('/api/wrapup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript, context: context(), language: PS().lang().name }) });
      w = await r.json();
      if (!r.ok) throw new Error(w.error);
    } catch (e) {
      const pennyLines = S.turns.slice(S.callTurnStart).filter((t) => t.role === 'penny').map((t) => t.text);
      w = {
        title: 'Your money check-in', summary: pennyLines.slice(-2).join(' ') || 'We talked through your money.',
        key_points: pennyLines.slice(0, 3), tasks: [{ title: 'Review your forecast before payday', due: B.fmtDate(B.addDays(B.nextPayday(), -3)) }, { title: 'Check subscriptions you no longer use', due: 'This week' }],
        followup_email: { needed: false },
      };
    }
    renderPostCall(w);
  }

  function renderPostCall(w) {
    const fe = w.followup_email && w.followup_email.needed ? w.followup_email : null;
    const s = App.openSheet(`
      <div class="sum-head"><div class="ib-orb"></div><div><h3>${esc(w.title || 'Call summary')}</h3><div class="sub">Call with Penny · ${$('#islandTime').textContent}</div></div></div>
      <div class="sum-card">${esc(w.summary)}${w.key_points?.length ? `<ul>${w.key_points.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}</div>
      <div class="section-h" style="padding:6px 4px">Next steps</div>
      <button class="cta" id="ctaEmail"><span class="cta-ic">✉</span><span>Send summary to email<small>${esc(B.customer.email)}</small></span><span class="chev">›</span></button>
      <button class="cta" id="ctaTasks"><span class="cta-ic">✓</span><span>Add tasks to Reminders<small>${(w.tasks || []).length} suggested task${(w.tasks || []).length === 1 ? '' : 's'}</small></span><span class="chev">›</span></button>
      <div id="taskPick"></div>
      ${fe ? `<button class="cta" id="ctaDraft"><span class="cta-ic">✎</span><span>Email ${esc(fe.recipient_name)}<small>Penny drafted it — review before sending</small></span><span class="chev">›</span></button>`
        : `<button class="cta" id="ctaCallback"><span class="cta-ic">☎</span><span>Book a callback with a money coach<small>Free, no obligation</small></span><span class="chev">›</span></button>`}
      <div class="btn-row"><button class="btn ghost" id="ctaClose">Done</button></div>`);
    s.querySelector('#ctaClose').onclick = App.closeSheet;
    s.querySelector('#ctaEmail').onclick = (e) => {
      const b = e.currentTarget; if (b.classList.contains('done')) return;
      b.classList.add('done'); b.querySelector('small').textContent = 'Sent ✓';
      App.toast('Summary sent', `Check ${B.customer.email}`, '✉', '#1f8a4c');
    };
    s.querySelector('#ctaTasks').onclick = (e) => {
      const b = e.currentTarget; if (b.classList.contains('done')) return;
      const tasks = w.tasks || [];
      const pick = s.querySelector('#taskPick');
      pick.innerHTML = `<div class="task-pick">${tasks.map((t, i) => `<label><input type="checkbox" checked data-i="${i}"/><span>${esc(t.title)}<small>${esc(t.due || '')}</small></span></label>`).join('')}</div>
        <button class="btn primary" id="addTasks" style="width:100%;margin-bottom:10px">Add to Reminders</button>`;
      pick.querySelector('#addTasks').onclick = () => {
        const chosen = [...pick.querySelectorAll('input:checked')].map((i) => tasks[+i.dataset.i]);
        const n = App.addReminders(chosen);
        pick.innerHTML = '';
        b.classList.add('done'); b.querySelector('small').textContent = `${n} added ✓`;
        App.toast('Added to Reminders', `${n} task${n === 1 ? '' : 's'} on your dashboard`, '✅', '#5a287d');
      };
    };
    const d = s.querySelector('#ctaDraft');
    if (d) d.onclick = () => App.openEmailDraft(fe);
    const cb = s.querySelector('#ctaCallback');
    if (cb) cb.onclick = (e) => { e.currentTarget.classList.add('done'); e.currentTarget.querySelector('small').textContent = 'Requested ✓ — we\'ll call within 2 working days'; App.toast('Callback requested', 'A money coach will be in touch', '☎', '#1f8a4c'); };
  }

  // When a sheet (e.g. email draft) closes mid-call, bring the call panel back.
  window.addEventListener('app:sheet-closed', () => { if (S.call && !S.open) setTimeout(openPanel, 250); });
  window.addEventListener('app:sheet-opened', () => { if (S.call && S.open) minimisePanel(); });

  // ======================= boot =======================
  fetch('/api/config').then((r) => r.json()).then((c) => {
    S.tts = c.tts; PS().state.ttsMode = c.tts;
    if (SR) $('#stMic').textContent = `Voice: speech recognition ready · ${c.tts === 'elevenlabs' ? 'ElevenLabs' : 'browser'} voice`;
    $('#dotAI').className = 'dot ok';
    $('#stAI').textContent = `AI: Claude (${c.model}) via local server`;
  }).catch(() => { $('#dotAI').className = 'dot bad'; $('#stAI').textContent = 'Server not reachable — run `npm start`'; });
  $('#dotMic').className = 'dot ' + (SR ? 'ok' : 'warn');
  $('#stMic').textContent = SR ? `Voice: speech recognition ready (${S.tts === 'elevenlabs' ? 'ElevenLabs' : 'browser'} voice)` : 'Voice input needs Chrome, Edge or Safari (typing works)';
  $('#demoPrompts').innerHTML = SUGGESTIONS.concat(['Email Bright Energy and ask if they can lower my bill', 'What benefits am I entitled to?', 'Quiz me on ISAs out loud', '¿Puedes hablar en español?', "What's the weather like?"]).map((q) => `<li>${esc(q)}</li>`).join('');
  $('#demoPrompts').querySelectorAll('li').forEach((li) => (li.onclick = () => ask(li.textContent)));
  $('#bufVal').textContent = B.gbp0(B.settings.buffer);

  window.Penny = {
    open: openPanel,
    openAndAsk: async (q) => { openPanel(); if (!S.call) await startCall({ silent: true }); ask(q); },
    ask, startCall, endCall, previewVoice, handleUpload, state: S, _renderPostCall: renderPostCall,
  };
})();
