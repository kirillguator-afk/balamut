/**
 * METRO P2P - Network Manager (v2.3)
 */
const p2p = {
    peer: null,
    conn: null,
    myId: null,
    isHost: false,
    pingInterval: null,

    init() {
        const config = {
            'iceServers': [
                { 'urls': 'stun:stun.l.google.com:19302' },
                { 'urls': 'stun:stun1.l.google.com:19302' },
                { 'urls': 'stun:stun2.l.google.com:19302' },
                { 'urls': 'stun:stun3.l.google.com:19302' },
                { 'urls': 'stun:stun4.l.google.com:19302' },
                { 'urls': 'stun:stun.l.google.com:19305' },
                { 'urls': 'stun:openrelay.metered.ca:80' },
                { 'urls': 'stun:stun.anyfirewall.com:3478' }
            ]
        };

        this.peer = new Peer(null, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            config: config,
            debug: 1
        });

        this.peer.on('open', (id) => {
            this.myId = id;
            document.getElementById('peer-status').innerText = `ID: ${id.substring(0,8).toUpperCase()}`;
            document.getElementById('peer-status').className = "text-[8px] text-emerald-500 font-mono uppercase font-bold tracking-tighter";
            
            // Check if we have hash to join
            const hashId = window.location.hash.substring(1);
            if (hashId && hashId.length > 5) this.connect(hashId);
        });

        this.peer.on('connection', (c) => {
            if (this.conn) return c.close();
            this.conn = c;
            this.setupEvents();
        });

        this.peer.on('error', (err) => {
            console.error("PEER_ERR:", err.type);
            if (err.type === 'peer-not-found') app.notify("ЛИНИЯ НЕ НАЙДЕНА", "error");
        });
    },

    connect(targetId) {
        if (this.conn) return;
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.setupEvents();
    },

    setupEvents() {
        this.conn.on('open', () => {
            app.notify("СОЕДИНЕНИЕ УСТАНОВЛЕНО", "success");
            this.startHeartbeat();
            window.dispatchEvent(new CustomEvent('metro_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('metro_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("РАЗРЫВ ЛИНИИ", "error");
            this.stopHeartbeat();
            setTimeout(() => location.reload(), 2000);
        });
    },

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    },

    startHeartbeat() {
        this.pingInterval = setInterval(() => this.send('PING', Date.now()), 4000);
    },

    stopHeartbeat() {
        clearInterval(this.pingInterval);
    }
};