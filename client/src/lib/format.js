export const LEVELS = {
  high: {
    key: 'high',
    label: 'Indikasi AI tinggi',
    short: 'Tinggi',
    hex: '#E0483D',
    dot: 'bg-[#E0483D]',
    chip: 'bg-[#FDECEA] text-[#B4302A] ring-[#F5C6C1]',
    mark: 'bg-[#FBDDD9] hover:bg-[#F7CAC4]',
    border: 'border-[#E0483D]',
    soft: 'bg-[#FDECEA]',
  },
  medium: {
    key: 'medium',
    label: 'Indikasi AI sedang',
    short: 'Sedang',
    hex: '#E5A117',
    dot: 'bg-[#E5A117]',
    chip: 'bg-[#FDF4E3] text-[#8A6415] ring-[#F0DDB4]',
    mark: 'bg-[#FBEFD2] hover:bg-[#F7E4B7]',
    border: 'border-[#E5A117]',
    soft: 'bg-[#FDF4E3]',
  },
  low: {
    key: 'low',
    label: 'Indikasi AI rendah',
    short: 'Rendah',
    hex: '#2F9E64',
    dot: 'bg-[#2F9E64]',
    chip: 'bg-[#E9F7EF] text-[#1F7A4C] ring-[#C3E7D3]',
    mark: 'bg-[#DDF3E6] hover:bg-[#CBEBD9]',
    border: 'border-[#2F9E64]',
    soft: 'bg-[#E9F7EF]',
  },
};

export function levelOf(score) {
  if (score === null || score === undefined) return 'low';
  if (score >= 68) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function levelMeta(key) {
  return LEVELS[key] || LEVELS.low;
}

export function formatDate(iso, withTime = true) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatRelative(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(iso, false);
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const AVATAR_COLORS = {
  violet: 'bg-accent-100 text-accent-700',
  navy: 'bg-ink-100 text-ink-700',
  emerald: 'bg-[#E9F7EF] text-[#1F7A4C]',
  amber: 'bg-[#FDF4E3] text-[#8A6415]',
  rose: 'bg-[#FDECEA] text-[#B4302A]',
};

export function statusTone(status) {
  if (status === 'completed') return 'low';
  if (status === 'failed') return 'high';
  if (status === 'processing' || status === 'queued') return 'medium';
  return 'low';
}

export function statusLabel(status) {
  return (
    {
      completed: 'Selesai',
      processing: 'Diproses',
      queued: 'Antrean',
      failed: 'Gagal',
    }[status] || status
  );
}

/** Word-level diff (LCS) used by the before/after comparison view. */
export function wordDiff(before, after) {
  const tokenize = (text) => String(text || '').match(/\s+|[^\s]+/g) || [];
  const a = tokenize(before);
  const b = tokenize(after);
  const MAX = 4000;
  if (a.length > MAX || b.length > MAX) {
    return { truncated: true, parts: [{ type: 'same', text: after }] };
  }

  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts = [];
  let i = 0;
  let j = 0;
  const push = (type, text) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i += 1;
    } else {
      push('added', b[j]);
      j += 1;
    }
  }
  while (i < n) {
    push('removed', a[i]);
    i += 1;
  }
  while (j < m) {
    push('added', b[j]);
    j += 1;
  }
  return { truncated: false, parts };
}

/** Split a plain-text draft into paragraphs/sentences for the editor. */
export function splitDraft(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\n+/g, ' ').trim())
    .filter(Boolean)
    .map((block) => {
      const sentences = block.match(/[^.!?…]+[.!?…]+["'”’)]*|[^.!?…]+$/g) || [block];
      return sentences.map((s) => s.trim()).filter(Boolean);
    });
}
