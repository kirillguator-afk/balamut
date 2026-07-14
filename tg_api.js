/**
 * Модуль для связи с Telegram
 */
const TG_CONFIG = {
    botToken: '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A',
    channelId: '-1002287236531', // Примечание: В запросе указан ид -5458983067, но для каналов обычно префикс -100
    actualId: '-1005458983067'
};

const TelegramAPI = {
    async publishGame(peerId, bet) {
        const text = `🚇 *METRO CASH: НОВЫЙ СТОЛ*\n\n` +
                     `💰 Ставка: *${bet} ₽*\n` +
                     `🆔 ID комнаты: \`${peerId}\`\n\n` +
                     `🔗 [Присоединиться к игре](https://metro-cash.app/join/${peerId})`;
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TG_CONFIG.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CONFIG.channelId,
                    text: text,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "⚡️ ИГРАТЬ", url: `https://metro-cash.app/join/${peerId}` }
                        ]]
                    }
                })
            });
            return await response.json();
        } catch (e) {
            console.error('TG Publish Error:', e);
            return null;
        }
    }
};