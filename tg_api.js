/**
 * Telegram API Wrapper
 */
const TG_TOKEN = '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A';
const TG_CHAT = '-1005458983067'; // Используем формат -100... для публичных каналов

const TelegramAPI = {
    async publishGame(peerId, bet) {
        const message = `🚇 *METRO CASH: СИГНАЛ ОБНАРУЖЕН*\n\n` +
                        `💰 СТАВКА: *${bet} RUB*\n` +
                        `🔌 СТАНЦИЯ ID: \`${peerId}\`\n\n` +
                        `🎮 [ПОДКЛЮЧИТЬСЯ К ЭФИРУ](https://metro-cash.app/#${peerId})`;

        try {
            await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "⚡️ ПРИНЯТЬ ВЫЗОВ", url: `https://metro-cash.app/#${peerId}` }
                        ]]
                    }
                })
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
};