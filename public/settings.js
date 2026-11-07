/* Penny settings: language, voice, speaking style, custom personality, "About you" profile, benefits results. */
(function () {
  const App = window.App, P = window.Profile, B = window.Bank;
  const esc = App.esc;

  const LANGS = [
    { code: 'en', name: 'English', native: 'English', sr: 'en-GB', tts: 'en-GB', greet: 'Hi {name}, it\'s Penny. I\'m looking at your accounts now. What\'s on your mind money-wise?' },
    { code: 'es', name: 'Spanish', native: 'Español', sr: 'es-ES', tts: 'es-ES', greet: 'Hola {name}, soy Penny. Estoy mirando tus cuentas. ¿En qué te puedo ayudar con tu dinero?' },
    { code: 'ar', name: 'Arabic', native: 'العربية', sr: 'ar-SA', tts: 'ar-SA', rtl: true, greet: 'مرحباً {name}، أنا بيني. أنا أطّلع على حساباتك الآن. كيف أقدر أساعدك بخصوص فلوسك؟' },
    { code: 'fr', name: 'French', native: 'Français', sr: 'fr-FR', tts: 'fr-FR', greet: 'Bonjour {name}, c\'est Penny. Je regarde vos comptes. Comment puis-je vous aider avec votre argent ?' },
    { code: 'pl', name: 'Polish', native: 'Polski', sr: 'pl-PL', tts: 'pl-PL', greet: 'Cześć {name}, tu Penny. Przeglądam twoje konta. W czym mogę pomóc w sprawie pieniędzy?' },
    { code: 'ur', name: 'Urdu', native: 'اردو', sr: 'ur-PK', tts: 'ur-PK', rtl: true, greet: 'السلام علیکم {name}، میں پینی ہوں۔ میں آپ کے اکاؤنٹس دیکھ رہی ہوں۔ پیسوں کے بارے میں کیا مدد چاہیے؟' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', sr: 'hi-IN', tts: 'hi-IN', greet: 'नमस्ते {name}, मैं पेनी हूँ। मैं आपके खाते देख रही हूँ। पैसों के बारे में क्या मदद चाहिए?' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', sr: 'pa-IN', tts: 'pa-IN', greet: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ {name}, ਮੈਂ ਪੈਨੀ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੇ ਖਾਤੇ ਦੇਖ ਰਹੀ ਹਾਂ। ਪੈਸਿਆਂ ਬਾਰੇ ਕੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', sr: 'bn-IN', tts: 'bn-IN', greet: 'নমস্কার {name}, আমি পেনি। আমি আপনার অ্যাকাউন্টগুলো দেখছি। টাকা নিয়ে কী সাহায্য লাগবে?' },
    { code: 'zh', name: 'Chinese', native: '中文', sr: 'zh-CN', tts: 'zh-CN', greet: '你好{name}，我是Penny。我正在看你的账户。关于钱，我能帮你什么？' },
    { code: 'pt', name: 'Portuguese', native: 'Português', sr: 'pt-PT', tts: 'pt-PT', greet: 'Olá {name}, é a Penny. Estou a ver as suas contas. Em que posso ajudar com o seu dinheiro?' },
    { code: 'ro', name: 'Romanian', native: 'Română', sr: 'ro-RO', tts: 'ro-RO', greet: 'Bună {name}, sunt Penny. Mă uit acum la conturile tale. Cu ce te pot ajuta legat de bani?' },
    { code: 'it', name: 'Italian', native: 'Italiano', sr: 'it-IT', tts: 'it-IT', greet: 'Ciao {name}, sono Penny. Sto guardando i tuoi conti. Come posso aiutarti con i tuoi soldi?' },
    { code: 'de', name: 'German', native: 'Deutsch', sr: 'de-DE', tts: 'de-DE', greet: 'Hallo {name}, hier ist Penny. Ich schaue mir gerade deine Konten an. Wie kann ich dir beim Thema Geld helfen?' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', sr: 'tr-TR', tts: 'tr-TR', greet: 'Merhaba {name}, ben Penny. Hesaplarına bakıyorum. Parayla ilgili nasıl yardımcı olabilirim?' },
    { code: 'cy', name: 'Welsh', native: 'Cymraeg', sr: 'cy-GB', tts: 'cy-GB', greet: 'Helo {name}, Penny sydd yma. Rwy\'n edrych ar eich cyfrifon. Sut alla i helpu gydag arian?' },
  ];
  const EN_GREET = {
    teen: 'Hey {name}, Penny here. Got your accounts up. What\'s going on money-wise?',
    older: 'Hello {name}, it\'s Penny here. I\'ve got your accounts in front of me. Take your time. What would you like help with today?',
  };

  const STYLES = {
    warm: { label: 'Warm', rate: 1, pitch: 1.05, prompt: 'Warm and reassuring.' },
    calm: { label: 'Calm', rate: 0.92, pitch: 0.97, prompt: 'Calm, gentle and unhurried.' },
    upbeat: { label: 'Upbeat', rate: 1.08, pitch: 1.12, prompt: 'Upbeat, energetic and encouraging.' },
    funny: { label: 'Funny', rate: 1.04, pitch: 1.1, prompt: 'Witty with light, kind humour — at most one quip per reply, and never joke about hardship or worry.' },
    straight: { label: 'Straight-talking', rate: 1.05, pitch: 1, prompt: 'Straight-talking and no-nonsense, but still kind.' },
  };
  const PERSONALITY_CHIPS = ['Friendly bestie', 'Calm & patient', 'Funny and cheeky', 'Straight-talking', 'Hype coach who cheers me on', 'Playful & charming', 'Wise grandparent', 'Formal & professional'];

  const ELEVEN_VOICES = [
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily — British, warm', g: 'f' },
    { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice — British, confident', g: 'f' },
    { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda — friendly', g: 'f' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica — playful', g: 'f' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel — British, calm', g: 'm' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George — British, warm', g: 'm' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie — casual', g: 'm' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian — deep', g: 'm' },
  ];

  // Name → gender hints for common system voices (macOS, Windows, Chrome). Unknown voices are listed without a symbol.
  const FEMALE = /samantha|karen|moira|tessa|serena|kate|martha|stephanie|fiona|victoria|allison|ava|susan|zoe|monica|mónica|paulina|marisol|amelie|amélie|audrey|aurelie|laila|zosia|lekha|ting|mei|sin-ji|joana|luciana|ioana|alice|federica|anna|yelda|sara|ellen|nora|milena|carmit|kyoko|yuna|damayanti|kanya|mariska|melina|satu|zuzana|lana|female|sonia|libby|maisie|hazel|susan|jenny|aria|michelle|elvira|denise|hedda|katja|salma|zariyah|swara|neerja|xiaoxiao|elsa|isabella|paola|agnieszka|alina|emel|nesrin|amira|hala|sapna|tanishaa|nabanita|uzma|gul|francisca|raquel|dalia/i;
  const MALE = /daniel|arthur|oliver|rishi|aaron|fred|\btom\b|jorge|diego|juan|thomas|majed|luca|xander|yuri|maged|rocko|eddy|reed|grandpa|ralph|albert|male|ryan|thomas|alfie|elliot|guy|davis|tony|alvaro|henri|conrad|diego|antonio|marek|hamed|shakir|madhur|prabhat|asad|salman|yunxi|ahmet|bashkar|rodrigo|duarte|emil|gordon|lee\b/i;
  const genderOf = (name) => (FEMALE.test(name) ? 'f' : MALE.test(name) ? 'm' : '');

  const state = {
    lang: 'en', gender: 'f', voiceName: '', elevenVoice: 'pFZP5JQG7iQjIQuC4Bku', style: 'warm', speed: 1,
    personality: '', ttsMode: 'browser',
  };
  try { Object.assign(state, JSON.parse(localStorage.getItem('penny.settings') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('penny.settings', JSON.stringify(state)); } catch (e) {} };

  const lang = () => LANGS.find((l) => l.code === state.lang) || LANGS[0];
  function setLang(code) {
    const l = LANGS.find((x) => x.code === code || x.name.toLowerCase() === String(code).toLowerCase() || x.native.toLowerCase() === String(code).toLowerCase());
    if (!l) return null;
    if (l.code !== state.lang) { state.lang = l.code; state.voiceName = ''; save(); window.dispatchEvent(new Event('penny:lang')); }
    return l;
  }
  function greeting() {
    const l = lang(), g = P.ageGroup();
    const t = l.code === 'en' && EN_GREET[g] ? EN_GREET[g] : l.greet;
    return t.replace('{name}', B.customer.firstName);
  }

  // ---------- browser voices ----------
  let voices = [];
  const loadVoices = () => { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; };
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.addEventListener('voiceschanged', loadVoices); }
  function voicesFor(code = lang().tts) {
    const base = code.split('-')[0].toLowerCase();
    return voices.filter((v) => v.lang.replace('_', '-').toLowerCase().split('-')[0] === base);
  }
  const quality = (v) => (/natural|online|premium|enhanced|neural/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : 0) + (v.lang.replace('_', '-') === lang().tts ? 1 : 0);
  function pickVoice() {
    const list = voicesFor();
    if (!list.length) return null;
    const chosen = list.find((v) => v.name === state.voiceName);
    if (chosen) return chosen;
    const byG = list.filter((v) => genderOf(v.name) === state.gender);
    const pool = byG.length ? byG : list;
    return pool.slice().sort((a, b) => quality(b) - quality(a))[0];
  }
  function speech() {
    const st = STYLES[state.style] || STYLES.warm;
    return { rate: st.rate * state.speed * P.speechRateFactor(), pitch: st.pitch, lang: lang().tts };
  }

  function forAI() {
    const st = STYLES[state.style] || STYLES.warm;
    const l = lang();
    return {
      language: `${l.name} (${l.native}) — reply ONLY in this language unless the user switches`,
      languageCode: l.code,
      voice: state.gender === 'm' ? 'male voice' : 'female voice',
      speakingStyle: st.prompt,
      customPersonality: state.personality || null,
    };
  }
  const key = () => JSON.stringify([forAI(), P.forAI()]);

  // ---------- settings sheet ----------
  function open(section) {
    const p = P.get();
    const l = lang();
    const list = state.ttsMode === 'elevenlabs' ? null : voicesFor();
    const voiceOpts = state.ttsMode === 'elevenlabs'
      ? ELEVEN_VOICES.filter((v) => v.g === state.gender).map((v) => `<option value="${v.id}" ${v.id === state.elevenVoice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')
      : `<option value="">Auto (best ${state.gender === 'm' ? 'male' : 'female'} ${esc(l.name)} voice)</option>` + list.map((v) => `<option value="${esc(v.name)}" ${v.name === state.voiceName ? 'selected' : ''}>${{ f: '♀ ', m: '♂ ' }[genderOf(v.name)] || ''}${esc(v.name)}</option>`).join('');
    const sel = (name, opts, val) => `<select name="${name}">${opts.map(([v, t]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const s = App.openSheet(`
      <h3>Penny settings</h3>
      <div class="sub">Make Penny yours — she adapts to who you are and how you like to talk.</div>

      <div class="set-sec"><h4>Who's using the app?</h4>
        <div class="persona-row">${Object.entries(P.PRESETS).map(([id, pr]) => `<button class="persona ${p.presetId === id ? 'on' : ''}" data-preset="${id}"><span>${pr.emoji}</span>${esc(pr.label)}</button>`).join('')}</div>
        <small class="hint">Demo people — Penny changes her tone, pace and advice for each.</small>
      </div>

      <div class="set-sec"><h4>🌍 Language</h4>
        <select id="setLang">${LANGS.map((x) => `<option value="${x.code}" ${x.code === l.code ? 'selected' : ''}>${x.native} — ${x.name}</option>`).join('')}</select>
        ${state.ttsMode !== 'elevenlabs' && !list.length ? `<div class="warn-note">No ${esc(l.name)} voice is installed on this computer, so Penny can't speak it aloud yet. On a Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → add a ${esc(l.name)} voice, then reload. Subtitles still work.</div>` : ''}
      </div>

      <div class="set-sec"><h4>🗣️ Voice</h4>
        <div class="seg2"><button data-g="f" class="${state.gender === 'f' ? 'on' : ''}">Female</button><button data-g="m" class="${state.gender === 'm' ? 'on' : ''}">Male</button></div>
        <select id="setVoice">${voiceOpts}</select>
        ${state.ttsMode !== 'elevenlabs' && list.length && !list.some((v) => genderOf(v.name) === state.gender) ? `<div class="warn-note">No ${state.gender === 'm' ? 'male' : 'female'} ${esc(l.name)} voice found here, so Penny uses the closest available.</div>` : ''}
        <div class="chip-row">${Object.entries(STYLES).map(([k, v]) => `<button class="chip ${state.style === k ? 'on' : ''}" data-style="${k}">${v.label}</button>`).join('')}</div>
        <label class="slider">Speed <input type="range" id="setSpeed" min="0.75" max="1.3" step="0.05" value="${state.speed}"><span id="spdVal">${state.speed.toFixed(2)}×</span></label>
        <button class="btn ghost small" id="setPreview">▶ Preview voice</button>
      </div>

      <div class="set-sec"><h4>✨ Personality</h4>
        <textarea id="setPers" rows="3" placeholder="Describe how you want Penny to be… e.g. 'like a supportive big sister who keeps it real'">${esc(state.personality)}</textarea>
        <div class="chip-row">${PERSONALITY_CHIPS.map((c) => `<button class="chip" data-pers="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <small class="hint">Penny stays respectful and only talks about money, whatever personality you pick.</small>
      </div>

      <details class="set-sec" id="aboutSec" ${section === 'about' ? 'open' : ''}><summary><h4>🙋 About you</h4><span class="hint">Used to personalise advice and check benefits</span></summary>
        <form id="profForm" class="prof-grid">
          <label>Name<input name="name" value="${esc(p.name)}"></label>
          <label>Age<input name="age" type="number" min="13" max="110" value="${p.age}"></label>
          <label>Region${sel('region', [['England', 'England'], ['Scotland', 'Scotland'], ['Wales', 'Wales'], ['Northern Ireland', 'Northern Ireland']], p.region)}</label>
          <label>Lives with${sel('livesWith', [['alone', 'On my own'], ['partner', 'Partner'], ['family', 'My kids / family'], ['parents', 'Parents'], ['housemates', 'Housemates']], p.livesWith)}</label>
          <label>Relationship${sel('relationship', [['single', 'Single'], ['married', 'Married / civil partner'], ['cohabiting', 'Living together'], ['widowed', 'Widowed']], p.relationship)}</label>
          <label>Children<input name="children" type="number" min="0" max="12" value="${p.children}"></label>
          <label>Children's ages<input name="childAges" placeholder="e.g. 3, 7" value="${esc((p.childAges || []).join(', '))}"></label>
          <label>Work${sel('employment', [['employed', 'Employed full-time'], ['part-time', 'Part-time'], ['self-employed', 'Self-employed'], ['unemployed', 'Not working'], ['student', 'Student'], ['retired', 'Retired']], p.employment)}</label>
          <label>Your yearly income £<input name="income" type="number" value="${p.income}"></label>
          <label>Partner's income £<input name="partnerIncome" type="number" value="${p.partnerIncome || 0}"></label>
          <label>Savings £<input name="savings" type="number" value="${p.savings}"></label>
          <label>Home${sel('housing', [['rent', 'Renting'], ['mortgage', 'Mortgage'], ['own', 'Own outright'], ['family', 'With family']], p.housing)}</label>
          <label>Rent per month £<input name="rent" type="number" value="${p.rent || 0}"></label>
          <label>Hours caring / week<input name="carerHours" type="number" min="0" value="${p.carerHours || 0}"></label>
          <div class="checks">
            <label><input type="checkbox" name="disability" ${p.disability ? 'checked' : ''}> Long-term illness or disability</label>
            <label><input type="checkbox" name="needsCare" ${p.needsCare ? 'checked' : ''}> I need help with personal care</label>
            <label><input type="checkbox" name="pregnant" ${p.pregnant ? 'checked' : ''}> Pregnant</label>
            <label><input type="checkbox" name="inEducation" ${p.inEducation ? 'checked' : ''}> In full-time education</label>
            <label><input type="checkbox" name="firstHome" ${p.firstHome ? 'checked' : ''}> Saving for a first home</label>
            <label><input type="checkbox" name="uniform" ${p.uniform ? 'checked' : ''}> I wear a uniform for work</label>
          </div>
          <label class="full">Anything else about you<textarea name="about" rows="2">${esc(p.about || '')}</textarea></label>
        </form>
      </details>

      <button class="cta" id="setBenefits"><span class="cta-ic">💷</span><span>Check what I'm entitled to<small>Benefits, discounts and bonuses people often miss</small></span><span class="chev">›</span></button>
      <div class="btn-row"><button class="btn primary" id="setSave">Save</button></div>`);

    const reopen = (sec) => { readProfile(); open(sec); };
    s.querySelectorAll('[data-preset]').forEach((b) => (b.onclick = () => { P.usePreset(b.dataset.preset); App.toast(`Hi ${P.get().name}!`, 'Penny will adapt to you', P.PRESETS[b.dataset.preset].emoji, '#5a287d'); open(); }));
    s.querySelector('#setLang').onchange = (e) => { readProfile(); setLang(e.target.value); open(); };
    s.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { state.gender = b.dataset.g; state.voiceName = ''; state.elevenVoice = (ELEVEN_VOICES.find((v) => v.g === state.gender) || ELEVEN_VOICES[0]).id; save(); reopen(s.querySelector('#aboutSec').open ? 'about' : ''); }));
    s.querySelector('#setVoice').onchange = (e) => { if (state.ttsMode === 'elevenlabs') state.elevenVoice = e.target.value; else state.voiceName = e.target.value; save(); };
    s.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { state.style = b.dataset.style; save(); s.querySelectorAll('[data-style]').forEach((x) => x.classList.toggle('on', x === b)); }));
    s.querySelector('#setSpeed').oninput = (e) => { state.speed = +e.target.value; s.querySelector('#spdVal').textContent = state.speed.toFixed(2) + '×'; save(); };
    s.querySelector('#setPreview').onclick = () => window.Penny && window.Penny.previewVoice(greeting());
    s.querySelectorAll('[data-pers]').forEach((b) => (b.onclick = () => { const t = s.querySelector('#setPers'); t.value = t.value ? `${t.value.replace(/[.\s]+$/, '')}, ${b.dataset.pers.toLowerCase()}` : b.dataset.pers; state.personality = t.value; save(); }));
    s.querySelector('#setPers').oninput = (e) => { state.personality = e.target.value; save(); };
    s.querySelector('#setBenefits').onclick = () => { readProfile(); showBenefits(P.benefits()); };
    s.querySelector('#setSave').onclick = () => { readProfile(); App.closeSheet(); App.toast('Penny updated', `${lang().native} · ${STYLES[state.style].label}${state.personality ? ' · custom personality' : ''}`, '✨', '#5a287d'); };

    function readProfile() {
      const f = s.querySelector('#profForm');
      if (!f) return;
      const d = Object.fromEntries(new FormData(f).entries());
      const patch = {
        name: d.name || P.get().name, age: +d.age || P.get().age, region: d.region, livesWith: d.livesWith, relationship: d.relationship,
        children: +d.children || 0, childAges: String(d.childAges || '').split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => !isNaN(n)),
        employment: d.employment, income: +d.income || 0, partnerIncome: +d.partnerIncome || 0, savings: +d.savings || 0,
        housing: d.housing, rent: +d.rent || 0, carerHours: +d.carerHours || 0, about: d.about || '',
      };
      ['disability', 'needsCare', 'pregnant', 'inEducation', 'firstHome', 'uniform'].forEach((k) => (patch[k] = !!d[k]));
      const changed = Object.entries(patch).some(([k, v]) => JSON.stringify(P.get()[k]) !== JSON.stringify(v));
      if (changed) P.set({ ...patch, presetId: 'custom' });
    }
  }

  // ---------- benefits results ----------
  function showBenefits(r) {
    const badge = { likely: ['Likely', 'ok'], possible: ['Possibly', 'warn'], check: ['Worth checking', ''] };
    const s = App.openSheet(`
      <div class="sum-head"><div class="ib-orb"></div><div><h3>Money you could be missing</h3><div class="sub">For ${esc(r.forName)} · estimates</div></div></div>
      ${r.estimatedAnnualValueLikely ? `<div class="ben-total">Up to <b>£${r.estimatedAnnualValueLikely.toLocaleString('en-GB')}</b> a year you're likely entitled to</div>` : ''}
      ${r.benefits.length ? r.benefits.map((b) => `<div class="ben">
        <div class="ben-top"><b>${esc(b.name)}</b><span class="pill2 ${badge[b.status][1]}">${badge[b.status][0]}</span></div>
        <div class="ben-val">${esc(b.value)}</div>
        <div class="ben-why">${esc(b.why)}</div>
        <a class="src-link" href="${b.url}" target="_blank" rel="noopener">${esc(b.how)} ↗</a></div>`).join('') : '<div class="sum-card">Nothing obvious from what you\'ve told me — but a full check can still find things.</div>'}
      <div class="ben-note">${esc(r.context)} ${esc(r.note)}</div>
      <div class="btn-row"><button class="btn ghost" id="benEdit">Edit my details</button><button class="btn primary" id="benAsk">🎙️ Talk it through</button></div>`);
    s.querySelector('#benEdit').onclick = () => open('about');
    s.querySelector('#benAsk').onclick = () => { App.closeSheet(); window.Penny && window.Penny.openAndAsk('Can you explain which benefits I might be entitled to and how to claim them?'); };
  }

  window.PennySettings = { state, LANGS, lang, setLang, greeting, pickVoice, speech, forAI, key, open, showBenefits, elevenVoice: () => state.elevenVoice, save };
})();
