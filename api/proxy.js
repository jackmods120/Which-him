// api/proxy.js - Vercel Serverless Function
// ئەم فایلە دابنێ لە پوختەری api/proxy.js لە پرۆژەکەتدا لە Vercel
// بەکارهێنان: /api/proxy?url=https://t.me/...

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'url parameter required' });
    }

    // بلۆککردنی داواکاری بۆ ناوونیشانی ناوخۆیی (SSRF-ی ڕێگری لێبکرێت)
    const blockedHostPatterns = [
        /^localhost$/i, /^127\./, /^0\.0\.0\.0$/, /^10\./,
        /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
        /^169\.254\./, /^\[?::1\]?$/
    ];

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!/^https?:$/.test(parsed.protocol)) {
        return res.status(400).json({ error: 'Only http/https URLs allowed' });
    }
    if (blockedHostPatterns.some(re => re.test(parsed.hostname))) {
        return res.status(403).json({ error: 'This host is not allowed' });
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
