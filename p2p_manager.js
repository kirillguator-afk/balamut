/**
 * P2P Менеджер для METRO CASH
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.id = null;
        this.isHost = false;
    }

    async init() {
        return new Promise((resolve) => {
            this.peer = new Peer(null, { debug: 1 });
            
            this.peer.on('open', (id) => {
                this.id = id;
                this.updateStatus(true);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.connection = conn;
                this.isHost = true;
                this.setupEvents();
            });
        });
    }

    connect(targetId) {
        this.connection = this.peer.connect(targetId);
        this.isHost = false;
        this.setupEvents();
    }

    setupEvents() {
        this.connection.on('open', () => {
            console.log("P2P Tunnel Established");
            window.dispatchEvent(new CustomEvent('p2p_connected'));
        });

        this.connection.on('data', (data) => {
            window.dispatchEvent(new CustomEvent('p2p_data', { detail: data }));
        });

        this.connection.on('close', () => {
            this.updateStatus(false);
            alert("Связь разорвана. Игрок покинул станцию.");
            location.reload();
        });
    }

    send(type, payload) {
        if (this.connection && this.connection.open) {
            this.connection.send({ type, payload });
        }
    }

    updateStatus(online) {
        const el = document.getElementById('peer-status');
        if (online) {
            el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-500 block"></span> ONLINE: ${this.id.substring(0,6)}`;
            el.classList.replace('text-zinc-500', 'text-green-500/80');
        }
    }
}

const Network = new P2PManager();