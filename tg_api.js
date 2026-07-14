/**
 * Telegram API Config
 */
const TG_BOT_TOKEN = '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A';
const TG_CHAT_ID = '-1005458983067'; // ID канала с префиксом для API

const TelegramAPI = {
    async publishGame(peerId, bet) {
        // Формируем ссылку на текущий домен с ID комнаты
        const gameUrl = `${window.location.origin}${window.location.pathname}#${peerId}`;
        
        const message = `🚇 *METRO CASH: НОВЫЙ ВЫЗОВ*\n\n` +
                        `💰 СТАВКА: *${bet} RUB*\n` +
                        `📍 СТАНЦИЯ ID: \`${peerId}\`\n\n` +
                        `[⚡️ ПОДКЛЮЧИТЬСЯ К ИГРЕ](${gameUrl})`;

        try {
            await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "ИГРАТЬ", url: gameUrl }
                        ]]
                    }
                })
            });
            console.log("TG Published");
        } catch (e) {
            console.error("TG API Error:", e);
        }
    }
};