export class MeditationUI {
  constructor(onToggle) {
    this.meditating = false;
    this.onToggle = onToggle;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #medBtn {
        position: fixed; right: max(24px, env(safe-area-inset-right));
        bottom: max(24px, env(safe-area-inset-bottom));
        padding: 16px 26px; border: none; border-radius: 28px;
        background: rgba(30,30,30,0.7); color: #fff;
        font-size: 17px; font-family: sans-serif;
        display: block; z-index: 20; backdrop-filter: blur(4px);
        touch-action: manipulation; min-height: 52px;
      }
      #medOverlay {
        position: fixed; inset: 0; display: none; z-index: 15;
        background: radial-gradient(circle at center, transparent 30%, rgba(10,12,18,0.55) 100%);
        pointer-events: none;
      }
      #medRing {
        position: absolute; left: 50%; top: 40%;
        width: min(38vw, 160px); height: min(38vw, 160px);
        transform: translate(-50%, -50%);
        border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);
        animation: breathe 8s ease-in-out infinite;
      }
      #medText {
        position: absolute; left: 50%; top: 40%; transform: translate(-50%, min(19vw, 80px));
        color: rgba(255,255,255,0.9); font-family: sans-serif; font-size: clamp(16px, 4.5vw, 22px);
        letter-spacing: 3px;
      }
      @keyframes breathe {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
        50% { transform: translate(-50%, -50%) scale(1.35); opacity: 0.9; }
      }
    `;
    document.head.appendChild(styleEl);

    this.btn = document.createElement('button');
    this.btn.id = 'medBtn';
    this.btn.textContent = '🧘 Meditate';
    this.btn.onclick = () => this.toggle();
    document.body.appendChild(this.btn);

    this.overlay = document.createElement('div');
    this.overlay.id = 'medOverlay';
    this.overlay.innerHTML = '<div id="medRing"></div><div id="medText">breathe</div>';
    document.body.appendChild(this.overlay);
    this.text = this.overlay.querySelector('#medText');
  }

  toggle() {
    this.meditating ? this.stop() : this.start();
  }

  start() {
    this.meditating = true;
    this.btn.textContent = '🧍 Stand up';
    this.overlay.style.display = 'block';
  }

  stop() {
    this.meditating = false;
    this.btn.textContent = '🧘 Meditate';
    this.overlay.style.display = 'none';
    this.setVisible(this.insideHouse);
  }

  setVisible(visible) {
    this.insideHouse = visible;
    this.btn.style.display = visible || this.meditating ? 'block' : 'none';
  }

  updateBreathText(time) {
    const cycle = (time % 8) / 8;
    this.text.textContent =
      cycle < 0.4 ? 'breathe in' : cycle < 0.5 ? 'hold' : cycle < 0.9 ? 'breathe out' : 'hold';
  }
}
