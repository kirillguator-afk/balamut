/**
 * Улучшенный менеджер соединений
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
            // Создаем Peer без фиксированного ID для случайного назначения
            this.peer = new Peer(null, { debug: 1 });
            
            this.peer.on('open', (id) => {
                this.id = id;
                console.log("My Peer ID:", id);
                this.updateUI(true);
                resolve(id);
            });

            this.peer.on('connection', (c) => {
                this.conn = c;
                this.isHost = true;
                this.handleEvents();
            });

            this.peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                if(err.type === 'peer-not-found') alert("Станция не найдена. Возможно, игрок отключился.");
            });
        });
    }

    connect(targetId) {
        console.log("Connecting to:", targetId);
        this.conn = this.peer.connect(targetId);
        this.isHost = false;
        this.handleEvents();
    }

    handleEvents() {
        this.conn.on('open', () => {
            console.log("Connected to peer!");
            window.dispatchEvent(new CustomEvent('game_start'));
        });

        this.conn.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('game_data', { detail: data }));
        });

        this.conn.on('close', () => {
            alert("Связь потеряна");
            location.reload();
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }

    updateUI(online) {
        const el = document.getElementById('peer-status');
        if (online) {
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500 block"></span> ONLINE: ${this.id.slice(0,6)}`;
            el.className = "text-[9px] font-['Share_Tech_Mono'] text-green-500 uppercase flex items-center gap-1";
        }
    }
}

const Network = new P2PManager();