// api/telegram.js — دابنێ لە: api/telegram.js لە GitHub

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { channel, msgId } = req.query;
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const DUMP  = process.env.TELEGRAM_DUMP_CHAT_ID;

    if (!TOKEN) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set in Vercel' });
    if (!DUMP)  return res.status(500).json({ error: 'TELEGRAM_DUMP_CHAT_ID not set in Vercel' });
    if (!channel || !msgId) return res.status(400).json({ error: 'channel and msgId required' });

    const tgApi = async (method, body) => {
        const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return r.json();
    };

    try {
        // Step 1: Forward from channel → dump group to get file_id
        const fwd = await tgApi('forwardMessage', {
            chat_id: DUMP,
            from_chat_id: `@${channel}`,
            message_id: parseInt(msgId)
        });

        if (!fwd.ok) {
            return res.status(400).json({
                error: `Forward failed: ${fwd.description}`,
                hint: 'Botەکەت ئەدمینی کانەلەکەیە؟ Dump group-ەکەت درووستە؟'
            });
        }

        // Step 2: Extract file_id from forwarded message
        const msg = fwd.result;
        const fileId =
            msg.video?.file_id ||
            (msg.document?.mime_type?.startsWith('video') ? msg.document.file_id : null) ||
            msg.animation?.file_id;

        if (!fileId) {
            return res.status(404).json({ error: 'هیچ ڤیدیۆیەک لەم مەسجەدا نییە' });
        }

        // Step 3: Get download path
        const fileInfo = await tgApi('getFile', { file_id: fileId });

        if (!fileInfo.ok) {
            // Telegram Bot API limit: files > 20MB can't be downloaded this way
            return res.status(413).json({
                error: 'فایلەکە زۆر گەورەیە (>20MB) — Bot API پشتگیری نایکات',
                hint: 'لینکی YouTube یان .mp4 ی ڕاستەوخۆ بەکاربهێنە بۆ فیلمە گەورەکان'
            });
        }

        return res.status(200).json({
            videoUrl: `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.result.file_path}`,
            fileSize: fileInfo.result.file_size
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
