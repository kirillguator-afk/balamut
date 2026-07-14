/**
 * Telegram API Config for METRO CASH
 */
const TG_BOT_TOKEN = '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A';
const TG_CHAT_ID = '-1005458983067'; // Исправленный ID с префиксом -100

const TelegramAPI = {
    async publishGame(peerId, bet) {
        // Формируем надежную ссылку. Если открыто локально, используем заглушку для теста.
        const baseUrl = window.location.origin === "null" ? "https://metro-cash.app" : window.location.origin + window.location.pathname;
        const gameUrl = `${baseUrl}#${peerId}`;
        
        // Используем HTML парсинг вместо Markdown, так как он менее чувствителен к спецсимволам
        const message = `<b>🔴 НОВАЯ ЛИНИЯ: METRO CASH</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `💰 Ставка: <b>${bet} RUB</b>\n` +
                        `🆔 Станция: <code>${peerId.toUpperCase()}</code>\n` +
                        `⚔️ Режим: <b>Дурак Онлайн (1x1)</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `<i>Нажми кнопку ниже, чтобы войти в игру</i>`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { 
                                    text: "🚀 ПРИНЯТЬ ВЫЗОВ", 
                                    url: gameUrl 
                                }
                            ]
                        ]
                    }
                })
            });
            
            const result = await response.json();
            
            if (!result.ok) {
                console.error("TG API Error Details:", result);
                // Если ошибка "chat not found", значит бот не администратор или ID неверный
                alert("Ошибка Telegram: " + result.description);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Network Error when calling Telegram:", e);
            return false;
        }
    }
};