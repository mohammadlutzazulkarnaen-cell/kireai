import { detectLocal } from './heuristics.js';
import { detectRemote, remoteDetectorConfigured } from './remote.js';
import { DISCLAIMER } from './lexicon.js';

/**
 * Detection facade. The rest of the application talks only to runDetection(),
 * so a different engine can be plugged in without touching routes or UI.
 */
export async function runDetection(text, { engine = 'auto' } = {}) {
  const local = detectLocal(text);

  if (engine === 'local' || !remoteDetectorConfigured()) {
    return { ...local, disclaimer: DISCLAIMER };
  }

  const remote = await detectRemote(text, local);
  if (remote.ok) {
    return { ...remote.result, disclaimer: DISCLAIMER };
  }
  return {
    ...local,
    engine: {
      ...local.engine,
      note: `${local.engine.note} (API eksternal tidak dapat dipakai: ${remote.reason}; skor dihitung oleh mesin lokal.)`,
    },
    disclaimer: DISCLAIMER,
  };
}

export { ENGINE as LOCAL_ENGINE } from './heuristics.js';
