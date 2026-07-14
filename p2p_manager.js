/**
 * METRO CASH P2P TRANSPORT LAYER (v2.2 Ultra Stable)
 * Оптимизировано для обхода любых NAT и стабильной связи через массив STUN серверов.
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = null;
        this.isServerConnected = false;
        this.reconnectAttempts = 0;
    }

    async init() {
        return new Promise((resolve) => {
            if (this.peer) this.peer.destroy();

            // Глобальный список STUN-серверов для максимального пробития NAT
            const iceConfig = {
                'iceServers': [
                    { 'urls': 'stun:stun.l.google.com:19302' },
                    { 'urls': 'stun:stun1.l.google.com:19302' },
                    { 'urls': 'stun:stun2.l.google.com:19302' },
                    { 'urls': 'stun:stun3.l.google.com:19302' },
                    { 'urls': 'stun:stun4.l.google.com:19302' },
                    { 'urls': 'stun:stun.l.google.com:19305' },
                    { 'urls': 'stun:stun.voipstunt.com' },
                    { 'urls': 'stun:stun.ekiga.net' },
                    { 'urls': 'stun:stun.ideasip.com' },
                    { 'urls': 'stun:stun.schlund.de' },
                    { 'urls': 'stun:stun.voxgratia.org' },
                    { 'urls': 'stun:stun.sipgate.net:10000' },
                    { 'urls': 'stun:stun.fwdnet.net' },
                    { 'urls': 'stun:stun.iptel.org' },
                    { 'urls': 'stun:stun.rixtelecom.se' },
                    { 'urls': 'stun:stun.wigwamjs.com' },
                    { 'urls': 'stun:iphone-stun.strato-iphone.de:3478' }
                ],
                'iceCandidatePoolSize': 10
            };

            this.peer = new Peer(null, {
                host: '0.peerjs.com',
                port: 443,
                secure: true,
                config: iceConfig,
                debug: 1,
                pingInterval: 2500, // Пинг сервера каждые 2.5 сек
                reliable: true
            });
            
            this.peer.on('open', (id) => {
                this.id = id;
                this.isServerConnected = true;
                this.reconnectAttempts = 0;
                console.log("METRO_NET: Станция готова. ID:", id);
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                console.log("METRO_NET: Входящий запрос.");
                if (this.conn) return c.close();
                this.conn = c;
                this.setupConn();
            });

            this.peer.on('disconnected', () => {
                this.isServerConnected = false;
                console.warn("METRO_NET: Потеря сигнала. Переподключение...");
                this.peer.reconnect();
            });

            this.peer.on('error', (err) => {
                this.handlePeerError(err);
            });
        });
    }

    handlePeerError(err) {
        console.error("METRO_NET_ERR:", err.type);
        
        if (err.type === 'peer-unavailable') {
            // Ошибка peer-unavailable обрабатывается в app.js через повторные попытки
            console.log("METRO_NET: Цель еще не в сети. Ожидание...");
            return;
        }

        let msg = "ОШИБКА СВЯЗИ";
        switch(err.type) {
            case 'network': msg = "СБОЙ СЕТИ"; break;
            case 'server-error': msg = "СЕРВЕР ПЕРЕГРУЖЕН"; break;
            case 'browser-incompatible': msg = "БРАУЗЕР УСТАРЕЛ"; break;
        }
        app.notify(msg, "error");
    }

    connect(targetId) {
        if (!this.isServerConnected) {
            setTimeout(() => this.connect(targetId), 1000);
            return;
        }
        
        if (this.conn && this.conn.open) return;

        console.log("METRO_NET: Стыковка с", targetId);
        this.conn = this.peer.connect(targetId, { 
            reliable: true,
            serialization: 'json'
        });
        
        this.setupConn();
    }

    setupConn() {
        this.conn.on('open', () => {
            console.log("METRO_NET: Туннель активен.");
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("ИГРОК ОТКЛЮЧИЛСЯ", "error");
            setTimeout(() => location.reload(), 2000);
        });

        this.conn.on('error', (err) => {
            console.error("METRO_NET_CONN_ERR:", err);
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }
}

const Network = new P2PManager();