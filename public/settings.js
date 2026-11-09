/* Penny settings: language, voice, speaking style, custom personality, "About you" profile, benefits results. */
(function () {
  const App = window.App, P = window.Profile, B = window.Bank;
  const esc = App.esc;

  const LANGS = [
    { code: 'en', name: 'English', native: 'English', sr: 'en-GB', tts: 'en-GB', greet: 'Hi {name}, how can I help?' },
    { code: 'es', name: 'Spanish', native: 'Español', sr: 'es-ES', tts: 'es-ES', greet: 'Hola {name}, ¿en qué te ayudo?' },
    { code: 'ar', name: 'Arabic', native: 'العربية', sr: 'ar-SA', tts: 'ar-SA', rtl: true, greet: 'أهلاً {name}، كيف أقدر أساعدك؟' },
    { code: 'fr', name: 'French', native: 'Français', sr: 'fr-FR', tts: 'fr-FR', greet: 'Bonjour {name}, comment puis-je vous aider ?' },
    { code: 'pl', name: 'Polish', native: 'Polski', sr: 'pl-PL', tts: 'pl-PL', greet: 'Cześć {name}, w czym mogę pomóc?' },
    { code: 'ur', name: 'Urdu', native: 'اردو', sr: 'ur-PK', tts: 'ur-PK', rtl: true, greet: 'السلام علیکم {name}، میں کیسے مدد کر سکتی ہوں؟' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', sr: 'hi-IN', tts: 'hi-IN', greet: 'नमस्ते {name}, मैं कैसे मदद करूँ?' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', sr: 'pa-IN', tts: 'pa-IN', greet: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ {name}, ਮੈਂ ਕਿਵੇਂ ਮਦਦ ਕਰਾਂ?' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', sr: 'bn-IN', tts: 'bn-IN', greet: 'নমস্কার {name}, কীভাবে সাহায্য করতে পারি?' },
    { code: 'zh', name: 'Chinese', native: '中文', sr: 'zh-CN', tts: 'zh-CN', greet: '你好{name}，有什么可以帮你？' },
    { code: 'pt', name: 'Portuguese', native: 'Português', sr: 'pt-PT', tts: 'pt-PT', greet: 'Olá {name}, em que posso ajudar?' },
    { code: 'ro', name: 'Romanian', native: 'Română', sr: 'ro-RO', tts: 'ro-RO', greet: 'Bună {name}, cu ce te pot ajuta?' },
    { code: 'it', name: 'Italian', native: 'Italiano', sr: 'it-IT', tts: 'it-IT', greet: 'Ciao {name}, come posso aiutarti?' },
    { code: 'de', name: 'German', native: 'Deutsch', sr: 'de-DE', tts: 'de-DE', greet: 'Hallo {name}, wie kann ich helfen?' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', sr: 'tr-TR', tts: 'tr-TR', greet: 'Merhaba {name}, nasıl yardımcı olabilirim?' },
    { code: 'cy', name: 'Welsh', native: 'Cymraeg', sr: 'cy-GB', tts: 'cy-GB', greet: 'Helo {name}, sut alla i helpu?' },
  ];
  const EN_GREET = {
    teen: 'Hey {name}, what\'s up?',
    older: 'Hello {name}, it\'s Penny. How can I help you today?',
  };

  const STYLES = {
    warm: { label: 'Warm', rate: 1, pitch: 1.05, prompt: 'Warm and reassuring.' },
    calm: { label: 'Calm', rate: 0.92, pitch: 0.97, prompt: 'Calm, gentle and unhurried.' },
    upbeat: { label: 'Upbeat', rate: 1.08, pitch: 1.12, prompt: 'Upbeat, energetic and encouraging.' },
    funny: { label: 'Funny', rate: 1.04, pitch: 1.1, prompt: 'Witty with light, kind humour — at most one quip per reply, and never joke about hardship or worry.' },
    straight: { label: 'Straight-talking', rate: 1.05, pitch: 1, prompt: 'Straight-talking and no-nonsense, but still kind.' },
  };
  const PERSONALITY_CHIPS = ['Friendly', 'Calm & patient', 'Funny', 'Straight-talking', 'Hype coach', 'Formal'];

  const ELEVEN_VOICES = [
    { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice — British, confident', g: 'f' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily — British, warm', g: 'f' },
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
    lang: 'en', gender: 'f', voiceName: '', elevenVoice: 'Xb7hH8MSUJpSbSDYk0k2', style: 'warm', speed: 1,
    personality: '', ttsMode: 'browser', speak: true, barge: false, bigText: false,
  };
  try { Object.assign(state, JSON.parse(localStorage.getItem('penny.settings.v2') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('penny.settings.v2', JSON.stringify(state)); } catch (e) {} window.dispatchEvent(new Event('penny:settings')); };

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
    const eleven = state.ttsMode === 'elevenlabs';
    const list = eleven ? [] : voicesFor();
    const voiceOpts = eleven
      ? ELEVEN_VOICES.map((v) => `<option value="${v.id}" ${v.id === state.elevenVoice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')
      : `<option value="auto:f" ${!state.voiceName && state.gender === 'f' ? 'selected' : ''}>Automatic — female</option><option value="auto:m" ${!state.voiceName && state.gender === 'm' ? 'selected' : ''}>Automatic — male</option>` +
        list.map((v) => `<option value="${esc(v.name)}" ${v.name === state.voiceName ? 'selected' : ''}>${esc(v.name.replace(/^(Microsoft|Google)\s+/, ''))}</option>`).join('');
    const sel = (name, opts, val) => `<select name="${name}">${opts.map(([v, t]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const sw = (id, on, label, hint) => `<label class="set-row sw-row"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" class="switch" id="${id}" ${on ? 'checked' : ''}></label>`;
    const s = App.openSheet(`
      <div class="set-title"><h3>Penny</h3><button class="link-btn" id="setDone">Done</button></div>

      <div class="set-label">Voice & language</div>
      <div class="set-group">
        <label class="set-row"><span>Language</span><select id="setLang">${LANGS.map((x) => `<option value="${x.code}" ${x.code === l.code ? 'selected' : ''}>${x.native}</option>`).join('')}</select></label>
        <label class="set-row"><span>Voice</span><select id="setVoice">${voiceOpts}</select></label>
        <div class="set-row col"><span>Style</span><div class="chip-row">${Object.entries(STYLES).map(([k, v]) => `<button class="chip ${state.style === k ? 'on' : ''}" data-style="${k}">${v.label}</button>`).join('')}</div></div>
        <label class="set-row"><span>Speed</span><input type="range" id="setSpeed" min="0.8" max="1.25" step="0.05" value="${state.speed}"></label>
        <button class="set-row link-row" id="setPreview"><span>Hear Penny</span><span class="chev">▶</span></button>
      </div>
      ${!eleven && !list.length ? `<div class="warn-note">This computer has no ${esc(l.name)} voice, so Penny will show subtitles but can't speak it yet. On a Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices.</div>` : ''}

      <div class="set-label">Personality</div>
      <div class="set-group">
        <div class="set-row col"><textarea id="setPers" rows="2" placeholder="Describe how you'd like Penny to be, e.g. “like a supportive big sister who keeps it real”">${esc(state.personality)}</textarea>
        <div class="chip-row">${PERSONALITY_CHIPS.map((c) => `<button class="chip ${state.personality.toLowerCase().includes(c.toLowerCase()) ? 'on' : ''}" data-pers="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      </div>

      <div class="set-label">Conversation</div>
      <div class="set-group">
        ${sw('swSpeak', state.speak !== false, 'Speak replies aloud')}
        ${sw('swBarge', !!state.barge, 'Interrupt by voice', 'Best with headphones')}
        ${sw('swBig', !!state.bigText, 'Larger subtitles')}
      </div>

      <div class="set-label">About you</div>
      <div class="set-group">
        <details class="set-about" id="aboutSec" ${section === 'about' ? 'open' : ''}><summary class="set-row link-row"><span>Your details<small>Helps Penny personalise advice and check benefits</small></span><span class="chev">›</span></summary>
        <form id="profForm" class="prof-grid">
          <label>Name<input name="name" value="${esc(p.name)}"></label>
          <label>Age<input name="age" type="number" min="13" max="110" value="${p.age}"></label>
          <label>Region${sel('region', [['England', 'England'], ['Scotland', 'Scotland'], ['Wales', 'Wales'], ['Northern Ireland', 'Northern Ireland']], p.region)}</label>
          <label>Lives with${sel('livesWith', [['alone', 'On my own'], ['partner', 'Partner'], ['family', 'My kids / family'], ['parents', 'Parents'], ['housemates', 'Housemates']], p.livesWith)}</label>
          <label>Relationship${sel('relationship', [['single', 'Single'], ['married', 'Married / civil partner'], ['cohabiting', 'Living together'], ['widowed', 'Widowed']], p.relationship)}</label>
          <label>Children<input name="children" type="number" min="0" max="12" value="${p.children}"></label>
          <label>Children's ages<input name="childAges" placeholder="e.g. 3, 7" value="${esc((p.childAges || []).join(', '))}"></label>
          <label>Work${sel('employment', [['employed', 'Employed full-time'], ['part-time', 'Part-time'], ['self-employed', 'Self-employed'], ['unemployed', 'Not working'], ['student', 'Student'], ['retired', 'Retired']], p.employment)}</label>
          <label>Yearly income £<input name="income" type="number" value="${p.income}"></label>
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
        </form></details>
        <button class="set-row link-row" id="setBenefits"><span>Benefits you could claim<small>Discounts and support people often miss</small></span><span class="chev">›</span></button>
        <button class="set-row link-row" id="setHuman"><span>Talk to a person</span><span class="chev">›</span></button>
      </div>
      <p class="set-foot">Penny gives guidance, not regulated financial advice. She uses your account information to answer, and your voice only to understand what you say.</p>`);

    s.querySelector('#setLang').onchange = (e) => { readProfile(); setLang(e.target.value); open(); };
    s.querySelector('#setVoice').onchange = (e) => {
      const v = e.target.value;
      if (eleven) { state.elevenVoice = v; state.gender = (ELEVEN_VOICES.find((x) => x.id === v) || {}).g || state.gender; }
      else if (v.startsWith('auto:')) { state.voiceName = ''; state.gender = v.slice(5); }
      else { state.voiceName = v; state.gender = genderOf(v) || state.gender; }
      save();
    };
    s.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { state.style = b.dataset.style; save(); s.querySelectorAll('[data-style]').forEach((x) => x.classList.toggle('on', x === b)); }));
    s.querySelector('#setSpeed').oninput = (e) => { state.speed = +e.target.value; save(); };
    s.querySelector('#setPreview').onclick = () => window.Penny && window.Penny.previewVoice(greeting());
    s.querySelectorAll('[data-pers]').forEach((b) => (b.onclick = () => {
      const t = s.querySelector('#setPers'); const word = b.dataset.pers;
      const parts = t.value.split(',').map((x) => x.trim()).filter(Boolean);
      const has = parts.some((x) => x.toLowerCase() === word.toLowerCase());
      t.value = (has ? parts.filter((x) => x.toLowerCase() !== word.toLowerCase()) : [...parts, word]).join(', ');
      b.classList.toggle('on', !has); state.personality = t.value; save();
    }));
    s.querySelector('#setPers').oninput = (e) => { state.personality = e.target.value; save(); };
    s.querySelector('#swSpeak').onchange = (e) => { state.speak = e.target.checked; save(); };
    s.querySelector('#swBarge').onchange = (e) => { state.barge = e.target.checked; save(); };
    s.querySelector('#swBig').onchange = (e) => { state.bigText = e.target.checked; save(); };
    s.querySelector('#setBenefits').onclick = () => { readProfile(); showBenefits(P.benefits()); };
    s.querySelector('#setHuman').onclick = () => { readProfile(); App.showHumanHandoff('Our team is here to help'); };
    s.querySelector('#setDone').onclick = () => { readProfile(); App.closeSheet(); };
    s.querySelector('#profForm').oninput = () => readProfile();

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
      if (changed) P.set(patch);
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
      <div class="btn-row"><button class="btn ghost" id="benEdit">Edit my details</button><button class="btn primary" id="benAsk">${Ic('mic', 16)} Talk it through</button></div>`);
    s.querySelector('#benEdit').onclick = () => open('about');
    s.querySelector('#benAsk').onclick = () => { App.closeSheet(); window.Penny && window.Penny.openAndAsk('Can you explain which benefits I might be entitled to and how to claim them?'); };
  }

  window.PennySettings = { state, LANGS, lang, setLang, greeting, pickVoice, speech, forAI, key, open, showBenefits, elevenVoice: () => state.elevenVoice, save };
})();
