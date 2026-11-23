/**
 * Bilingual (English / Indonesian) lexicons used by the local detection engine.
 * These lists encode well-documented surface habits of instruction-tuned LLMs:
 * transition-word openers, hedging formulas, nominalisation-heavy phrasing,
 * and a low rate of personal/informal markers.
 */

export const AI_PHRASES = [
  // ---------- English ----------
  { re: /\bit (?:is|'s) (?:important|worth|crucial|essential) to (?:note|mention|remember|consider)\b/i, w: 0.2, label: 'Frasa klise "it is important to note"' },
  { re: /\bin today'?s (?:fast-paced|digital|modern|ever-changing)\b/i, w: 0.22, label: 'Pembuka klise "in today\'s fast-paced world"' },
  { re: /\bplays? (?:a|an) (?:crucial|vital|pivotal|significant|key) role\b/i, w: 0.18, label: 'Klise "plays a crucial role"' },
  { re: /\b(?:a|as a) testament to\b/i, w: 0.18, label: 'Ungkapan klise "a testament to"' },
  { re: /\bdelv(?:e|ing) into\b/i, w: 0.2, label: 'Kata khas model bahasa: "delve into"' },
  { re: /\bnavigat(?:e|ing) the (?:complexit|landscape|challenge)/i, w: 0.16, label: 'Klise "navigate the complexities"' },
  { re: /\bin the realm of\b/i, w: 0.14, label: 'Klise "in the realm of"' },
  { re: /\bfurthermore\b|\bmoreover\b|\badditionally\b/i, w: 0.1, label: 'Konektor formal berulang (furthermore/moreover)' },
  { re: /\bin conclusion\b|\bto summari[sz]e\b|\bin summary\b/i, w: 0.16, label: 'Penutup formulaik "in conclusion"' },
  { re: /\bnot only\b[^.]{0,80}\bbut also\b/i, w: 0.12, label: 'Konstruksi paralel "not only ... but also"' },
  { re: /\bever-evolving\b|\bever-changing\b|\bever-growing\b/i, w: 0.14, label: 'Kata klise "ever-evolving"' },
  { re: /\bcrucial role in shaping\b|\bshaping the future\b/i, w: 0.16, label: 'Klise "shaping the future"' },
  { re: /\bvaluable insights\b|\bdeeper understanding\b/i, w: 0.12, label: 'Frasa generik "valuable insights"' },
  { re: /\b(?:the )?(?:landscape|world) of [a-z]+ (?:is|has) (?:evolved|changed)\b/i, w: 0.12, label: 'Pola pembuka generik tentang "landscape"' },
  { re: /\bthis (?:essay|article|paper|report) will (?:explore|discuss|examine)\b/i, w: 0.14, label: 'Meta-kalimat "this essay will explore"' },
  { re: /\b(?:harness|leverag)(?:ing|e) the power of\b/i, w: 0.16, label: 'Klise "harness the power of"' },
  { re: /\bcutting-edge\b|\bstate-of-the-art\b|\bseamless(?:ly)?\b|\brobust\b|\bholistic\b/i, w: 0.12, label: 'Kosakata pemasaran generik (seamless, robust, holistic)' },
  { re: /\bmultifaceted\b|\bunderscores?\b|\bparadigm\b|\bfoster(?:s|ing)?\b|\bempower(?:s|ing)?\b/i, w: 0.1, label: 'Kosakata akademik generik (multifaceted, foster, empower)' },
  { re: /\bwhen it comes to\b/i, w: 0.1, label: 'Konektor generik "when it comes to"' },
  { re: /\bthis (?:ensures|allows|enables) (?:that|us|them)\b/i, w: 0.1, label: 'Pola penjelas "this ensures that"' },
  { re: /\bit is (?:also )?(?:clear|evident|apparent) that\b/i, w: 0.12, label: 'Formula "it is evident that"' },
  { re: /\b(?:one|another) of the (?:most )?(?:important|significant|common|key)\b/i, w: 0.1, label: 'Generalisasi "one of the most important"' },
  { re: /\bthere are (?:several|many|numerous) (?:key |important )?(?:ways|factors|reasons|aspects|benefits)\b/i, w: 0.12, label: 'Struktur enumerasi generik "there are several factors"' },
  { re: /\bby (?:doing so|implementing this|taking these steps)\b/i, w: 0.1, label: 'Penutup klise "by doing so"' },
  { re: /\bcan (?:significantly|greatly) (?:improve|enhance|increase|impact)\b/i, w: 0.1, label: 'Klaim umum "can significantly improve"' },

  // ---------- Indonesian ----------
  { re: /\bselain itu\b/i, w: 0.12, label: 'Konektor berulang "selain itu"' },
  { re: /\bolel karena itu\b|\bdengan demikian\b|\bsehubungan dengan itu\b/i, w: 0.12, label: 'Konektor formal berulang (oleh karena itu / dengan demikian)' },
  { re: /\b(di|pada) era (digital|globalisasi|modern|industri 4\.0)\b/i, w: 0.2, label: 'Pembuka klise "di era digital"' },
  { re: /\bseiring (dengan )?(perkembangan|kemajuan)\b/i, w: 0.16, label: 'Pembuka klise "seiring dengan perkembangan"' },
  { re: /\bpenting untuk (dicatat|diperhatikan|diingat|dipahami)\b/i, w: 0.2, label: 'Frasa klise "penting untuk dicatat"' },
  { re: /\b(memainkan|memegang) peran (yang )?(sangat )?(penting|krusial|signifikan|utama|kunci)\b/i, w: 0.2, label: 'Klise "memainkan peran penting"' },
  { re: /\bmerupakan salah satu\b/i, w: 0.12, label: 'Formula "merupakan salah satu"' },
  { re: /\btidak dapat dipungkiri\b|\btidak bisa dipungkiri\b/i, w: 0.16, label: 'Klise "tidak dapat dipungkiri"' },
  { re: /\bsecara (menyeluruh|komprehensif|signifikan|optimal|holistik)\b/i, w: 0.12, label: 'Keterangan generik "secara menyeluruh/komprehensif"' },
  { re: /\bdapat disimpulkan bahwa\b|\bsebagai kesimpulan\b|\bkesimpulannya\b/i, w: 0.18, label: 'Penutup formulaik "dapat disimpulkan bahwa"' },
  { re: /\bdalam konteks (ini|tersebut|yang lebih luas)\b/i, w: 0.12, label: 'Frasa penghubung generik "dalam konteks ini"' },
  { re: /\bmenjadi (fondasi|landasan|kunci|pilar)\b/i, w: 0.14, label: 'Klise "menjadi fondasi/landasan"' },
  { re: /\b(berbagai|pelbagai) (aspek|faktor|tantangan|manfaat|upaya)\b/i, w: 0.1, label: 'Generalisasi "berbagai aspek/faktor"' },
  { re: /\bsolusi (inovatif|efektif|komprehensif)\b|\blangkah (strategis|inovatif)\b/i, w: 0.12, label: 'Frasa solusi generik' },
  { re: /\b(sangat|amat) penting (untuk|bagi|dalam)\b/i, w: 0.12, label: 'Penekanan generik "sangat penting untuk"' },
  { re: /\bhal ini (menunjukkan|menegaskan|mencerminkan) bahwa\b/i, w: 0.12, label: 'Pola penjelas "hal ini menunjukkan bahwa"' },
  { re: /\bdengan memanfaatkan\b|\bdengan mengintegrasikan\b/i, w: 0.1, label: 'Pola "dengan memanfaatkan"' },
  { re: /\bmemberikan (dampak|kontribusi) (yang )?(signifikan|positif|besar)\b/i, w: 0.12, label: 'Klaim umum "memberikan dampak signifikan"' },
  { re: /\b(menjadi )?tantangan tersendiri\b/i, w: 0.1, label: 'Klise "tantangan tersendiri"' },
  { re: /\b(meningkatkan|mendorong) (kesadaran|kolaborasi|efisiensi) (masyarakat|tim|sistem)?\b/i, w: 0.08, label: 'Klaim manfaat generik' },
  { re: /\b(pertama|kedua|ketiga),?\s+(yang )?(perlu|harus)\b/i, w: 0.1, label: 'Enumerasi mekanis "pertama, kedua"' },
];

export const TRANSITION_OPENERS = new RegExp(
  '^(?:furthermore|moreover|additionally|however|therefore|thus|consequently|overall|in conclusion|in summary|firstly|secondly|finally|' +
    'selain itu|oleh karena itu|dengan demikian|namun|sebagai kesimpulan|secara keseluruhan|pertama|kedua|ketiga|terakhir|di sisi lain)\\b[,\\s]',
  'i',
);

export const HUMAN_INFORMAL = [
  'nggak', 'gak', 'enggak', 'udah', 'udh', 'aja', 'banget', 'gue', 'gua', 'bikin', 'dapet',
  'kayak', 'gimana', 'sih', 'deh', 'kok', 'ribet', 'males', 'gonna', 'kinda', 'wanna',
  'yeah', 'nope', 'stuff', 'folks', 'kiddo', 'cuz', 'tho', 'dunno',
];

export const HUMAN_INTERJECTIONS = [
  'honestly', 'frankly', 'well,', 'look,', 'hmm', 'ugh', 'wow', 'anyway', 'basically',
  'actually,', 'jujur', 'sebenarnya', 'eh,', 'ya,', 'hmm,', 'ternyata', 'anehnya', 'ironisnya',
];

export const FIRST_PERSON = [
  'i', 'me', 'my', 'mine', 'we', 'our', 'us', 'saya', 'aku', 'kami', 'kita', 'gue', 'gua',
];

export const SECOND_PERSON = ['you', 'your', 'kamu', 'kalian', 'anda'];

export const PERSONAL_CUES = [
  /\bwhen i (?:was|had|first)\b/i,
  /\bin my (?:experience|opinion|view)\b/i,
  /\bi (?:think|believe|remember|noticed|felt|realized)\b/i,
  /\bmenurut (?:pengalaman|pendapat) saya\b/i,
  /\bsaya (?:pernah|merasakan|mencoba|melihat|ingat)\b/i,
  /\bwaktu (?:saya|aku) (?:masih|kecil|kuliah)\b/i,
  /\bsejujurnya\b|\bjujur saja\b/i,
];

// Apostrophes are required on purpose: an optional apostrophe would wrongly
// match plain words such as "its" or "cause" and inflate the human score.
export const CONTRACTIONS =
  /\b(?:can['’]t|won['’]t|don['’]t|doesn['’]t|didn['’]t|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|hasn['’]t|haven['’]t|hadn['’]t|wouldn['’]t|shouldn['’]t|couldn['’]t|it['’]s|that['’]s|there['’]s|here['’]s|what['’]s|let['’]s|i['’]m|i['’]ve|i['’]ll|i['’]d|you['’]re|you['’]ve|we['’]re|we['’]ve|they['’]re|they['’]ve|he['’]s|she['’]s)\b|\b\w+n['’]t\b/i;

export const ENUMERATORS = new RegExp(
  '^(?:first|second|third|finally|lastly|to begin with|' +
    'pertama|kedua|ketiga|keempat|selanjutnya|terakhir|yang pertama)\\b[,\\s]',
  'i',
);

export const NOMINALIZATION = /(?:tion|sion|ment|ness|ity|ance|ence|ization|isation|isasi|itas|isme)\b/i;

export const DISCLAIMER =
  'Hasil ini adalah estimasi probabilitas statistik berdasarkan pola permukaan teks, bukan bukti pasti bahwa dokumen ditulis oleh AI. ' +
  'Tidak ada detektor yang dapat memastikan asal-usul sebuah tulisan. Gunakan hasil ini sebagai bahan pertimbangan, bukan dasar tunggal untuk menuduh atau memberi sanksi.';
