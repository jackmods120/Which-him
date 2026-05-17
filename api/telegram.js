// api/telegram.js
// ئەم فایلە دابنێ لە: api/telegram.js لە GitHub-ەکەت
//
// پێش بەکارهێنان:
// 1. https://t.me/BotFather بچۆ، Bot نوێ دروست بکە
// 2. Token-ەکەی بنووسە لە Vercel → Settings → Environment Variables
//    ناو: TELEGRAM_BOT_TOKEN
//    نرخ: 123456789:AAF...
// 3. ئەگەر کانەلەکەت پرایڤەتە، Botەکەت بکەرە ئەدمینی کانەلەکە

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { channel, msgId } = req.query;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
        return res.status(500).json({ 
            error: 'TELEGRAM_BOT_TOKEN not set in Vercel Environment Variables',
            hint: 'Go to Vercel → your project → Settings → Environment Variables'
        });
    }

    if (!channel || !msgId) {
        return res.status(400).json({ error: 'channel and msgId required' });
    }

    try {
        // پێشتر chat_id بدۆزەرەوە بە ناوی کانەل
        let chatId = channel.startsWith('-') ? channel : `@${channel}`;

        // وەرگرتنی زانیاری مەسجەکە
        const msgRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    from_chat_id: chatId,
                    message_id: parseInt(msgId)
                })
            }
        );

        // ئەگەر forward نەکرد، getMessages تاقی بکەرەوە
        const fwdData = await msgRes.json();
        let fileId = null;

        if (fwdData.ok) {
            const msg = fwdData.result;
            if (msg.video) fileId = msg.video.file_id;
            else if (msg.document && msg.document.mime_type?.startsWith('video')) fileId = msg.document.file_id;
            else if (msg.animation) fileId = msg.animation.file_id;
        }

        if (!fileId) {
            // هەوڵی دووەم: getChatHistory
            return res.status(404).json({ 
                error: 'Video not found',
                hint: 'Make sure the bot is admin in the channel and the message contains a video'
            });
        }

        // وەرگرتنی لینکی داونلۆد
        const fileRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
        );
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return res.status(500).json({ error: 'Could not get file path', detail: fileData });
        }

        const filePath = fileData.result.file_path;
        const videoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        return res.status(200).json({ 
            videoUrl,
            fileSize: fileData.result.file_size
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
