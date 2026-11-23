export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const isForm = body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: isForm ? headers : { 'Content-Type': 'application/json', ...headers },
      body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Tidak dapat menghubungi server. Periksa koneksi Anda.', 0);
  }

  const type = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = `Permintaan gagal (${response.status}).`;
    if (type.includes('application/json')) {
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch {
        /* keep default */
      }
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  return type.includes('application/json') ? response.json() : response;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

export function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/documents');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data);
      } else {
        reject(new ApiError(data?.error || 'Unggahan gagal diproses.', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('Koneksi terputus saat mengunggah dokumen.', 0));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/** Reports are served by the API with the session cookie, so a plain link works. */
export function downloadReport(analysisId, filename) {
  const link = document.createElement('a');
  link.href = `/api/analyses/${analysisId}/report.pdf`;
  link.download = filename || 'kirAI-report.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
