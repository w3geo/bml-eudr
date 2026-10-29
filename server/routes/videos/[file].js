import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

// Explainer videos and their posters, see app/pages/index.vue. They are served here instead of
// from public/, because Nitro's static handler ignores Range requests, and Safari (iOS) does not
// play videos without them. It would also read each video into memory for every request.
const videoDir = 'videos';
const contentTypes = {
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
};

export default defineEventHandler(async (event) => {
  assertMethod(event, ['GET', 'HEAD']);
  const file = getRouterParam(event, 'file') || '';
  const match = file.match(/^[a-z0-9-]+\.(mp4|jpg)$/);
  if (!match) {
    throw createError({ statusCode: 404 });
  }
  const path = join(videoDir, file);
  const stats = await stat(path).catch(() => null);
  if (!stats?.isFile()) {
    throw createError({ statusCode: 404 });
  }
  const size = stats.size;
  const lastModified = stats.mtime.toUTCString();

  setResponseHeaders(event, {
    'Content-Type': contentTypes[/** @type {'mp4'|'jpg'} */ (match[1])],
    'Accept-Ranges': 'bytes',
    'Last-Modified': lastModified,
    'Cache-Control': 'public, max-age=86400',
  });
  if (getRequestHeader(event, 'if-modified-since') === lastModified) {
    setResponseStatus(event, 304);
    return '';
  }

  let start = 0;
  let end = size - 1;
  // Only single ranges ("bytes=0-1", "bytes=100-", "bytes=-500"), which is what browsers send.
  // Anything else is ignored and the whole file is sent, as RFC 9110 allows.
  const [, from = '', to = ''] =
    getRequestHeader(event, 'range')?.match(/^bytes=(\d*)-(\d*)$/) || [];
  if (from || to) {
    if (from) {
      start = Number(from);
      end = to ? Math.min(Number(to), size - 1) : size - 1;
    } else {
      start = Math.max(size - Number(to), 0);
    }
    if (start > end) {
      setResponseHeader(event, 'Content-Range', `bytes */${size}`);
      throw createError({ statusCode: 416 });
    }
    setResponseStatus(event, 206);
    setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${size}`);
  }
  setResponseHeader(event, 'Content-Length', end - start + 1);
  if (event.method === 'HEAD') {
    return '';
  }
  return sendStream(event, createReadStream(path, { start, end }));
});
