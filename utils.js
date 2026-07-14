/**
 * METRO UTILS - Audio & Visual Enhancements
 */
const utils = {
    audioCtx: null,

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    getSuitIcon(suit) {
        return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit];
    },

    playSound(type) {
        try {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            const now = this.audioCtx.currentTime;

            if (type === 'card') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(); osc.stop(now + 0.1);
            }
            if (type === 'bet') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(); osc.stop(now + 0.05);
            }
        } catch(e) {}
    },

    spawnCoins() {
        const canvas = document.getElementById('coin-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const coins = Array.from({length: 40}, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 100,
            r: 6 + Math.random() * 8,
            vy: 4 + Math.random() * 6,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.2
        }));

        const anim = () => {
            ctx.clearRect(0,0, canvas.width, canvas.height);
            let active = false;
            coins.forEach(c => {
                if (c.y < canvas.height + 20) {
                    active = true;
                    c.y += c.vy;
                    c.rot += c.vr;
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rot);
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, c.r, c.r * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#92400e';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                }
            });
            if (active) requestAnimationFrame(anim);
        };
        anim();
    }
};