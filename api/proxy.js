// Vercel Serverless Function: /api/proxy
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'url query parameter required' });

  try {
    // سەرەتا هێدەرەکان دەخوێنینەوە بۆ قەبارە و جۆر
    const headRes = await fetch(targetUrl, { method: 'HEAD' });
    const contentLength = headRes.headers.get('content-length');
    const contentType = headRes.headers.get('content-type') || 'video/mp4';

    // پشتگیری لە Range Requests
    const range = req.headers.range;
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
      const chunkSize = (end - start) + 1;

      const videoRes = await fetch(targetUrl, { headers: { Range: `bytes=${start}-${end}` } });
      const buffer = await videoRes.arrayBuffer();

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(buffer));
    }

    // ناردنی تەواو فایل
    const videoRes = await fetch(targetUrl);
    const buffer = await videoRes.arrayBuffer();
    res.setHeader('Content-Length', contentLength || buffer.byteLength);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Failed to fetch video' });
  }
}
