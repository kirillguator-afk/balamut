const TG_CONFIG = {
    token: '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A',
    chat: '-1005458983067'
};

const TelegramAPI = {
    async publishGame(id, bet) {
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        const text = `🚇 *METRO CASH: НОВЫЙ ВЫЗОВ*\n\n💰 СТАВКА: *${bet} RUB*\n📍 СТАНЦИЯ: \`${id}\`\n\n[⚡️ ВОЙТИ В ВАГОН](${url})`;
        
        try {
            await fetch(`https://api.telegram.org/bot${TG_CONFIG.token}/sendMessage`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    chat_id: TG_CONFIG.chat,
                    text: text,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: "ИГРАТЬ", url: url }]]
                    }
                })
            });
        } catch(e) { console.error("TG Error:", e); }
    }
};