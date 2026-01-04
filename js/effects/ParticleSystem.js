/**
 * Particle class for visual effects
 */
class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 10;
        this.vy = options.vy || (Math.random() - 0.5) * 10;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.size = options.size || 5;
        this.color = options.color || '#ffffff';
        this.decay = options.decay || 0.02;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.shape = options.shape || 'circle'; // circle, square, star
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
    }
    
    render(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = this.size * (0.5 + alpha * 0.5);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'square') {
            ctx.fillRect(-size, -size, size * 2, size * 2);
        } else if (this.shape === 'star') {
            this.drawStar(ctx, 0, 0, 5, size, size / 2);
        }
        
        ctx.restore();
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

/**
 * Particle System for managing all particles
 */
export class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    /**
     * Add a single particle
     */
    addParticle(x, y, options) {
        this.particles.push(new Particle(x, y, options));
    }
    
    /**
     * Create burst effect (explosion, impact)
     */
    burst(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = (options.speed || 5) * (0.5 + Math.random() * 0.5);
            
            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                ...options
            });
        }
    }
    
    /**
     * Create directional burst (dash trail, impact direction)
     */
    directionalBurst(x, y, angle, count, options = {}) {
        const spread = options.spread || 0.5;
        
        for (let i = 0; i < count; i++) {
            const particleAngle = angle + (Math.random() - 0.5) * spread;
            const speed = (options.speed || 5) * (0.5 + Math.random() * 0.5);
            
            this.addParticle(x, y, {
                vx: Math.cos(particleAngle) * speed,
                vy: Math.sin(particleAngle) * speed,
                ...options
            });
        }
    }
    
    /**
     * Create trail particles
     */
    trail(x, y, options = {}) {
        this.addParticle(x, y, {
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 0.5,
            decay: 0.03,
            size: 3,
            ...options
        });
    }
    
    /**
     * Create spark effect
     */
    sparks(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            
            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.3,
                decay: 0.02,
                size: 2 + Math.random() * 3,
                shape: 'circle',
                gravity: 0.1,
                ...options
            });
        }
    }
    
    /**
     * Create elimination explosion - tuned for clarity
     */
    elimination(x, y, color) {
        // Main burst - reduced count for clarity
        this.burst(x, y, 24, {
            color: color,
            size: 8,
            speed: 10,
            life: 1.0,
            decay: 0.018,
            shape: 'circle'
        });
        
        // Bright white core
        this.burst(x, y, 10, {
            color: '#ffffff',
            size: 6,
            speed: 5,
            life: 0.4,
            decay: 0.04
        });
        
        // Sparkles - reduced
        this.sparks(x, y, 15, {
            color: '#ffffff',
            size: 4
        });
        
        // Single expanding ring
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            this.addParticle(x, y, {
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                color: color,
                size: 6,
                life: 0.6,
                decay: 0.02,
                friction: 0.94
            });
        }
    }
    
    /**
     * Create collision impact effect - tuned for clarity
     */
    collision(x, y, color1, color2, intensity = 1) {
        const count = Math.floor(10 * intensity);
        
        // Mixed color particles
        for (let i = 0; i < count; i++) {
            const color = Math.random() > 0.5 ? color1 : color2;
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 * intensity + Math.random() * 4;
            
            this.addParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: 4 + Math.random() * 4,
                life: 0.5,
                decay: 0.025
            });
        }
        
        // White flash particles - reduced
        this.sparks(x, y, Math.floor(5 * intensity), {
            color: '#ffffff',
            size: 3
        });
        
        // Impact ring for strong hits only
        if (intensity > 1.2) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                this.addParticle(x, y, {
                    vx: Math.cos(angle) * 8 * intensity,
                    vy: Math.sin(angle) * 8 * intensity,
                    color: '#ffffff',
                    size: 3,
                    life: 0.25,
                    decay: 0.04,
                    friction: 0.9
                });
            }
        }
    }
    
    /**
     * Create dash start effect - tuned for clarity
     */
    dashStart(x, y, angle, color) {
        // Burst behind player (exhaust trail) - reduced
        const behindAngle = angle + Math.PI;
        
        this.directionalBurst(x, y, behindAngle, 12, {
            color: color,
            size: 6,
            speed: 8,
            spread: 0.6,
            life: 0.4,
            decay: 0.025
        });
        
        // White speed lines - reduced
        this.directionalBurst(x, y, behindAngle, 6, {
            color: '#ffffff',
            size: 3,
            speed: 12,
            spread: 0.3,
            life: 0.25,
            decay: 0.04
        });
        
        // Small ring effect
        for (let i = 0; i < 10; i++) {
            const ringAngle = (i / 10) * Math.PI * 2;
            this.addParticle(x, y, {
                vx: Math.cos(ringAngle) * 10,
                vy: Math.sin(ringAngle) * 10,
                color: color,
                size: 3,
                life: 0.2,
                decay: 0.04,
                friction: 0.92
            });
        }
    }
    
    /**
     * Create near-edge warning particles
     */
    edgeWarning(x, y, color) {
        this.addParticle(x, y, {
            vx: (Math.random() - 0.5) * 3,
            vy: -2 - Math.random() * 2,
            color: '#ff4444',
            size: 3,
            life: 0.5,
            decay: 0.03,
            shape: 'circle'
        });
    }
    
    /**
     * Update all particles
     */
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Render all particles
     */
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
    
    /**
     * Get particle count
     */
    get count() {
        return this.particles.length;
    }
}
