// Offers a file the app made (a backup) to the person. Inside Claude the viewer always asks them first; they may say
// no. On MySheet's own website it is an ordinary download (plans/offline-app.md).
import { runtime } from './claude';

export type SaveOutcome = 'saved' | 'declined' | 'unavailable' | 'failed';

export async function offerFile(filename: string, text: string): Promise<SaveOutcome> {
  const rt = runtime();
  if (!rt) return browserDownload(filename, text);
  const downloads = await rt.use('downloads');
  if (!downloads) return 'unavailable';
  try {
    await downloads.save({ filename, data: text });
    return 'saved';
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'declined') return 'declined';
    if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') return 'unavailable';
    throw e;
  }
}

/** An ordinary file download. The link is never added to the page: clicking a detached link is how browsers start one. */
function browserDownload(filename: string, text: string): SaveOutcome {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'saved';
}
