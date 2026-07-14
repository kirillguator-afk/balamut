/**
 * METRO P2P - Secure WebRTC Manager (v2.5)
 */
const p2p = {
    peer: null,
    conn: null,
    myId: null,
    isHost: false,
    
    // Множество STUN серверов для гарантированного соединения
    iceConfig: {
        'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
            { 'urls': 'stun:stun2.l.google.com:19302' },
            { 'urls': 'stun:stun3.l.google.com:19302' },
            { 'urls': 'stun:stun4.l.google.com:19302' },
            { 'urls': 'stun:stun.l.google.com:19305' },
            { 'urls': 'stun:openrelay.metered.ca:80' },
            { 'urls': 'stun:stun.relay.metered.ca:80' }
        ]
    },

    init() {
        this.peer = new Peer(null, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            config: this.iceConfig,
            debug: 1
        });

        this.peer.on('open', (id) => {
            this.myId = id;
            this.updateStatus(`ID: ${id.substring(0,8).toUpperCase()}`, true);
            
            const hash = window.location.hash.substring(1);
            if (hash && hash.length > 5) this.connect(hash);
        });

        this.peer.on('connection', (c) => {
            if (this.conn) return c.close();
            this.isHost = true;
            this.conn = c;
            this.bindEvents();
        });

        this.peer.on('error', (err) => {
            app.notify(`Ошибка сети: ${err.type}`, "error");
            this.updateStatus("NETWORK_ERROR", false);
        });
    },

    connect(targetId) {
        if (this.conn) return;
        app.notify("Стыковка с туннелем...", "info");
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.isHost = false;
        this.bindEvents();
    },

    bindEvents() {
        this.conn.on('open', () => {
            app.notify("Туннель активен", "success");
            app.haptic('impact', 'medium');
            
            // Если мы зашли по ссылке - переключаемся в режим игры
            if (!this.isHost) {
                // Ждем инициализации от хоста
            }
        });

        this.conn.on('data', (data) => {
            // Heartbeat check
            if (data.type === 'PING') return this.send('PONG');
            
            // Dispatch to specific game engine
            window.dispatchEvent(new CustomEvent('metro_p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("Туннель разорван", "error");
            setTimeout(() => location.reload(), 2000);
        });
    },

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload, from: this.myId });
        }
    },

    updateStatus(text, ok) {
        const el = document.getElementById('peer-status');
        el.innerText = text;
        el.className = `text-[8px] font-mono font-bold uppercase tracking-tighter ${ok ? 'text-emerald-500' : 'text-red-500'}`;
    }
};