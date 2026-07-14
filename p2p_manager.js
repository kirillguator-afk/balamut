/**
 * Глобально настроенный P2P Менеджер для METRO CASH
 * Оптимизирован для обхода NAT и стабильной связи через STUN Google
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = null;
        this.isServerConnected = false;
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (this.peer) this.peer.destroy();

            // Конфигурация с расширенными STUN серверами
            const config = {
                'iceServers': [
                    { 'urls': 'stun:stun.l.google.com:19302' },
                    { 'urls': 'stun:stun1.l.google.com:19302' },
                    { 'urls': 'stun:stun2.l.google.com:19302' },
                    { 'urls': 'stun:stun3.l.google.com:19302' },
                    { 'urls': 'stun:stun4.l.google.com:19302' },
                    { 'urls': 'stun:stun.voipstunt.com' },
                    { 'urls': 'stun:stun.ekiga.net' },
                    { 'urls': 'stun:stun.ideasip.com' },
                    { 'urls': 'stun:stun.schlund.de' }
                ],
                'sdpSemantics': 'unified-plan'
            };

            this.peer = new Peer(null, {
                host: '0.peerjs.com', // Явно указываем надежный хост
                port: 443,
                secure: true,
                config: config,
                debug: 1,
                pingInterval: 3000 // Частое пингование для поддержания туннеля
            });
            
            this.peer.on('open', (id) => {
                this.id = id;
                this.isServerConnected = true;
                console.log("METRO_P2P: Станция зарегистрирована. ID:", id);
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                console.log("METRO_P2P: Входящий запрос на стыковку...");
                if (this.conn) {
                    console.warn("METRO_P2P: Линия занята, сброс.");
                    return c.close();
                }
                this.conn = c;
                this.setupConn();
            });

            this.peer.on('disconnected', () => {
                this.isServerConnected = false;
                console.warn("METRO_P2P: Потеряна связь с сигнальным сервером. Переподключение...");
                this.peer.reconnect();
            });

            this.peer.on('error', (err) => {
                console.error("METRO_P2P Critical Error:", err.type);
                this.handlePeerError(err);
            });
        });
    }

    handlePeerError(err) {
        let msg = "ОШИБКА СВЯЗИ";
        switch(err.type) {
            case 'peer-not-found': msg = "СТАНЦИЯ НЕ НАЙДЕНА (OFFLINE)"; break;
            case 'unavailable-id': msg = "ID ЗАНЯТ ДРУГИМ ИГРОКОМ"; break;
            case 'network': msg = "ПРОБЛЕМА С ИНТЕРНЕТОМ"; break;
            case 'server-error': msg = "СЕРВЕР PEERJS НЕДОСТУПЕН"; break;
        }
        app.notify(msg, "error");
        if (document.getElementById('peer-status')) {
            document.getElementById('peer-status').innerText = msg;
            document.getElementById('peer-status').style.color = '#ef4444';
        }
    }

    connect(targetId) {
        // Защита: не подключаемся, пока сами не в сети
        if (!this.isServerConnected) {
            console.log("METRO_P2P: Ожидание регистрации перед вызовом...");
            setTimeout(() => this.connect(targetId), 1000);
            return;
        }

        if (this.conn) return;

        console.log("METRO_P2P: Попытка стыковки с", targetId);
        this.conn = this.peer.connect(targetId, { 
            reliable: true,
            metadata: { version: '2.1' }
        });
        
        this.setupConn();
    }

    setupConn() {
        this.conn.on('open', () => {
            console.log("METRO_P2P: Туннель стабилен. Данные синхронизированы.");
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            console.warn("METRO_P2P: Туннель закрыт.");
            app.notify("ИГРОК ПОКИНУЛ СТАНЦИЮ", "error");
            setTimeout(() => location.reload(), 2000);
        });

        this.conn.on('error', (err) => {
            console.error("METRO_P2P Connection Error:", err);
            app.notify("ОШИБКА ТУННЕЛИРОВАНИЯ", "error");
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }
}

const Network = new P2PManager();