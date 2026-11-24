/* Smart Coach: a rule-based coach that answers from the user's own numbers.
 * No AI service, no network: it matches the question to a topic, then explains the
 * relevant metric using the same thresholds as the dashboard's health assessment
 * (see computeMetrics). Every reply exists in English and Bahasa Indonesia. */

// Dashboard thresholds (keep in step with computeMetrics' healthStatus).
const SAVINGS_MIN = 10, SAVINGS_GOOD = 20, SAVINGS_OPTIMAL = 30;
const EMERGENCY_MIN = 3, EMERGENCY_GOOD = 6;
const DTI_OK = 20, DTI_MAX = 40;

// Topic -> keywords (English and Indonesian). Checked in this order, so the more specific topics come first.
const TOPICS = [
  ["thanks", ["thank", "thx", "makasih", "terima kasih", "trims"]],
  ["expert", ["expert", "advisor", "adviser", "consult", "planner", "konsultasi", "konsultan", "penasihat"]],
  ["emergency", ["emergency", "rainy day", "darurat"]],
  ["debt", ["dti", "debt", "loan", "credit card", "repay", "mortgage", "utang", "hutang", "cicilan", "pinjaman", "kartu kredit", "kpr"]],
  ["fire", ["fire", "freedom", "retire", "financial independence", "pensiun", "kebebasan finansial", "bebas finansial"]],
  ["invest", ["invest", "stock", "crypto", "bitcoin", "mutual fund", "bond", "saham", "kripto", "investasi", "reksa dana", "obligasi", "emas", "gold"]],
  ["savings", ["saving", "save", "tabung", "menabung", "nabung", "sisih"]],
  ["networth", ["net worth", "worth", "assets", "kekayaan", "aset"]],
  ["budget", ["budget", "expense", "spend", "cost", "cut", "money go", "where does my money", "anggaran", "pengeluaran", "belanja", "biaya", "hemat", "uangku ke mana", "kemana uang", "ke mana uang"]],
  ["income", ["income", "salary", "earn", "raise", "side hustle", "gaji", "pendapatan", "penghasilan", "sampingan"]],
  ["health", ["health", "how am i", "doing", "overview", "summary", "status", "score", "kondisi", "ringkasan", "kesehatan", "gimana keuangan"]],
  ["greeting", ["hi", "hello", "hey", "halo", "hai", "pagi", "siang", "sore", "malam"]],
];

export function detectTopic(text) {
  const q = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ")} `;
  for (const [topic, words] of TOPICS) {
    // Short words (hi, dti, fire…) must match as whole words; longer ones may be part of a word ("savings").
    if (words.some((w) => (w.length <= 4 ? q.includes(` ${w} `) : q.includes(w)))) return topic;
  }
  return "unknown";
}

const pct = (v, fmt) => `${fmt(v, 1)}%`;

/* Each topic returns { en, id } text. `c` holds the numbers and formatters. */
const REPLIES = {
  savings(c) {
    const { m, money, fmt, p } = c;
    const rate = m.savingsRate;
    const surplus = m.monthlyIncome - m.monthlyExpenses;
    const disc = c.n(p.discretionaryExpenses);
    const toRate = (target) => Math.max(0, (target / 100) * m.monthlyIncome - surplus);
    if (rate < 0) {
      return {
        en: `You're spending ${money(-surplus)} more than you earn each month, so your savings rate is ${pct(rate, fmt)}. Closing that gap comes before anything else. Your discretionary spending (${money(disc)}) is usually the quickest place to cut, and it's worth checking whether any debt repayments can be restructured.`,
        id: `Pengeluaranmu ${money(-surplus)} lebih besar dari pemasukan setiap bulan, jadi tingkat tabunganmu ${pct(rate, fmt)}. Menutup selisih itu adalah prioritas utama. Pengeluaran non-pokok (${money(disc)}) biasanya paling cepat dipangkas, dan cek juga apakah cicilan utang bisa diatur ulang.`,
      };
    }
    if (rate < SAVINGS_MIN) {
      return {
        en: `Your savings rate is ${pct(rate, fmt)}, below the ${SAVINGS_MIN}% the dashboard treats as the minimum. Reaching ${SAVINGS_GOOD}% means setting aside ${money(toRate(SAVINGS_GOOD))} more each month. Your discretionary spending is ${money(disc)}; trimming a quarter of it would free up ${money(disc / 4)}. Set up an automatic transfer on payday so you save before you spend.`,
        id: `Tingkat tabunganmu ${pct(rate, fmt)}, di bawah batas minimum ${SAVINGS_MIN}% di dashboard. Untuk mencapai ${SAVINGS_GOOD}%, kamu perlu menyisihkan ${money(toRate(SAVINGS_GOOD))} lagi setiap bulan. Pengeluaran non-pokokmu ${money(disc)}; memangkas seperempatnya sudah membebaskan ${money(disc / 4)}. Atur transfer otomatis saat gajian supaya kamu menabung sebelum belanja.`,
      };
    }
    if (rate <= SAVINGS_OPTIMAL) {
      return {
        en: `Your savings rate is ${pct(rate, fmt)}, a healthy range: you keep ${money(surplus)} of your income each month. The dashboard's optimal level is above ${SAVINGS_OPTIMAL}%, which for you means ${money(toRate(SAVINGS_OPTIMAL))} more a month. When your income goes up, try saving at least half of each raise instead of letting spending grow with it.`,
        id: `Tingkat tabunganmu ${pct(rate, fmt)}, sudah sehat: kamu menyisihkan ${money(surplus)} setiap bulan. Level optimal di dashboard adalah di atas ${SAVINGS_OPTIMAL}%, yang berarti ${money(toRate(SAVINGS_OPTIMAL))} lagi per bulan untukmu. Saat penghasilan naik, coba tabung minimal setengah dari kenaikannya supaya pengeluaran tidak ikut membengkak.`,
      };
    }
    return {
      en: `Your savings rate is ${pct(rate, fmt)}, above the ${SAVINGS_OPTIMAL}% optimal mark, so you keep ${money(surplus)} a month. The next step is giving that money a job: top up your emergency fund to ${EMERGENCY_GOOD} months first, then invest the rest for the long term.`,
      id: `Tingkat tabunganmu ${pct(rate, fmt)}, di atas batas optimal ${SAVINGS_OPTIMAL}%, jadi kamu menyisihkan ${money(surplus)} per bulan. Langkah berikutnya adalah memberi uang itu tugas: lengkapi dana darurat sampai ${EMERGENCY_GOOD} bulan dulu, lalu investasikan sisanya untuk jangka panjang.`,
    };
  },

  emergency(c) {
    const { m, money, fmt, p } = c;
    const months = m.emergencyFundRatio;
    const savings = c.n(p.liquidSavings);
    const lo = m.monthlyExpenses * EMERGENCY_MIN, hi = m.monthlyExpenses * EMERGENCY_GOOD;
    const base = {
      en: `Your liquid savings (${money(savings)}) cover ${fmt(months, 1)} months of expenses. A healthy emergency fund is ${EMERGENCY_MIN}–${EMERGENCY_GOOD} months, which for you is ${money(lo)}–${money(hi)}.`,
      id: `Tabungan likuidmu (${money(savings)}) cukup untuk ${fmt(months, 1)} bulan pengeluaran. Dana darurat yang sehat adalah ${EMERGENCY_MIN}–${EMERGENCY_GOOD} bulan, yaitu ${money(lo)}–${money(hi)} untukmu.`,
    };
    if (months < EMERGENCY_MIN) {
      return {
        en: `${base.en} You're ${money(lo - savings)} short of the ${EMERGENCY_MIN}-month minimum, so build this before investing. Keep it somewhere safe and easy to reach, such as a separate savings account, not in stocks or crypto.`,
        id: `${base.id} Kamu masih kurang ${money(lo - savings)} untuk mencapai minimum ${EMERGENCY_MIN} bulan, jadi bangun ini dulu sebelum berinvestasi. Simpan di tempat yang aman dan mudah dicairkan, misalnya rekening tabungan terpisah, bukan di saham atau kripto.`,
      };
    }
    if (months < EMERGENCY_GOOD) {
      return {
        en: `${base.en} You've passed the minimum. Another ${money(hi - savings)} gets you to ${EMERGENCY_GOOD} months, which matters most if your income is irregular or you support family.`,
        id: `${base.id} Kamu sudah melewati batas minimum. Tambah ${money(hi - savings)} lagi untuk mencapai ${EMERGENCY_GOOD} bulan, yang penting terutama jika penghasilanmu tidak tetap atau kamu menanggung keluarga.`,
      };
    }
    return {
      en: `${base.en} You're fully covered. Cash beyond about ${money(hi)} usually loses value to inflation, so consider investing the extra.`,
      id: `${base.id} Dana daruratmu sudah aman. Uang tunai di atas sekitar ${money(hi)} biasanya tergerus inflasi, jadi pertimbangkan untuk menginvestasikan kelebihannya.`,
    };
  },

  debt(c) {
    const { m, money, fmt, p } = c;
    const repay = c.n(p.monthlyDebtRepayment);
    const st = c.n(p.shortTermDebt), lt = c.n(p.longTermDebt);
    if (repay === 0 && st + lt === 0) {
      return {
        en: `You have no debt in your profile, so your debt-to-income ratio is 0%. Keep it that way by avoiding consumer debt for things that lose value, such as gadgets or holidays.`,
        id: `Profilmu tidak mencatat utang, jadi rasio utang terhadap pendapatanmu 0%. Pertahankan dengan menghindari utang konsumtif untuk barang yang nilainya turun, seperti gawai atau liburan.`,
      };
    }
    const band = m.dti > DTI_MAX ? "high" : m.dti >= DTI_OK ? "mid" : "low";
    const verdict = {
      high: { en: `That's above ${DTI_MAX}%, which the dashboard flags as critical: debt is squeezing everything else.`, id: `Itu di atas ${DTI_MAX}%, yang ditandai kritis di dashboard: utang menekan semua pos keuangan lainnya.` },
      mid: { en: `That's manageable, but the dashboard's healthy level is below ${DTI_OK}%.`, id: `Masih terkendali, tapi level sehat di dashboard adalah di bawah ${DTI_OK}%.` },
      low: { en: `That's below ${DTI_OK}%, a healthy level.`, id: `Itu di bawah ${DTI_OK}%, level yang sehat.` },
    }[band];
    const shortTip = st > 0
      ? { en: ` Pay off your short-term debt (${money(st)}) first: credit cards and pay-later loans usually charge the highest interest.`, id: ` Lunasi utang jangka pendek (${money(st)}) lebih dulu: kartu kredit dan paylater biasanya bunganya paling tinggi.` }
      : { en: ` Your remaining debt is long-term (${money(lt)}); extra payments there help, but they shouldn't come at the cost of your emergency fund.`, id: ` Sisa utangmu jangka panjang (${money(lt)}); pembayaran ekstra membantu, tapi jangan sampai mengorbankan dana darurat.` };
    return {
      en: `Your debt-to-income ratio (DTI) is ${pct(m.dti, fmt)}: ${money(repay)} of your ${money(m.monthlyIncome)} monthly income goes to debt repayments. ${verdict.en}${shortTip.en}`,
      id: `Rasio utang terhadap pendapatan (DTI) kamu ${pct(m.dti, fmt)}: ${money(repay)} dari pendapatan bulanan ${money(m.monthlyIncome)} dipakai untuk cicilan. ${verdict.id}${shortTip.id}`,
    };
  },

  fire(c) {
    const { m, f, money, fmt, p } = c;
    const age = c.n(p.age) || 25;
    const target = c.n(p.targetRetirementAge);
    const intro = {
      en: `Your FIRE number is ${money(f.fireNumber)}: 25 times your yearly expenses, based on the 4% rule (withdrawing about 4% a year can last decades).`,
      id: `Angka FIRE kamu ${money(f.fireNumber)}: 25 kali pengeluaran tahunanmu, berdasarkan aturan 4% (menarik sekitar 4% per tahun bisa bertahan puluhan tahun).`,
    };
    if (!f.onTrack) {
      return {
        en: `${intro.en} At your current surplus of ${money(f.pmtMonthly)} a month and an assumed 7% yearly return, you don't reach it within 60 years. Raising your savings rate helps twice: you invest more each month, and lower spending also shrinks the FIRE number you need.`,
        id: `${intro.id} Dengan surplus saat ini ${money(f.pmtMonthly)} per bulan dan asumsi imbal hasil 7% per tahun, target itu belum tercapai dalam 60 tahun. Menaikkan tingkat tabungan membantu dua kali: kamu berinvestasi lebih banyak setiap bulan, dan pengeluaran yang lebih rendah juga memperkecil angka FIRE yang dibutuhkan.`,
      };
    }
    const freedomAge = Math.round(f.projectedFreedomAge);
    const years = Math.max(0, Math.round(f.projectedFreedomAge - age));
    let vsTarget = { en: "", id: "" };
    if (target > 0) {
      const diff = target - freedomAge;
      vsTarget = diff >= 0
        ? { en: ` That's ${diff} year${diff === 1 ? "" : "s"} ahead of your target retirement age of ${target}.`, id: ` Itu ${diff} tahun lebih awal dari target usia pensiunmu, ${target}.` }
        : { en: ` That's ${-diff} year${diff === -1 ? "" : "s"} after your target of ${target}, so you'd need a higher savings rate or a lower lifestyle target to close the gap.`, id: ` Itu ${-diff} tahun setelah targetmu (${target}), jadi kamu perlu menaikkan tingkat tabungan atau menurunkan target gaya hidup.` };
    }
    return {
      en: `${intro.en} Investing your surplus of ${money(f.pmtMonthly)} a month at an assumed 7% yearly return, you'd reach it around age ${freedomAge}, in about ${years} years.${vsTarget.en} This is a projection, not a promise: real returns go up and down.`,
      id: `${intro.id} Dengan menginvestasikan surplus ${money(f.pmtMonthly)} per bulan dan asumsi imbal hasil 7% per tahun, kamu mencapainya sekitar usia ${freedomAge}, kira-kira ${years} tahun lagi.${vsTarget.id} Ini proyeksi, bukan jaminan: imbal hasil nyata naik turun.`,
    };
  },

  networth(c) {
    const { m, money, p } = c;
    const liq = c.n(p.liquidSavings), inv = c.n(p.investments), re = c.n(p.realEstate);
    const tail = m.netWorth < 0
      ? { en: ` A negative net worth is common early on, especially with study or housing loans. Focus on paying down high-interest debt and it will turn positive.`, id: ` Kekayaan bersih negatif wajar di awal, terutama jika ada pinjaman pendidikan atau rumah. Fokus melunasi utang berbunga tinggi dan angkanya akan berbalik positif.` }
      : { en: ` Track it every few months: the trend matters more than any single number.`, id: ` Pantau setiap beberapa bulan: arah perubahannya lebih penting daripada angka sesaat.` };
    return {
      en: `Your net worth is ${money(m.netWorth)}: savings ${money(liq)} + investments ${money(inv)} + property ${money(re)}, minus debts of ${money(m.totalLiabilities)}.${tail.en}`,
      id: `Kekayaan bersihmu ${money(m.netWorth)}: tabungan ${money(liq)} + investasi ${money(inv)} + properti ${money(re)}, dikurangi utang ${money(m.totalLiabilities)}.${tail.id}`,
    };
  },

  budget(c) {
    const { m, money, fmt, p } = c;
    const ess = c.n(p.essentialExpenses), disc = c.n(p.discretionaryExpenses), debt = c.n(p.monthlyDebtRepayment);
    const share = (x) => pct(m.monthlyIncome > 0 ? (x / m.monthlyIncome) * 100 : 0, fmt);
    return {
      en: `Here's where your ${money(m.monthlyIncome)} goes each month: essentials ${money(ess)} (${share(ess)}), discretionary ${money(disc)} (${share(disc)}), debt repayments ${money(debt)} (${share(debt)}), and ${money(m.monthlyIncome - m.monthlyExpenses)} left over. A common guide is 50/30/20: about 50% on needs, 30% on wants and at least 20% on savings or extra debt payments. Discretionary spending is the easiest line to adjust.`,
      id: `Begini pembagian ${money(m.monthlyIncome)} kamu setiap bulan: kebutuhan pokok ${money(ess)} (${share(ess)}), non-pokok ${money(disc)} (${share(disc)}), cicilan utang ${money(debt)} (${share(debt)}), dan sisa ${money(m.monthlyIncome - m.monthlyExpenses)}. Panduan umum 50/30/20: sekitar 50% untuk kebutuhan, 30% untuk keinginan, dan minimal 20% untuk tabungan atau pelunasan utang. Pengeluaran non-pokok adalah pos yang paling mudah disesuaikan.`,
    };
  },

  income(c) {
    const { m, money, fmt, p } = c;
    const side = c.n(p.sideIncome);
    const sideShare = m.monthlyIncome > 0 ? (side / m.monthlyIncome) * 100 : 0;
    return {
      en: `Your monthly income is ${money(m.monthlyIncome)}: salary ${money(c.n(p.baseSalary))} and side income ${money(side)} (${pct(sideShare, fmt)} of the total). ${side > 0 ? "Side income is a strong lever: putting all of it towards savings or debt raises your savings rate without touching your lifestyle." : "Even a small side income, saved in full, moves your savings rate and FIRE date noticeably."} If your income is irregular, aim for a ${EMERGENCY_GOOD}-month emergency fund.`,
      id: `Pendapatan bulananmu ${money(m.monthlyIncome)}: gaji ${money(c.n(p.baseSalary))} dan penghasilan sampingan ${money(side)} (${pct(sideShare, fmt)} dari total). ${side > 0 ? "Penghasilan sampingan adalah pengungkit yang kuat: menabung semuanya menaikkan tingkat tabungan tanpa mengubah gaya hidup." : "Penghasilan sampingan kecil pun, jika ditabung seluruhnya, terasa dampaknya pada tingkat tabungan dan tanggal FIRE."} Jika penghasilanmu tidak tetap, targetkan dana darurat ${EMERGENCY_GOOD} bulan.`,
    };
  },

  invest(c) {
    const { m, money, p } = c;
    const risk = { CONSERVATIVE: ["conservative", "konservatif"], AGGRESSIVE: ["aggressive", "agresif"] }[p.riskTolerance] ?? ["moderate", "moderat"];
    const ready = m.emergencyFundRatio >= EMERGENCY_MIN && m.dti <= DTI_MAX;
    return {
      en: `I can't recommend specific stocks, funds or coins. ${ready ? "Your emergency fund and debt levels are in a reasonable place to start investing." : `Before investing, get your emergency fund to at least ${EMERGENCY_MIN} months and your DTI under ${DTI_MAX}%; investing on a weak base forces you to sell at the worst time.`} Your profile says your risk tolerance is ${risk[0]}, and you currently have ${money(c.n(p.investments))} invested. For a plan built around your goals, book a Market & Stocks or Crypto session with one of our experts.`,
      id: `Aku tidak bisa merekomendasikan saham, reksa dana, atau koin tertentu. ${ready ? "Dana darurat dan tingkat utangmu sudah cukup baik untuk mulai berinvestasi." : `Sebelum berinvestasi, capai dana darurat minimal ${EMERGENCY_MIN} bulan dan DTI di bawah ${DTI_MAX}%; berinvestasi di atas fondasi lemah bisa memaksamu menjual di saat terburuk.`} Profilmu mencatat toleransi risiko ${risk[1]}, dan investasimu saat ini ${money(c.n(p.investments))}. Untuk rencana yang sesuai tujuanmu, pesan sesi Market & Stocks atau Crypto dengan salah satu expert kami.`,
    };
  },

  health(c) {
    const { m, fmt } = c;
    const checks = [
      { ok: m.savingsRate >= SAVINGS_MIN, name: ["savings rate", "tingkat tabungan"], en: `savings rate ${pct(m.savingsRate, fmt)} (target ${SAVINGS_GOOD}%+)`, id: `tingkat tabungan ${pct(m.savingsRate, fmt)} (target ${SAVINGS_GOOD}%+)` },
      { ok: m.emergencyFundRatio >= EMERGENCY_MIN, name: ["emergency fund", "dana darurat"], en: `emergency fund ${fmt(m.emergencyFundRatio, 1)} months (target ${EMERGENCY_MIN}–${EMERGENCY_GOOD})`, id: `dana darurat ${fmt(m.emergencyFundRatio, 1)} bulan (target ${EMERGENCY_MIN}–${EMERGENCY_GOOD})` },
      { ok: m.dti <= DTI_MAX, name: ["debt (DTI)", "utang (DTI)"], en: `DTI ${pct(m.dti, fmt)} (target under ${DTI_OK}%)`, id: `DTI ${pct(m.dti, fmt)} (target di bawah ${DTI_OK}%)` },
    ];
    const weak = checks.filter((x) => !x.ok);
    const status = {
      CRITICAL: ["Your finances need attention right now.", "Keuanganmu perlu perhatian saat ini."],
      OPTIMAL: ["Your finances are in optimal shape.", "Keuanganmu dalam kondisi optimal."],
    }[m.healthStatus] ?? ["Your finances are on a medium footing.", "Keuanganmu dalam kondisi cukup baik."];
    return {
      en: `${status[0]} The three numbers behind it: ${checks.map((x) => x.en).join("; ")}. ${weak.length ? `Start with your ${weak[0].name[0]}: ask me about it for specific steps.` : "All three are past the minimum. Keep pushing towards the targets."}`,
      id: `${status[1]} Tiga angka di baliknya: ${checks.map((x) => x.id).join("; ")}. ${weak.length ? `Mulai dari ${weak[0].name[1]}: tanyakan padaku untuk langkah-langkah spesifiknya.` : "Ketiganya sudah melewati batas minimum. Terus dorong menuju target."}`,
    };
  },

  expert() {
    return {
      en: `Our experts are certified planners for things that need a human: tax, retirement, investing, property and more. Open the Experts page to see each one's topics and price. Sessions run 60 minutes, and Expert Standard and Pro include free monthly sessions plus discounts.`,
      id: `Expert kami adalah perencana keuangan bersertifikat untuk hal yang butuh pendampingan langsung: pajak, pensiun, investasi, properti, dan lainnya. Buka halaman Experts untuk melihat topik dan harga masing-masing. Setiap sesi 60 menit, dan paket Expert Standard serta Pro sudah termasuk sesi gratis bulanan plus diskon.`,
    };
  },

  greeting() {
    return {
      en: `Hi! Ask me about your savings rate, emergency fund, debt, net worth, budget or FIRE date, or tap one of the suggestions below.`,
      id: `Hai! Tanyakan soal tingkat tabungan, dana darurat, utang, kekayaan bersih, anggaran, atau tanggal FIRE kamu, atau ketuk salah satu saran di bawah.`,
    };
  },

  thanks() {
    return { en: `You're welcome! Ask anytime your numbers change.`, id: `Sama-sama! Tanya lagi kapan saja saat angkamu berubah.` };
  },

  unknown() {
    return {
      en: `I'm a rule-based coach, so I can only answer questions about your own numbers: savings rate, emergency fund, debt (DTI), net worth, budget, income and your FIRE date. Try asking about one of those. For anything else, an expert session is the best route.`,
      id: `Aku coach berbasis aturan, jadi aku hanya bisa menjawab pertanyaan tentang angka keuanganmu sendiri: tingkat tabungan, dana darurat, utang (DTI), kekayaan bersih, anggaran, pendapatan, dan tanggal FIRE. Coba tanyakan salah satunya. Untuk hal lain, sesi dengan expert adalah pilihan terbaik.`,
    };
  },

  noProfile() {
    return {
      en: `I need your income and expenses before I can say anything useful. Add them in Settings → Financial profile, then ask again.`,
      id: `Aku perlu data pendapatan dan pengeluaranmu dulu supaya bisa memberi jawaban yang berguna. Isi di Pengaturan → Profil keuangan, lalu tanya lagi.`,
    };
  },
};

const NEEDS_NUMBERS = new Set(["savings", "emergency", "debt", "fire", "networth", "budget", "income", "invest", "health"]);

/**
 * Reply to one message.
 * @param {string} text - what the user typed (ignored when `topic` is given)
 * @param {object} ctx - { profile, metrics, fireData, lang, money, fmt, topic? }
 */
export function coachReply(text, { profile, metrics, fireData, lang, money, fmt, topic }) {
  let key = topic ?? detectTopic(text);
  if (NEEDS_NUMBERS.has(key) && !(metrics?.monthlyIncome > 0)) key = "noProfile";
  const n = (v) => { const x = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const reply = REPLIES[key]({ m: metrics, f: fireData, p: profile ?? {}, money, fmt, n });
  return lang === "id" ? reply.id : reply.en;
}
