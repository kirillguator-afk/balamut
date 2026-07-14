/**
 * P2P Менеджер для METRO CASH
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = null;
        this.isHost = false;
    }

    async init() {
        return new Promise((resolve) => {
            // Создаем Peer со случайным ID
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
                this.conn = c;
                this.isHost = true;
                this.bindEvents();
            });

            this.peer.on('error', (err) => {
                console.error("Peer Error:", err.type);
                if (err.type === 'peer-not-found') alert("Станция не найдена. Возможно, игра уже завершена.");
            });
        });
    }

    connect(targetId) {
        console.log("Connecting to station:", targetId);
        this.conn = this.peer.connect(targetId);
        this.isHost = false;
        this.bindEvents();
    }

    bindEvents() {
        this.conn.on('open', () => {
            console.log("P2P Tunnel Open");
            window.dispatchEvent(new CustomEvent('p2p_ready'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.conn.on('close', () => {
            alert("Потеря связи с оппонентом.");
            location.reload();
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
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500 block"></span> ONLINE: ${this.id.substring(0,6)}`;
            el.className = "text-[9px] font-['Share_Tech_Mono'] text-green-500 uppercase flex items-center gap-1";
        }
    }
}

const Network = new P2PManager();