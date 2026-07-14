/**
 * P2P Менеджер для METRO CASH
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
                config: {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]}
            });
            
            this.peer.on('open', (id) => {
                this.id = id;
                this.updateStatus(true);
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                if (this.conn) {
                    c.close();
                    return;
                }
                this.conn = c;
                this.bindEvents();
            });

            this.peer.on('error', (err) => {
                console.error("Peer Error:", err);
                if (err.type === 'peer-not-found') {
                    app.notify("Станция не найдена", "error");
                }
            });
        });
    }

    connect(targetId) {
        if (this.conn) return;
        this.conn = this.peer.connect(targetId);
        this.bindEvents();
    }

    bindEvents() {
        this.conn.on('open', () => {
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            app.notify("Связь с туннелем потеряна", "error");
            setTimeout(() => location.reload(), 2000);
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }

    updateStatus(online) {
        const el = document.getElementById('peer-status');
        if (online) {
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE: ${this.id.substring(0,6)}`;
            el.className = "text-[9px] font-mono text-green-500 uppercase flex items-center gap-1";
        }
    }
}

const Network = new P2PManager();