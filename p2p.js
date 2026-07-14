/**
 * P2P Менеджер на базе PeerJS
 */
class P2PManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.myId = null;
        this.onMessageCallback = null;
    }

    init(id = null) {
        return new Promise((resolve) => {
            this.peer = new Peer(id, {
                debug: 2
            });

            this.peer.on('open', (id) => {
                this.myId = id;
                document.getElementById('peer-status').innerHTML = `
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="text-zinc-300 uppercase">Online: ${id.slice(0, 4)}</span>
                `;
                resolve(id);
            });

            this.peer.on('connection', (connection) => {
                this.conn = connection;
                this.setupConnection();
                if (window.onOpponentJoined) window.onOpponentJoined();
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Error:', err);
            });
        });
    }

    connect(targetId) {
        this.conn = this.peer.connect(targetId);
        this.setupConnection();
    }

    setupConnection() {
        this.conn.on('open', () => {
            console.log('Connected to:', this.conn.peer);
            if (window.onGameStart) window.onGameStart();
        });

        this.conn.on('data', (data) => {
            console.log('Received P2P Data:', data);
            if (this.onMessageCallback) this.onMessageCallback(data);
        });
    }

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }
}

const P2P = new P2PManager();