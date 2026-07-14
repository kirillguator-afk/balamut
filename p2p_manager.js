/**
 * Исправленный P2P Менеджер с улучшенной обработкой ошибок
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = null;
        this.retryCount = 0;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // Удаляем старые экземпляры если есть
            if (this.peer) this.peer.destroy();

            this.peer = new Peer(null, {
                debug: 2, // Повышаем уровень дебага для отлова ошибок
                config: {
                    'iceServers': [
                        { 'urls': 'stun:stun.l.google.com:19302' },
                        { 'urls': 'stun:stun1.l.google.com:19302' },
                        { 'urls': 'stun:stun2.l.google.com:19302' },
                        { 'urls': 'stun:stun3.l.google.com:19302' },
                        { 'urls': 'stun:stun4.l.google.com:19302' }
                    ]
                }
            });
            
            this.peer.on('open', (id) => {
                this.id = id;
                console.log("PeerJS: Туннель открыт. ID:", id);
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                console.log("PeerJS: Входящее соединение...");
                if (this.conn) {
                    console.log("PeerJS: Соединение уже активно, отклоняем.");
                    return c.close();
                }
                this.conn = c;
                this.setupConn();
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Critical Error:", err.type);
                let errorMsg = "ОШИБКА СЕТИ";
                
                switch(err.type) {
                    case 'browser-incompatible':
                        errorMsg = "БРАУЗЕР НЕ ПОДДЕРЖИВАЕТ WebRTC";
                        break;
                    case 'network':
                        errorMsg = "НЕТ ДОСТУПА К СЕРВЕРУ PeerJS";
                        break;
                    case 'unavailable-id':
                        errorMsg = "ID УЖЕ ЗАНЯТ";
                        break;
                    case 'peer-not-found':
                        errorMsg = "СТАНЦИЯ НЕ НАЙДЕНА";
                        break;
                    case 'server-error':
                        errorMsg = "ОШИБКА СЕРВЕРА (ПОВТОР...)";
                        this.reconnect();
                        break;
                }
                
                app.notify(errorMsg, "error");
                document.getElementById('peer-status').innerText = errorMsg;
                document.getElementById('peer-status').className = "text-[8px] text-red-500 font-mono tracking-tighter";
            });

            // Тайм-аут инициализации
            setTimeout(() => {
                if (!this.id) reject("Initialization timeout");
            }, 10000);
        });
    }

    reconnect() {
        if (this.retryCount < 3) {
            this.retryCount++;
            setTimeout(() => this.init(), 3000);
        }
    }

    connect(targetId) {
        if (this.conn) return;
        console.log("PeerJS: Подключение к", targetId);
        this.conn = this.peer.connect(targetId, { 
            reliable: true,
            connectionPriority: 1
        });
        this.setupConn();
    }

    setupConn() {
        this.conn.on('open', () => {
            console.log("PeerJS: Соединение установлено!");
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            console.log("PeerJS: Соединение закрыто.");
            app.notify("РАЗРЫВ ТУННЕЛЯ", "error");
            setTimeout(() => location.reload(), 1500);
        });

        this.conn.on('error', (err) => {
            console.error("Connection Error:", err);
            app.notify("ОШИБКА ТУННЕЛЯ", "error");
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        } else {
            console.warn("Attempted to send data while connection is closed.");
        }
    }
}

const Network = new P2PManager();