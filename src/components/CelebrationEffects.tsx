import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRotation: number;
  color: string;
  size: number;
  lifetime: number;
  type: 'confetti' | 'petal';
}

interface CelebrationEffectsProps {
  isBonus: boolean;
  x: number;
  y: number;
}

const CelebrationEffects: React.FC<CelebrationEffectsProps> = ({ isBonus, x, y }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const colors = isBonus 
      ? ['#FFB7C5', '#FF69B4', '#FFE4E1', '#FFC0CB'] // Pink shades for flower petals
      : ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3']; // Bright colors for confetti

    for (let i = 0; i < (isBonus ? 30 : 50); i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 8 + Math.random() * 6;
      
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 10,
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isBonus ? 15 : 8,
        lifetime: 1,
        type: isBonus ? 'petal' : 'confetti'
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current = particles.current.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.5; // Gravity
        particle.rotation += particle.vRotation;
        particle.lifetime -= 0.02;

        if (particle.lifetime <= 0) return false;

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.lifetime;

        if (particle.type === 'petal') {
          // Draw petal shape
          ctx.beginPath();
          ctx.fillStyle = particle.color;
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(
            particle.size / 2, -particle.size / 2,
            particle.size, -particle.size / 4,
            particle.size, 0
          );
          ctx.bezierCurveTo(
            particle.size, particle.size / 4,
            particle.size / 2, particle.size / 2,
            0, 0
          );
          ctx.fill();
        } else {
          // Draw confetti rectangle
          ctx.fillStyle = particle.color;
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 4,
            particle.size,
            particle.size / 2
          );
        }

        ctx.restore();
        return true;
      });

      if (particles.current.length > 0) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isBonus, x, y]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default CelebrationEffects;