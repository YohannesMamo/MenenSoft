interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
}

interface Particle {
  x: number;
  y: number;
  angle: number;
  power: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

let confettiCanvas: HTMLCanvasElement | null = null;

function ensureCanvas(): HTMLCanvasElement | null {
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '9999';
    document.body.appendChild(confettiCanvas);
  }
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  return confettiCanvas;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function confetti(opts: ConfettiOptions = {}): void {
  const { particleCount = 100, spread = 70, origin = {} } = opts;
  const ctx = ensureCanvas()?.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cx = (origin.x ?? 0.5) * window.innerWidth * dpr;
  const cy = (origin.y ?? 0.5) * window.innerHeight * dpr;
  const colors = ['#10b981', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444', '#ffffff'];
  const startAngle = (Math.PI / 180) * (90 - spread / 2);
  const endAngle = (Math.PI / 180) * (90 + spread / 2);

  const particles: Particle[] = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = randomRange(startAngle, endAngle);
    const power = randomRange(6, 16);
    particles.push({
      x: cx,
      y: cy,
      angle,
      power,
      size: randomRange(3, 7) * dpr,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI,
      rotSpeed: randomRange(-0.2, 0.2)
    });
  }

  const gravity = 0.12 * dpr;
  const friction = 0.985;
  let frame = 0;
  const maxFrames = 120;

  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
    for (const p of particles) {
      p.x += Math.cos(p.angle) * p.power * dpr;
      p.y += Math.sin(p.angle) * p.power * dpr;
      p.power *= friction;
      p.power = Math.max(p.power, 0.001);
      p.y += gravity;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.rect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.fill();
      ctx.restore();
    }
    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
    }
  };

  requestAnimationFrame(tick);
}

export default confetti;