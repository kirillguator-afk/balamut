/**
 * Надежный P2P Менеджер
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = null;
    }

    async init() {
        return new Promise((resolve) => {
            this.peer = new Peer(null, {
                debug: 1,
                config: {'iceServers': [
                    { 'urls': 'stun:stun.l.google.com:19302' },
                    { 'urls': 'stun:stun1.l.google.com:19302' }
                ]}
            });
            
            this.peer.on('open', (id) => {
                this.id = id;
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                if (this.conn) return c.close();
                this.conn = c;
                this.setupConn();
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err.type);
                app.notify(`ОШИБКА СЕТИ: ${err.type}`, "error");
            });
        });
    }

    connect(targetId) {
        if (this.conn) return;
        this.conn = this.peer.connect(targetId, { reliable: true });
        this.setupConn();
    }

    setupConn() {
        this.conn.on('open', () => {
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("РАЗРЫВ ТУННЕЛЯ", "error");
            setTimeout(() => location.reload(), 1500);
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }
}

const Network = new P2PManager();