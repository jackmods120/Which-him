// api/proxy.js
export default async function handler(req, res) {
    // ڕێگەدان بە داواکاری لە هەر شوێنێکەوە
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // وەرگرتنی لینکی ڤیدیۆکە لە پرسیارەکەوە
    const videoUrl = req.query.url;
    
    // ئەگەر هیچ لینکێک نەهات، هەڵەیەک نیشان بدە
    if (!videoUrl) {
        return res.status(400).json({ error: 'پێویستت بە "url" هەیە لە پرسیارەکەدا' });
    }

    try {
        // داواکاری ناردن بۆ لینکی ڕاستەقینەی ڤیدیۆکە
        const response = await fetch(videoUrl);
        
        // ئەگەر لینکەکە شکستی هێنا
        if (!response.ok) {
            return res.status(response.status).json({ error: 'نەتوانرا ڤیدیۆکە وەربگیرێت' });
        }

        // ڕێکخستنی هێدەرەکان بۆ پەخشکردنی ڕاستەوخۆ
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.setHeader('Content-Length', response.headers.get('content-length'));
        
        // ئەگەر سێرڤەر پشتگیری لە "Range" دەکات، ڕێگە بە فاست فۆروارد و گەڕانەوە بدە
        if (response.headers.get('accept-ranges')) {
            res.setHeader('Accept-Ranges', response.headers.get('accept-ranges'));
        }

        // ناردنی ڤیدیۆکە بۆ بەکارهێنەر
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        res.send(buffer);
        
    } catch (error) {
        res.status(500).json({ error: 'کێشەیەک ڕوویدا لە پڕۆسەی پەخشکردندا' });
    }
}
