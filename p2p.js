/**
 * METRO P2P - Secure WebRTC Manager (v2.6 Stable)
 */
const p2p = {
    peer: null,
    conn: null,
    myId: null,
    isHost: false,
    
    iceConfig: {
        'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
            { 'urls': 'stun:stun2.l.google.com:19302' },
            { 'urls': 'stun:stun3.l.google.com:19302' },
            { 'urls': 'stun:stun4.l.google.com:19302' },
            { 'urls': 'stun:openrelay.metered.ca:80' }
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
            console.error("P2P Error:", err.type);
            if (err.type === 'peer-not-found') app.notify("Линия недоступна", "error");
        });

        this.peer.on('disconnected', () => this.peer.reconnect());
    },

    connect(targetId) {
        if (this.conn) return;
        app.notify("Попытка стыковки...", "info");
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.isHost = false;
        this.bindEvents();
    },

    bindEvents() {
        this.conn.on('open', () => {
            app.notify("Туннель активен", "success");
            app.haptic('impact', 'medium');
            if (this.isHost) {
                // Если хост - он ждет создания игры через UI
            }
        });

        this.conn.on('data', (data) => {
            if (data.type === 'PING') return this.send('PONG');
            window.dispatchEvent(new CustomEvent('metro_p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("Туннель разорван", "error");
            setTimeout(() => location.reload(), 2000);
        });
    },

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    },

    updateStatus(text, ok) {
        const el = document.getElementById('peer-status');
        if (el) {
            el.innerText = text;
            el.className = `text-[8px] font-mono font-bold uppercase tracking-tighter ${ok ? 'text-emerald-500' : 'text-red-500'}`;
        }
    }
};