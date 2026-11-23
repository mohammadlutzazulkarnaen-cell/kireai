import {
  AI_PHRASES,
  TRANSITION_OPENERS,
  HUMAN_INFORMAL,
  HUMAN_INTERJECTIONS,
  FIRST_PERSON,
  SECOND_PERSON,
  PERSONAL_CUES,
  CONTRACTIONS,
  ENUMERATORS,
  NOMINALIZATION,
} from './lexicon.js';
import { clamp, countWords, readingTimeMinutes, round, segmentText, words } from '../text.js';

/**
 * kirAI heuristic detection engine (local, deterministic).
 *
 * It measures surface-level stylistic signals that distinguish instruction-tuned
 * LLM output from ordinary human prose:
 *   1. formulaic phrases / transition openers
 *   2. sentence-length uniformity ("burstiness")
 *   3. lexical diversity and repetition
 *   4. nominalisation and long-word density
 *   5. personal-style markers (contractions, first person, informality, typos)
 *
 * Nothing here is random: the same text always produces the same score, and
 * every point of the score is attributable to a listed signal.
 */

const ENGINE = {
  id: 'kireai-heuristic-v1',
  name: 'kirAI Heuristic Engine v1',
  mode: 'local',
  version: '1.0.0',
  note:
    'Mesin heuristik lokal: menganalisis pola stilistik teks (frasa formulaik, keseragaman panjang kalimat, kekayaan kosakata, nominalisasi, penanda gaya personal). Deterministik dan berjalan tanpa mengirim dokumen ke pihak ketiga.',
};

const HIGH_THRESHOLD = 68;
const MEDIUM_THRESHOLD = 40;

function levelFor(score) {
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function nominalizationRatio(list) {
  if (!list.length) return 0;
  let hits = 0;
  for (const w of list) if (NOMINALIZATION.test(w)) hits += 1;
  return hits / list.length;
}

function meanWordLength(list) {
  if (!list.length) return 0;
  const total = list.reduce((a, w) => a + w.length, 0);
  return total / list.length;
}

function bigramRepetition(list) {
  if (list.length < 8) return 0;
  const counts = new Map();
  for (let i = 0; i < list.length - 1; i += 1) {
    const key = `${list[i]} ${list[i + 1]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let repeated = 0;
  for (const n of counts.values()) if (n > 2) repeated += n - 2;
  return repeated / list.length;
}

function scoreToPercent(aiWeight, humanWeight) {
  const a = Math.max(aiWeight, 0.001) ** 1.6;
  const h = Math.max(humanWeight, 0.001) ** 1.6;
  return clamp((a / (a + h)) * 100, 1, 99);
}

function suggestionFor(level, triggers) {
  const hasPhrase = triggers.some((t) => t.category === 'phrase');
  const hasUniform = triggers.some((t) => t.category === 'uniformity');
  if (level === 'high') {
    if (hasPhrase) {
      return 'Ganti frasa formulaik dengan kalimat Anda sendiri, lalu tambahkan contoh konkret, data, atau pengalaman pribadi yang tidak bisa dihasilkan model secara generik.';
    }
    if (hasUniform) {
      return 'Pecah kalimat yang seragam menjadi campuran kalimat pendek dan panjang, dan sisipkan argumen personal agar ritme tulisan lebih alami.';
    }
    return 'Tulis ulang bagian ini dengan struktur dan diksi Anda sendiri; pastikan ada klaim spesifik yang bisa Anda pertanggungjawabkan.';
  }
  if (level === 'medium') {
    return 'Periksa apakah bagian ini benar-benar mencerminkan analisis Anda. Menambahkan contoh spesifik atau opini yang beralasan biasanya menurunkan indikasi AI.';
  }
  return 'Karakteristik tulisan manusia cukup kuat. Tidak ada perubahan yang diperlukan kecuali Anda ingin memperjelas isi.';
}

function buildReasons(triggers, level) {
  const sorted = [...triggers].sort((a, b) => b.weight - a.weight);
  const picked = sorted.slice(0, 3).map((t) => t.label);
  if (!picked.length) {
    if (level === 'high') picked.push('Kombinasi panjang kalimat seragam dan kosakata generik tanpa penanda gaya personal.');
    else if (level === 'medium') picked.push('Campuran pola formal dan sedikit variasi gaya; tidak ada penanda kuat ke arah mana pun.');
    else picked.push('Tidak ditemukan frasa formulaik maupun keseragaman struktur yang mencolok.');
  }
  return picked;
}

export function detectLocal(rawText) {
  const paragraphs = segmentText(rawText).filter((p) => p.sentences.length > 0);
  const allSentences = paragraphs.flatMap((p) => p.sentences);
  const tokenList = words(rawText);
  const wordCount = tokenList.length;

  if (!allSentences.length) {
    return {
      engine: ENGINE,
      scores: { ai: 0, human: 0 },
      stats: {
        words: 0, sentences: 0, paragraphs: 0, characters: 0,
        avgSentenceLength: 0, sentenceLengthStd: 0, uniqueWordRatio: 0, readingMinutes: 0,
      },
      distribution: { high: 0, medium: 0, low: 0 },
      confidence: 'rendah',
      verdict: {
        level: 'low',
        title: 'Teks tidak cukup untuk dianalisis',
        summary: 'Dokumen tidak mengandung kalimat yang bisa dianalisis. Pastikan file berisi teks (bukan hasil pindai/gambar).',
      },
      topSignals: [],
      paragraphs: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const sentenceLengths = allSentences.map((s) => countWords(s.text));
  const docMeanLen = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const docStdLen = stdDev(sentenceLengths);
  const docTtr = wordCount ? new Set(tokenList).size / wordCount : 0;
  const docNomRatio = nominalizationRatio(tokenList);
  const docContractionRate = wordCount
    ? (String(rawText).match(CONTRACTIONS) || []).length / Math.max(1, allSentences.length)
    : 0;
  const docInformalHits = wordCount
    ? tokenList.filter((w) => HUMAN_INFORMAL.includes(w)).length / wordCount
    : 0;
  const docRepetition = bigramRepetition(tokenList);

  // Document-level priors, derived from whole-text statistics.
  let docAi = 0.30;
  let docHuman = 0.30;
  const docTriggers = [];

  if (docStdLen < 3.5 && allSentences.length >= 4) {
    docAi += 0.1;
    docTriggers.push({ label: `Panjang kalimat sangat seragam (simpangan baku ${round(docStdLen, 1)} kata).`, weight: 0.1, category: 'uniformity' });
  } else if (docStdLen > 9) {
    docHuman += 0.06;
  }
  if (docContractionRate >= 0.12) {
    docHuman += 0.12;
    docTriggers.push({ label: 'Banyak kontraksi/informalitas antar kalimat (ciri tulisan manusia).', weight: 0.12, category: 'human' });
  }
  if (docInformalHits >= 0.004) {
    docHuman += 0.1;
  }
  if (docTtr < 0.42 && wordCount > 200) {
    docAi += 0.08;
    docTriggers.push({ label: `Kosakata berulang: rasio kata unik hanya ${(docTtr * 100).toFixed(0)}%.`, weight: 0.08, category: 'lexical' });
  }
  if (docNomRatio > 0.09) {
    docAi += 0.08;
    docTriggers.push({ label: `Kepadatan nominalisasi tinggi (${(docNomRatio * 100).toFixed(0)}% kata berakhiran -tion/-ment/-itas).`, weight: 0.08, category: 'lexical' });
  }
  if (docRepetition > 0.02) {
    docAi += 0.05;
  }

  const analyzedParagraphs = paragraphs.map((paragraph) => {
    const pWords = words(paragraph.text);
    const pNomRatio = nominalizationRatio(pWords);
    const pMeanWordLen = meanWordLength(pWords);
    const pTtr = pWords.length ? new Set(pWords).size / pWords.length : 0;

    let pAi = docAi;
    let pHuman = docHuman;
    const pTriggers = [];

    if (pWords.length > 40 && pTtr < 0.62) {
      pAi += 0.05;
      pTriggers.push({ label: 'Paragraf mengulang kosakata yang sama dengan variasi rendah.', weight: 0.05, category: 'lexical' });
    }
    if (pNomRatio > 0.1) {
      pAi += 0.05;
      pTriggers.push({ label: 'Banyak kata benda abstrak bernuansa formal dalam paragraf ini.', weight: 0.05, category: 'lexical' });
    }
    if (pMeanWordLen > 5.6) {
      pAi += 0.04;
      pTriggers.push({ label: `Rata-rata panjang kata ${round(pMeanWordLen, 1)} huruf — diksi berat dan seragam.`, weight: 0.04, category: 'lexical' });
    }

    const sentences = paragraph.sentences.map((sentence) => {
      const text = sentence.text;
      const list = words(text);
      const wc = list.length;
      let ai = pAi;
      let human = pHuman;
      const triggers = [...docTriggers, ...pTriggers];

      // 1) formulaic AI phrases
      let phraseWeight = 0;
      const phraseLabels = [];
      for (const phrase of AI_PHRASES) {
        if (phrase.re.test(text)) {
          phraseWeight += phrase.w;
          phraseLabels.push(phrase.label);
        }
      }
      if (phraseWeight > 0) {
        const applied = Math.min(phraseWeight, 0.55);
        ai += applied;
        triggers.push({
          label: `Mengandung frasa formulaik khas model bahasa: ${phraseLabels.slice(0, 2).map((l) => `"${l}"`).join(', ')}.`,
          weight: applied,
          category: 'phrase',
        });
      }

      // 2) mechanical transition opener
      if (TRANSITION_OPENERS.test(text)) {
        ai += 0.05;
        triggers.push({ label: 'Dibuka konektor transisi mekanis (mis. "Furthermore", "Selain itu").', weight: 0.05, category: 'phrase' });
      }
      if (ENUMERATORS.test(text)) {
        ai += 0.05;
        triggers.push({ label: 'Menggunakan penomoran mekanis ("First,", "Kedua,") yang khas struktur buatan.', weight: 0.05, category: 'phrase' });
      }

      // 3) sentence-length burstiness
      if (docStdLen > 0.5) {
        const z = Math.abs(wc - docMeanLen) / docStdLen;
        human += clamp(z * 0.055, 0, 0.16);
        if (z > 1.4) {
          triggers.push({ label: `Panjang kalimat menyimpang jauh dari rata-rata dokumen (${wc} vs ${round(docMeanLen, 0)} kata) — ritme tidak seragam.`, weight: 0.06, category: 'human' });
        }
      }
      if (wc <= 6) {
        human += 0.07;
        triggers.push({ label: 'Kalimat sangat pendek — jarang muncul pada keluaran model yang seragam.', weight: 0.07, category: 'human' });
      }

      // 4) nominalisation + long words in this sentence
      const wnRatio = nominalizationRatio(list);
      if (wnRatio > 0.15) {
        ai += 0.07;
        triggers.push({ label: `Dominasi nominalisasi (${(wnRatio * 100).toFixed(0)}% kata) — gaya akademik generik.`, weight: 0.07, category: 'lexical' });
      }
      if (wnRatio < 0.03 && wc > 12) {
        human += 0.04;
      }
      if (meanWordLength(list) > 6.2) {
        ai += 0.05;
        triggers.push({ label: 'Diksi panjang dan abstrak tanpa kata sehari-hari.', weight: 0.05, category: 'lexical' });
      }

      // 5) personal / human markers
      const contractionHits = (text.match(CONTRACTIONS) || []).length;
      if (contractionHits) {
        human += Math.min(0.18, 0.07 * contractionHits);
        triggers.push({ label: 'Menggunakan kontraksi (mis. "don\'t", "nggak") yang jarang dipakai model bahasa formal.', weight: 0.07, category: 'human' });
      }
      const firstPerson = list.filter((w) => FIRST_PERSON.includes(w)).length;
      const secondPerson = list.filter((w) => SECOND_PERSON.includes(w)).length;
      if (firstPerson) {
        human += Math.min(0.16, 0.05 + 0.03 * firstPerson);
        triggers.push({ label: 'Ada kata ganti orang pertama — sudut pandang personal.', weight: 0.08, category: 'human' });
      }
      if (secondPerson && wc < 40) {
        human += 0.05;
      }
      if (list.some((w) => HUMAN_INFORMAL.includes(w))) {
        human += 0.16;
        triggers.push({ label: 'Mengandung kata informal/percakapan sehari-hari.', weight: 0.16, category: 'human' });
      }
      if (HUMAN_INTERJECTIONS.some((m) => text.toLowerCase().includes(m))) {
        human += 0.1;
        triggers.push({ label: 'Ada penanda suara personal (mis. "jujur", "honestly").', weight: 0.1, category: 'human' });
      }
      if (PERSONAL_CUES.some((re) => re.test(text))) {
        human += 0.14;
        triggers.push({ label: 'Menyertakan pengalaman/opini personal yang spesifik.', weight: 0.14, category: 'human' });
      }
      if (/[!?]/.test(text) && text.length > 12) {
        human += 0.06;
        triggers.push({ label: 'Menggunakan tanda tanya/seru — variasi retoris.', weight: 0.06, category: 'human' });
      }
      if (/…|\.\.\./.test(text)) {
        human += 0.05;
      }
      if (/\b\d{4}\b|\b\d+([.,]\d+)?%|\bRp\s?\d/.test(text)) {
        human += 0.04;
      }
      if (/\b[A-Z]{3,}\b/.test(text.replace(/^[A-Z][A-Za-z]*/, ''))) {
        human += 0.05;
      }
      if (/[;:]/.test(text)) {
        ai += 0.03;
      }
      if (/\s{2,}|  +/.test(text)) {
        human += 0.04;
      }

      const score = scoreToPercent(ai, human);
      const level = levelFor(score);
      return {
        id: sentence.id,
        index: sentence.index,
        text,
        wordCount: wc,
        aiScore: Math.round(score),
        level,
        reasons: buildReasons(triggers, level),
        signals: [...triggers].sort((a, b) => b.weight - a.weight).slice(0, 6),
        suggestion: suggestionFor(level, triggers),
        features: {
          phraseHits: phraseLabels.length,
          nominalizationRatio: round(wnRatio, 3),
          contractions: contractionHits,
          firstPerson,
          sentenceLength: wc,
        },
      };
    });

    const charWeightTotal = sentences.reduce((a, s) => a + Math.max(1, s.text.length), 0);
    const pScore = sentences.reduce((a, s) => a + s.aiScore * Math.max(1, s.text.length), 0) / Math.max(1, charWeightTotal);
    return {
      id: paragraph.id,
      index: paragraph.index,
      text: paragraph.text,
      wordCount: pWords.length,
      aiScore: Math.round(pScore),
      level: levelFor(pScore),
      sentences,
      reasons: sentences
        .filter((s) => s.level !== 'low')
        .flatMap((s) => s.reasons)
        .slice(0, 3),
    };
  });

  const allSentencesOut = analyzedParagraphs.flatMap((p) => p.sentences);
  const totalChars = allSentencesOut.reduce((a, s) => a + Math.max(1, s.text.length), 0);
  const aiScore = Math.round(
    allSentencesOut.reduce((a, s) => a + s.aiScore * Math.max(1, s.text.length), 0) / Math.max(1, totalChars),
  );
  const humanScore = 100 - aiScore;
  const distribution = {
    high: allSentencesOut.filter((s) => s.level === 'high').length,
    medium: allSentencesOut.filter((s) => s.level === 'medium').length,
    low: allSentencesOut.filter((s) => s.level === 'low').length,
  };

  // Only AI-leaning signals belong in "top signals"; human markers are shown
  // separately so the two directions are never mixed in one list.
  const signalCounts = new Map();
  const humanCounts = new Map();
  for (const s of allSentencesOut) {
    for (const r of s.reasons) {
      const isHuman = s.signals?.some((sig) => sig.label === r && sig.category === 'human');
      const bucket = isHuman ? humanCounts : signalCounts;
      bucket.set(r, (bucket.get(r) || 0) + 1);
    }
  }
  const topSignals = [...signalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
  const humanSignals = [...humanCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const confidence =
    wordCount < 120 || allSentencesOut.length < 5 ? 'rendah' : wordCount < 400 ? 'sedang' : 'tinggi';

  let verdict;
  if (aiScore >= HIGH_THRESHOLD) {
    verdict = {
      level: 'high',
      title: 'Indikasi AI tinggi',
      summary: `Sekitar ${aiScore}% teks menunjukkan pola yang umum pada keluaran model bahasa: frasa formulaik, struktur kalimat seragam, dan minim penanda gaya personal. Periksa bagian bertanda merah dan pertimbangkan menulis ulang dengan contoh serta argumen Anda sendiri.`,
    };
  } else if (aiScore >= MEDIUM_THRESHOLD) {
    verdict = {
      level: 'medium',
      title: 'Indikasi AI sedang',
      summary: `Sekitar ${aiScore}% teks memiliki campuran pola formal dan gaya yang lebih personal. Sebagian bagian (kuning) perlu dievaluasi ulang, terutama bila Anda merasa tidak menulisnya dengan gaya tersebut.`,
    };
  } else {
    verdict = {
      level: 'low',
      title: 'Indikasi AI rendah',
      summary: `Hanya sekitar ${aiScore}% teks yang menunjukkan pola khas AI. Sebagian besar kalimat memakai ritme, diksi, dan penanda personal yang umum pada tulisan manusia.`,
    };
  }

  return {
    engine: ENGINE,
    scores: { ai: aiScore, human: humanScore },
    stats: {
      words: wordCount,
      sentences: allSentencesOut.length,
      paragraphs: analyzedParagraphs.length,
      characters: String(rawText).length,
      avgSentenceLength: round(docMeanLen, 1),
      sentenceLengthStd: round(docStdLen, 1),
      uniqueWordRatio: round(docTtr, 3),
      readingMinutes: readingTimeMinutes(wordCount),
    },
    distribution,
    confidence,
    verdict,
    topSignals,
    humanSignals,
    paragraphs: analyzedParagraphs,
    generatedAt: new Date().toISOString(),
  };
}

export { HIGH_THRESHOLD, MEDIUM_THRESHOLD, levelFor, ENGINE };
