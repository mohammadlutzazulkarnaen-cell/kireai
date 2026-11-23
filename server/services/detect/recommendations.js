import { AI_PHRASES, NOMINALIZATION } from './lexicon.js';
import { round } from '../text.js';

/**
 * Actionable rewrite plan derived from the signals that actually produced the
 * score. No number here is invented: the "potential drop" of a group is the
 * exact share of the document score contributed by its flagged sentences,
 * weighted the same way the engine weights them (by character length).
 *
 * It never rewrites the user's text — it only explains what to change.
 */

const MAX_SENTENCES_PER_GROUP = 8;

const GROUP_META = {
  phrase: {
    title: 'Ganti frasa formulaik',
    why:
      'Frasa klise dan konektor mekanis adalah sinyal terkuat pada mesin ini — pola inilah yang paling sering muncul pada keluaran model bahasa.',
    action: 'Hapus pembuka klise, lalu tulis pernyataan langsung yang menyebut subjek, bukti, atau pengalaman Anda.',
    steps: [
      'Buang frasa seperti "penting untuk dicatat", "di era digital", "selain itu" di awal kalimat.',
      'Mulai kalimat dengan subjek konkret atau peristiwa yang benar-benar terjadi.',
      'Ganti konektor mekanis dengan hubungan sebab-akibat yang eksplisit ("karena itu", "akibatnya").',
    ],
    example: {
      before: 'Penting untuk dicatat bahwa media sosial memainkan peran penting di era digital.',
      after: 'Saya berhenti memakai Instagram selama dua bulan pada 2024, dan waktu luang saya naik sekitar satu jam sehari.',
    },
  },
  uniformity: {
    title: 'Variasikan panjang dan ritme kalimat',
    why:
      'Panjang kalimat yang seragam membuat teks terasa datar dan datanya berkorelasi dengan keluaran model yang dihasilkan dalam satu tarikan.',
    action: 'Campur kalimat pendek dengan kalimat panjang, dan pecah kalimat yang memuat lebih dari satu gagasan.',
    steps: [
      'Pecah kalimat lebih dari 25 kata menjadi dua kalimat, satu gagasan per kalimat.',
      'Sisipkan satu kalimat pendek (5–8 kata) sebagai penegas.',
      'Hindari pola "kalimat topik → penjelasan → simpulan" yang berulang di setiap paragraf.',
    ],
    example: {
      before: 'Sistem ini meningkatkan efisiensi kerja. Sistem ini juga mempercepat proses pelaporan.',
      after: 'Sistem ini memotong waktu pelaporan dari dua hari jadi dua jam. Masih ada satu masalah: input data manual.',
    },
  },
  lexical: {
    title: 'Turunkan kepadatan diksi abstrak',
    why:
      'Nominalisasi (kata berakhiran -si, -tas, -men) dan kata panjang berulang menaikkan sinyal gaya akademik generik pada mesin ini.',
    action: 'Ubah kata benda abstrak menjadi kata kerja, lalu ganti diksi panjang dengan kata yang biasa Anda pakai.',
    steps: [
      'Ubah nominalisasi menjadi verba: "peningkatan" → "meningkatkan", "implementasi" → "menerapkan".',
      'Ganti satu kata panjang per kalimat dengan padanan sehari-hari yang tetap baku.',
      'Ulangi kata kunci dengan variasi, jangan menyalin frasa yang sama di paragraf berbeda.',
    ],
    example: {
      before: 'Implementasi kebijakan ini memberikan peningkatan terhadap efektivitas koordinasi.',
      after: 'Setelah kebijakan itu berjalan, tim bisa mengoordinasi 12 desa tanpa rapat mingguan.',
    },
  },
  personal: {
    title: 'Tambahkan penanda personal dan detail spesifik',
    why:
      'Bagian ini tidak memuat penanda gaya personal — tidak ada kata ganti orang pertama, angka, nama, atau pengalaman yang bisa diverifikasi.',
    action: 'Sisipkan satu detail yang hanya Anda tahu: tanggal, angka, nama tempat, atau alasan pribadi di balik klaim.',
    steps: [
      'Tambahkan satu angka atau rentang waktu yang bisa Anda pertanggungjawabkan.',
      'Bila bagian ini berisi pendapat, tulis dari sudut pandang Anda ("saya menemukan…").',
      'Sebut nama tempat, lembaga, atau kejadian nyata sebagai konteks.',
    ],
    example: {
      before: 'Program ini memberikan dampak signifikan bagi masyarakat.',
      after: 'Di desa saya, program ini menurunkan angka putus sekolah dari 14 menjadi 6 anak dalam setahun.',
    },
  },
};

function charLength(sentence) {
  return Math.max(1, String(sentence.text || '').length);
}

function matchedPhrases(text) {
  const source = String(text || '');
  const found = [];
  for (const phrase of AI_PHRASES) {
    const hit = source.match(phrase.re);
    if (hit) found.push(hit[0].replace(/\s+/g, ' ').trim());
  }
  return [...new Set(found)];
}

function nominalizationExamples(text) {
  const tokens = String(text || '').match(/\b\w{5,}\b/g) || [];
  return [...new Set(tokens.filter((token) => NOMINALIZATION.test(token)))].slice(0, 2);
}

function tipsFor(sentence, category, context) {
  const text = String(sentence.text || '');
  const wordCount = sentence.wordCount || 0;
  const tips = [];

  const phrases = matchedPhrases(text);
  if (phrases.length) {
    tips.push(`Ganti frasa "${phrases[0]}" dengan pernyataan langsung yang menyebut subjek dan buktinya.`);
  }

  if (category === 'uniformity') {
    if (context.std > 0 && wordCount > context.mean + Math.max(4, context.std)) {
      tips.push(`Kalimat ini ${wordCount} kata — pecah menjadi dua kalimat pendek.`);
    } else if (wordCount <= 8) {
      tips.push('Kalimat ini sangat pendek — beri satu detail konkret (angka, nama, atau alasan) agar tidak terasa terpotong.');
    } else if (context.std < 3.5) {
      tips.push('Selipkan kalimat pendek (≤ 8 kata) di antara kalimat panjang agar ritme tidak seragam.');
    } else {
      tips.push('Ubah urutan gagasan agar panjang kalimat tidak mengikuti pola yang sama.');
    }
  }

  if (category === 'lexical') {
    const nouns = nominalizationExamples(text);
    tips.push(
      nouns.length
        ? `Ubah nominalisasi ("${nouns.join('", "')}") menjadi kata kerja.`
        : 'Ganti diksi abstrak dengan kata kerja konkret.',
    );
  }

  if (!/\d/.test(text)) {
    tips.push('Tambahkan satu angka, tanggal, atau nama spesifik sebagai bukti.');
  }
  if (!sentence.features?.firstPerson && !sentence.features?.contractions) {
    tips.push('Bila isinya pendapat, tulis dari sudut pandang Anda ("saya menemukan…").');
  }

  return [...new Set(tips)].slice(0, 3);
}

export function buildRecommendations(result) {
  const sentences = [];
  for (const paragraph of result?.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      sentences.push({ ...sentence, paragraphIndex: paragraph.index });
    }
  }

  const totalChars = sentences.reduce((total, sentence) => total + charLength(sentence), 0) || 1;
  const context = {
    mean: Number(result?.stats?.avgSentenceLength) || 0,
    std: Number(result?.stats?.sentenceLengthStd) || 0,
  };

  const buckets = new Map();
  let flagged = 0;
  let points = 0;

  for (const sentence of sentences) {
    if (sentence.level === 'low') continue;
    flagged += 1;
    const weight = charLength(sentence);
    points += (sentence.aiScore * weight) / totalChars;

    const aiSignals = (sentence.signals || []).filter(
      (signal) => signal.category && signal.category !== 'human',
    );
    const strongest = [...aiSignals].sort((a, b) => b.weight - a.weight)[0];
    const category = ['phrase', 'uniformity', 'lexical'].includes(strongest?.category)
      ? strongest.category
      : 'personal';

    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category).push({ sentence, weight, tips: tipsFor(sentence, category, context) });
  }

  const items = [...buckets.entries()]
    .map(([category, entries]) => {
      const meta = GROUP_META[category];
      const affectedPoints = entries.reduce(
        (total, entry) => total + (entry.sentence.aiScore * entry.weight) / totalChars,
        0,
      );
      return {
        id: category,
        category,
        title: meta.title,
        why: meta.why,
        action: meta.action,
        steps: meta.steps,
        example: meta.example,
        affected: entries.length,
        points: round(affectedPoints, 1),
        averageScore: Math.round(
          entries.reduce((total, entry) => total + entry.sentence.aiScore, 0) / entries.length,
        ),
        sentences: [...entries]
          .sort((a, b) => b.sentence.aiScore * b.weight - a.sentence.aiScore * a.weight)
          .slice(0, MAX_SENTENCES_PER_GROUP)
          .map(({ sentence, tips }) => ({
            id: sentence.id,
            text: sentence.text,
            aiScore: sentence.aiScore,
            level: sentence.level,
            paragraphIndex: sentence.paragraphIndex,
            tips,
          })),
        hiddenCount: Math.max(0, entries.length - MAX_SENTENCES_PER_GROUP),
      };
    })
    .filter((item) => item.affected > 0)
    .sort((a, b) => b.points - a.points);

  return {
    summary: {
      flagged,
      total: sentences.length,
      groups: items.length,
      points: round(points, 1),
      note:
        'Potensi penurunan dihitung dari kontribusi kalimat bertanda terhadap skor dokumen (rata-rata berbobot panjang kalimat). ' +
        'Angka ini batas atas, bukan prediksi: skor baru hanya keluar setelah dokumen dianalisis ulang.',
    },
    items,
  };
}
