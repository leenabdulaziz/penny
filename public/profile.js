/* User profile (who Penny is talking to), audience-matching guidance, and a rule-based UK benefits screener.
 * Eligibility and amounts are calculated in code (2025/26 rates, approximate) — the AI only explains them. */
(function () {
  const B = window.Bank;

  const PRESETS = {
    alex: {
      label: 'Leen, 27', name: 'Leen', age: 27, gender: 'prefer not to say', livesWith: 'alone', relationship: 'single',
      children: 0, childAges: [], employment: 'employed', income: 31000, partnerIncome: 0, householdIncome: 31000, savings: 400,
      housing: 'rent', rent: 750, region: 'England', disability: false, needsCare: false, carerHours: 0, pregnant: false,
      inEducation: false, firstHome: true, uniform: false,
      about: 'Works in design, rents a flat on her own, would like to buy a first home one day.',
    },
    margaret: {
      label: 'Margaret, 74', name: 'Margaret', age: 74, gender: 'woman', livesWith: 'alone', relationship: 'widowed',
      children: 0, childAges: [], employment: 'retired', income: 11300, partnerIncome: 0, householdIncome: 11300, savings: 6200,
      housing: 'own', rent: 0, region: 'England', disability: true, needsCare: true, carerHours: 0, pregnant: false,
      inEducation: false, firstHome: false, uniform: false,
      about: 'Retired school cook, widowed, lives alone. Arthritis in her hands makes dressing and cooking hard. Not very confident with apps.',
    },
    jayden: {
      label: 'Jayden, 17', name: 'Jayden', age: 17, gender: 'man', livesWith: 'parents', relationship: 'single',
      children: 0, childAges: [], employment: 'student', income: 4200, partnerIncome: 0, householdIncome: 24000, savings: 350,
      housing: 'family', rent: 0, region: 'England', disability: false, needsCare: false, carerHours: 0, pregnant: false,
      inEducation: true, firstHome: false, uniform: true,
      about: 'Sixth-form student with a weekend job at a cinema. Into gaming and football. Lives with parents.',
    },
    amira: {
      label: 'Amira, 34', name: 'Amira', age: 34, gender: 'woman', livesWith: 'family', relationship: 'single',
      children: 2, childAges: [3, 7], employment: 'part-time', income: 16500, partnerIncome: 0, householdIncome: 16500, savings: 900,
      housing: 'rent', rent: 950, region: 'England', disability: false, needsCare: false, carerHours: 0, pregnant: false,
      inEducation: false, firstHome: false, uniform: true,
      about: 'Single mum of two, works part-time as a pharmacy assistant. Busy and short on time.',
    },
  };

  let profile = { presetId: 'alex', ...PRESETS.alex };

  function load() {
    try { const s = localStorage.getItem('penny.profile.v2'); if (s) profile = { ...profile, ...JSON.parse(s) }; } catch (e) {}
    applyName();
  }
  function save() { try { localStorage.setItem('penny.profile.v2', JSON.stringify(profile)); } catch (e) {} }
  function applyName() {
    B.customer.firstName = profile.name || 'there';
    B.customer.initials = (profile.name || '?')[0].toUpperCase();
    B.customer.email = `${(profile.name || 'you').toLowerCase().replace(/[^a-z]/g, '') || 'you'}@example.com`;
  }
  function set(patch) {
    profile = { ...profile, ...patch };
    applyName(); save();
    window.dispatchEvent(new Event('profile:changed'));
    return profile;
  }
  function usePreset(id) { profile = { presetId: id, ...PRESETS[id] }; applyName(); save(); window.dispatchEvent(new Event('profile:changed')); return profile; }

  function ageGroup(a = profile.age) {
    if (a < 20) return 'teen';
    if (a < 36) return 'young-adult';
    if (a < 65) return 'adult';
    return 'older';
  }
  function audienceGuidance() {
    const g = ageGroup();
    const base = {
      teen: 'Teenager. Be relaxed, upbeat and quick, like a cool older cousin. Short sentences, relatable examples (gaming, going out, first job, saving for trainers). A little light slang is fine but never cringe or try-hard. Explain basics without being patronising. Celebrate small wins.',
      'young-adult': 'Young adult. Friendly, modern and to the point. Relatable examples (rent, nights out, first home). Light humour welcome.',
      adult: 'Adult. Warm, practical and efficient. Respect their experience; focus on clear options.',
      older: 'Older person. Be patient, warm and respectful, a little more formal. Plain words, no jargon or acronyms, one idea at a time, numbers said clearly. Offer to repeat or go slower. Never rush or patronise. Be extra alert to scams and gently mention safety where relevant.',
    }[g];
    return `${base} Personalise to what you know about them, but never stereotype by gender, age or background.`;
  }
  function speechRateFactor() { return { teen: 1.06, 'young-adult': 1.02, adult: 1, older: 0.88 }[ageGroup()]; }

  function forAI() {
    const { presetId, label, ...p } = profile;
    return { ...p, ageGroup: ageGroup(), audienceGuidance: audienceGuidance() };
  }

  // ===================== Benefits screener =====================
  const SPA = 66;
  const R = { // 2025/26 rates (approximate)
    ucSingle25: 400.14, ucSingleU25: 316.98, ucCouple: 628.1, ucChild: 292.81, ucWorkAllowHousing: 411, ucWorkAllowNoHousing: 684, ucTaper: 0.55,
    pcSingle: 227.1, pcCouple: 346.6, aaLow: 73.9, aaHigh: 110.4, pipMin: 29.2, pipMax: 187.45, carers: 83.3, carersEarnLimit: 196,
    cbFirst: 26.05, cbOther: 17.25, mariage: 252, wfp: 200, wfp80: 300, whd: 150, rx: 9.9, nmw: 12.21,
  };
  const r0 = (n) => Math.round(n);
  const f2 = (n) => n.toFixed(2);

  function benefits(overrides = {}) {
    const p = { ...profile, ...overrides };
    const age = +p.age || 30, kids = +p.children || 0, kidAges = (p.childAges || []).map(Number);
    const couple = ['married', 'cohabiting', 'civil partnership'].includes(p.relationship) && ['partner', 'family'].includes(p.livesWith);
    const adults = p.livesWith === 'alone' ? 1 : p.livesWith === 'partner' ? 2 : p.livesWith === 'family' ? (couple ? 2 : 1) : p.livesWith === 'parents' ? 3 : 2;
    const working = ['employed', 'self-employed', 'part-time'].includes(p.employment);
    const income = +p.income || 0, partnerIncome = couple ? +p.partnerIncome || 0 : 0;
    const savings = +p.savings || 0;
    const england = (p.region || 'England') === 'England';
    const ctAnnual = (B.BILLS.find((b) => b.name === 'Council Tax')?.amount || 142) * 10;
    const out = [];
    const add = (o) => out.push(o);

    // Universal Credit (estimate)
    let ucMonthly = 0;
    const underSPA = age < SPA;
    if (age >= 18 && underSPA && savings < 16000 && !(p.inEducation && kids === 0)) {
      const std = couple ? R.ucCouple : age < 25 ? R.ucSingleU25 : R.ucSingle25;
      const housing = p.housing === 'rent' ? Math.min(+p.rent || 0, 1100) : 0;
      const max = std + kids * R.ucChild + housing;
      const wa = kids > 0 || p.disability ? (housing ? R.ucWorkAllowHousing : R.ucWorkAllowNoHousing) : 0;
      const net = ((income + partnerIncome) / 12) * 0.82;
      const tariff = savings > 6000 ? Math.ceil((savings - 6000) / 250) * 4.35 : 0;
      ucMonthly = max - R.ucTaper * Math.max(0, net - wa) - tariff;
      if (ucMonthly > 15) {
        add({ id: 'uc', name: 'Universal Credit', status: 'likely', annual: r0(ucMonthly * 12), value: `about £${r0(ucMonthly)}/month`,
          why: `Based on ${couple ? 'your household' : 'your'} income of about £${r0((income + partnerIncome) / 12)}/month${kids ? `, ${kids} child${kids > 1 ? 'ren' : ''}` : ''}${housing ? ` and rent of £${housing}` : ''}. Housing support may be capped by Local Housing Allowance. It can also cover up to 85% of childcare costs.`,
          how: 'Apply online at GOV.UK', url: 'https://www.gov.uk/universal-credit' });
      } else ucMonthly = 0;
    }
    const onUC = ucMonthly > 0;

    // Pension Credit
    let onPC = false;
    if (age >= SPA) {
      const weekly = (income + partnerIncome) / 52 + Math.max(0, Math.floor((savings - 10000) / 500));
      const g = couple ? R.pcCouple : R.pcSingle;
      if (weekly < g + 15) {
        onPC = weekly < g;
        add({ id: 'pc', name: 'Pension Credit', status: weekly < g ? 'likely' : 'possible', annual: r0(Math.max(0, g - weekly) * 52),
          value: weekly < g ? `about £${r0((g - weekly) * 52)}/year top-up` : 'worth checking',
          why: `Tops weekly income up to £${g}. Your income is about £${r0(weekly)}/week. It's also a "gateway" to help with council tax, heating, the Warm Home Discount and NHS costs${p.needsCare && adults === 1 ? ', and if you get Attendance Allowance and live alone you could get an extra severe disability amount (about £82/week)' : ''}.`,
          how: 'Call the Pension Credit claim line on 0800 99 1234 or apply on GOV.UK', url: 'https://www.gov.uk/pension-credit' });
      }
    }
    // Attendance Allowance / PIP
    if (age >= SPA && (p.needsCare || p.disability)) {
      add({ id: 'aa', name: 'Attendance Allowance', status: 'likely', annual: r0(R.aaLow * 52), value: `£${f2(R.aaLow)}–£${f2(R.aaHigh)}/week`,
        why: 'For people over State Pension age who need help with personal care because of an illness or disability. Not means-tested — savings and income don\'t matter.',
        how: 'Claim form on GOV.UK or call 0800 731 0122', url: 'https://www.gov.uk/attendance-allowance' });
    }
    if (age >= 16 && age < SPA && p.disability) {
      add({ id: 'pip', name: 'Personal Independence Payment (PIP)', status: 'possible', annual: r0(R.pipMin * 52), value: `£${f2(R.pipMin)}–£${f2(R.pipMax)}/week`,
        why: 'For long-term health conditions or disabilities affecting daily living or getting around. Not means-tested.', how: 'Call 0800 917 2222 to start a claim', url: 'https://www.gov.uk/pip' });
    }
    if (+p.carerHours >= 35 && age >= 16 && income / 52 <= R.carersEarnLimit) {
      add({ id: 'ca', name: "Carer's Allowance", status: 'likely', annual: r0(R.carers * 52), value: `£${f2(R.carers)}/week`,
        why: `You care for someone at least 35 hours a week and earn under £${R.carersEarnLimit}/week.`, how: 'Apply on GOV.UK', url: 'https://www.gov.uk/carers-allowance' });
    }
    // Children
    if (kids > 0) {
      const cb = (R.cbFirst + R.cbOther * (kids - 1)) * 52;
      add({ id: 'cb', name: 'Child Benefit', status: 'likely', annual: r0(cb), value: `about £${r0(cb)}/year`,
        why: `£${f2(R.cbFirst)}/week for the eldest and £${f2(R.cbOther)}/week for each other child.${Math.max(income, partnerIncome) > 60000 ? ' Income over £60k means some is paid back through tax, but claiming still protects National Insurance credits.' : ''}`,
        how: 'Claim on GOV.UK or the HMRC app', url: 'https://www.gov.uk/child-benefit' });
      const u12 = kidAges.filter((a) => a < 12).length;
      if (working && u12 && income >= R.nmw * 16 * 52 && income < 100000) {
        add({ id: 'tfc', name: 'Tax-Free Childcare', status: onUC ? 'possible' : 'likely', annual: onUC ? 0 : 2000 * u12, value: 'up to £2,000 per child/year',
          why: `The government adds £2 for every £8 you pay into a childcare account.${onUC ? " You can't get it at the same time as Universal Credit — UC childcare support (85% of costs) may be better for you." : ''}`,
          how: 'Apply on GOV.UK', url: 'https://www.gov.uk/tax-free-childcare' });
      }
      if (england && kidAges.some((a) => a < 5)) {
        add({ id: 'hours', name: 'Funded childcare hours', status: working ? 'likely' : 'possible', annual: 0, value: working ? 'up to 30 hours/week' : '15 hours/week for 3–4 year olds',
          why: 'Working parents in England can get up to 30 funded hours a week from 9 months old; all 3–4 year olds get 15 hours.', how: 'Apply via your childcare account on GOV.UK', url: 'https://www.gov.uk/check-eligible-free-childcare-if-youre-working' });
      }
      const school = kidAges.filter((a) => a >= 4 && a <= 16).length;
      if (school && (onUC || onPC) && england) {
        add({ id: 'fsm', name: 'Free school meals', status: 'likely', annual: 480 * school, value: `about £480 per child/year`,
          why: 'In England, children in households on Universal Credit can get free school meals.', how: "Apply through your local council", url: 'https://www.gov.uk/apply-free-school-meals' });
      }
    }
    // Council tax
    if (adults === 1) {
      add({ id: 'spd', name: 'Council Tax single person discount', status: 'likely', annual: r0(ctAnnual * 0.25), value: `about £${r0(ctAnnual * 0.25)}/year`,
        why: `You're the only adult at home, so you can get 25% off. Your council tax is about £${r0(ctAnnual)}/year — if you're not already getting the discount, that's real money back. Councils can often backdate it.`,
        how: 'Apply on your council\'s website', url: 'https://www.gov.uk/council-tax/discounts-for-people-who-live-alone' });
    }
    if (onUC || onPC || (income + partnerIncome < 18000 && age >= 18)) {
      add({ id: 'ctr', name: 'Council Tax Reduction', status: onUC || onPC ? 'likely' : 'possible', annual: 0, value: 'varies by council — often hundreds of pounds a year',
        why: 'Councils reduce the bill for people on low incomes or certain benefits.', how: 'Apply through your local council', url: 'https://www.gov.uk/apply-council-tax-reduction' });
    }
    if (p.relationship === 'married' || p.relationship === 'civil partnership') {
      const lo = Math.min(income, +p.partnerIncome || 0), hi = Math.max(income, +p.partnerIncome || 0);
      if (lo < 12570 && hi > 12570 && hi <= 50270) add({ id: 'ma', name: 'Marriage Allowance', status: 'likely', annual: R.mariage, value: `up to £${R.mariage}/year`, why: 'One of you earns under the Personal Allowance, so you can transfer some of it to the other.', how: 'Apply on GOV.UK (can be backdated 4 years)', url: 'https://www.gov.uk/marriage-allowance' });
    }
    // Pension age extras
    if (age >= SPA) {
      if (income + partnerIncome <= 35000) add({ id: 'wfp', name: 'Winter Fuel Payment', status: 'likely', annual: age >= 80 ? R.wfp80 : R.wfp, value: `£${age >= 80 ? R.wfp80 : R.wfp}/year`, why: 'Paid automatically to most people over State Pension age with income under £35,000.', how: 'Usually automatic — check on GOV.UK', url: 'https://www.gov.uk/winter-fuel-payment' });
      if (england) add({ id: 'bus', name: 'Free bus pass', status: 'likely', annual: 0, value: 'free off-peak bus travel', why: 'In England you can get a free older person\'s bus pass from State Pension age.', how: 'Apply through your council', url: 'https://www.gov.uk/apply-for-elderly-person-bus-pass' });
    }
    if (onUC || onPC) {
      add({ id: 'whd', name: 'Warm Home Discount', status: 'likely', annual: R.whd, value: `£${R.whd} off energy`, why: 'For households on means-tested benefits like Universal Credit or Pension Credit.', how: 'Usually automatic — check with your energy supplier', url: 'https://www.gov.uk/the-warm-home-discount-scheme' });
      add({ id: 'social', name: 'Broadband social tariff', status: 'likely', annual: 200, value: 'save around £200/year', why: 'Cheaper broadband and phone deals for people on Universal Credit, Pension Credit and some other benefits.', how: 'Ask your provider for their social tariff', url: 'https://www.ofcom.org.uk/phones-and-broadband/saving-money/social-tariffs' });
    }
    if (onUC && working) add({ id: 'hts', name: 'Help to Save', status: 'likely', annual: 300, value: 'up to £1,200 bonus over 4 years', why: 'Working and on Universal Credit? Save up to £50/month and the government adds a 50% bonus.', how: 'Apply on GOV.UK', url: 'https://www.gov.uk/get-help-savings-low-income' });
    // Health costs
    if (!england) add({ id: 'rx', name: 'Free prescriptions', status: 'likely', annual: 0, value: 'free', why: `Prescriptions are free for everyone in ${p.region}.`, how: 'Automatic', url: 'https://www.nhs.uk/nhs-services/prescriptions/' });
    else if (age >= 60 || age < 16 || (age < 19 && p.inEducation) || p.pregnant || onUC || onPC) {
      add({ id: 'rx', name: 'Free NHS prescriptions', status: onUC ? 'possible' : 'likely', annual: 0, value: `saves about £${f2(R.rx)} per item`,
        why: age >= 60 ? "Everyone 60 or over gets free prescriptions in England." : age < 19 ? 'Under 16s and 16–18s in full-time education get them free.' : p.pregnant ? 'Free during pregnancy and for 12 months after (maternity exemption certificate).' : 'People on Universal Credit with low earnings get free prescriptions, dental and eye tests.',
        how: 'Tick the right box on the back of your prescription', url: 'https://www.nhs.uk/nhs-services/help-with-health-costs/' });
    }
    // Young people
    if (age >= 16 && age <= 19 && p.inEducation) {
      add({ id: 'bursary', name: '16 to 19 Bursary Fund', status: (+p.householdIncome || 0) < 30000 ? 'possible' : 'check', annual: 0, value: 'up to £1,200/year (more in some cases)',
        why: 'Your school or college can help with travel, food and equipment costs if money is tight at home.', how: 'Ask your school or college student services', url: 'https://www.gov.uk/1619-bursary-fund' });
    }
    if (age >= 16 && age <= 30) add({ id: 'rail', name: age <= 25 ? '16-25 Railcard' : '26-30 Railcard', status: 'likely', annual: 0, value: '1/3 off most rail fares', why: 'Costs about £35/year and usually pays for itself in a couple of trips.', how: 'Buy online', url: 'https://www.railcard.co.uk/' });
    if (age >= 18 && age <= 39 && p.firstHome) {
      add({ id: 'lisa', name: 'Lifetime ISA government bonus', status: 'possible', annual: 1000, value: 'up to £1,000/year bonus',
        why: 'Saving for a first home? The government adds 25% to up to £4,000 a year. There is a penalty if you withdraw for other reasons.', how: 'Open a Lifetime ISA with a provider', url: 'https://www.gov.uk/lifetime-isa' });
    }
    if (working && p.uniform && age >= 16) add({ id: 'uniform', name: 'Uniform tax relief', status: 'possible', annual: 12, value: 'small yearly refund, can backdate 4 years', why: 'If you wash and repair your own work uniform you can claim a flat-rate tax relief.', how: 'Claim on GOV.UK', url: 'https://www.gov.uk/guidance/job-expenses-for-uniforms-work-clothing-and-tools' });

    const rank = { likely: 0, possible: 1, check: 2 };
    out.sort((a, b) => rank[a.status] - rank[b.status] || b.annual - a.annual);
    const total = out.filter((b) => b.status === 'likely').reduce((s, b) => s + (b.annual || 0), 0);
    return {
      forName: p.name, estimatedAnnualValueLikely: total, benefits: out,
      note: 'Estimates using 2025/26 rates and simplified rules — not a guarantee. Use a full checker (e.g. GOV.UK, entitledto or Turn2us) or speak to Citizens Advice before claiming.',
      context: 'Billions of pounds of benefits go unclaimed in the UK every year, often because people do not know they qualify.',
      checkerUrl: 'https://www.gov.uk/check-benefits-financial-support',
    };
  }

  load();
  window.Profile = { PRESETS, get: () => profile, set, usePreset, ageGroup, audienceGuidance, speechRateFactor, forAI, benefits };
})();
