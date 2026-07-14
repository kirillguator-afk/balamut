/**
 * Telegram API Config for METRO CASH
 */
const TG_BOT_TOKEN = '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A';
const TG_CHAT_ID = '-1002446704179'; 

const TelegramAPI = {
    async publishGame(peerId, bet) {
        // Формируем ссылку на текущий хост
        const gameUrl = `${window.location.origin}${window.location.pathname}#${peerId}`;
        
        const message = `🚇 *METRO CASH: НОВЫЙ ВЫЗОВ*\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `💰 СТАВКА: *${bet} RUB*\n` +
                        `🆔 СТАНЦИЯ: \`${peerId.substring(0,8)}\`\n` +
                        `👤 СТАТУС: ОЖИДАНИЕ ИГРОКА\n\n` +
                        `[⚡️ ПРИНЯТЬ ВЫЗОВ И ИГРАТЬ](${gameUrl})`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "🕹 ИГРАТЬ", url: gameUrl }
                        ]]
                    }
                })
            });
            return await response.json();
        } catch (e) {
            console.error("TG API Error:", e);
        }
    }
};