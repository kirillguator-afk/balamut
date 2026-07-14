/**
 * Telegram API Config for METRO CASH
 * Данные обновлены по запросу пользователя
 */
const TG_BOT_TOKEN = '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A';
const TG_CHAT_ID = '-1005458983067'; // Добавлен префикс -100 для корректной работы с каналами

const TelegramAPI = {
    /**
     * Публикует оффер в канал с кнопкой перехода в игру
     */
    async publishGame(peerId, bet) {
        // Базовая ссылка на приложение (определяется автоматически)
        const baseUrl = window.location.origin + window.location.pathname;
        const gameUrl = `${baseUrl}#${peerId}`;
        
        const message = `🔴 **НОВАЯ ЛИНИЯ: METRO CASH**\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `💰 Ставка: \`${bet} RUB\`\n` +
                        `🆔 Станция: \`${peerId.substring(0, 8).toUpperCase()}\`\n` +
                        `⚔️ Режим: \`Дурак Онлайн (1x1)\`\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `Жми кнопку ниже, чтобы зайти на стол!`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { 
                                    text: "🚀 ПРИНЯТЬ ВЫЗОВ", 
                                    url: gameUrl 
                                }
                            ],
                            [
                                { 
                                    text: "📢 ПЕРЕЙТИ В КАНАЛ", 
                                    url: "https://t.me/c/5458983067" 
                                }
                            ]
                        ]
                    }
                })
            });
            
            const result = await response.json();
            if (!result.ok) {
                console.error("TG API Error:", result.description);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Critical TG API Error:", e);
            return false;
        }
    }
};