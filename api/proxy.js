// api/proxy.js - Vercel Serverless Function
// ئەم فایلە دابنێ لە پوختەری api/proxy.js لە پرۆژەکەتدا لە Vercel
// بەکارهێنان: /api/proxy?url=https://t.me/...

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'url parameter required' });
    }

    // تەنها لینکی تێلیگرام و ڤیدیۆ ڕێگە بدرێت
    const allowed = [
        't.me', 'telegram.org', 'cdn4.telegram-cdn.org',
        'video.twimg.com', 'cdn.discordapp.com'
    ];

    let isAllowed = false;
    try {
        const parsed = new URL(url);
        isAllowed = allowed.some(d => parsed.hostname.includes(d));
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!isAllowed) {
        return res.status(403).json({ error: 'Domain not allowed' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'video/mp4,video/*,*/*',
                'Accept-Encoding': 'identity',
                'Range': req.headers['range'] || 'bytes=0-',
            }
        });

        // Forward important headers
        const contentType = response.headers.get('content-type') || 'video/mp4';
        const contentLength = response.headers.get('content-length');
        const contentRange = response.headers.get('content-range');
        const acceptRanges = response.headers.get('accept-ranges');

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        if (contentRange) res.setHeader('Content-Range', contentRange);
        if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
        res.setHeader('Cache-Control', 'public, max-age=3600');

        res.status(response.status);

        // Stream the response
        const reader = response.body.getReader();
        const pump = async () => {
            const { done, value } = await reader.read();
            if (done) { res.end(); return; }
            res.write(Buffer.from(value));
            return pump();
        };
        await pump();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
