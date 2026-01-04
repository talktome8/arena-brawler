import { CONFIG } from '../config.js';
import { Vector2 } from '../utils/Vector2.js';

/**
 * Player entity with physics-based movement and visual effects
 */
export class Player {
    constructor(id, x, y, color) {
        this.id = id;
        this.position = new Vector2(x, y);
        this.velocity = new Vector2();
        this.color = color;
        this.radius = CONFIG.PLAYER.RADIUS;
        this.mass = CONFIG.PLAYER.MASS;
        
        // State
        this.isAlive = true;
        this.isDashing = false;
        this.dashTimeRemaining = 0;
        this.dashCooldown = 0;
        this.dashDirection = new Vector2();
        
        // Visual effects state
        this.hitFlash = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.trailPositions = [];
        this.maxTrailLength = 10;
        this.lastMoveDirection = new Vector2(1, 0);
        this.squashStretch = { x: 1, y: 1 };
        this.targetSquash = { x: 1, y: 1 };
        this.nearEdge = false;
        this.edgeWarningIntensity = 0;
        
        // Idle penalty
        this.idleTime = 0;
        this.maxIdleTime = 5000; // 5 seconds
        this.isIdle = false;
        this.idleWarningShown = false;
        
        // Stats
        this.wins = 0;
        
        // Spawn position for respawning (stored as copy to avoid reference issues)
        this.spawnPosition = new Vector2(x, y);
        this.originalSpawnPosition = new Vector2(x, y);
        
        // Generate secondary color
        this.secondaryColor = this.lightenColor(color, 30);
        this.darkColor = this.darkenColor(color, 30);
    }
    
    /**
     * Lighten a hex color
     */
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `rgb(${R}, ${G}, ${B})`;
    }
    
    /**
     * Darken a hex color
     */
    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `rgb(${R}, ${G}, ${B})`;
    }
    
    /**
     * Reset player for new round
     */
    reset() {
        this.position = this.spawnPosition.clone();
        this.velocity = new Vector2();
        this.isAlive = true;
        this.isDashing = false;
        this.dashTimeRemaining = 0;
        this.dashCooldown = 0;
        this.hitFlash = 0;
        this.trailPositions = [];
        this.squashStretch = { x: 1, y: 1 };
        this.targetSquash = { x: 1, y: 1 };
        this.nearEdge = false;
        this.edgeWarningIntensity = 0;
        this.idleTime = 0;
        this.isIdle = false;
        this.idleWarningShown = false;
        this.eliminationTime = null; // Reset ghost effect
    }
    
    /**
     * Update spawn position (used when arena resets between rounds)
     */
    setSpawnPosition(x, y) {
        this.spawnPosition.set(x, y);
    }
    
    /**
     * Process input and update movement
     */
    handleInput(input, deltaTime, speedMultiplier = 1) {
        if (!this.isAlive) return { dashStarted: false };
        
        const { movement, dash } = input;
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        // Update dash state
        if (this.isDashing) {
            this.dashTimeRemaining -= deltaTime;
            if (this.dashTimeRemaining <= 0) {
                this.isDashing = false;
                // Squash effect when dash ends
                this.targetSquash = { x: 1.3, y: 0.7 };
            }
        }
        
        // Try to dash
        if (dash && this.canDash() && movement.magnitude() > 0) {
            this.startDash(movement, speedMultiplier);
            return { dashStarted: true, direction: movement.clone() };
        }
        
        // Apply movement acceleration (reduced during dash)
        if (!this.isDashing && movement.magnitude() > 0) {
            const acceleration = movement.clone().multiply(CONFIG.PLAYER.ACCELERATION * speedMultiplier);
            this.velocity.add(acceleration);
            this.lastMoveDirection = movement.clone().normalize();
        }
        
        return { dashStarted: false };
    }
    
    /**
     * Check if player can dash
     */
    canDash() {
        return !this.isDashing && this.dashCooldown <= 0;
    }
    
    /**
     * Start a dash in the given direction
     */
    startDash(direction, speedMultiplier = 1) {
        this.isDashing = true;
        this.dashTimeRemaining = CONFIG.DASH.DURATION;
        this.dashCooldown = CONFIG.DASH.COOLDOWN;
        this.dashDirection = direction.clone().normalize();
        this.lastMoveDirection = this.dashDirection.clone();
        
        // Stretch effect for dash
        this.targetSquash = { x: 0.6, y: 1.4 };
        
        // Set velocity to dash speed in direction
        this.velocity = this.dashDirection.clone()
            .multiply(CONFIG.PLAYER.MAX_SPEED * CONFIG.DASH.SPEED_MULTIPLIER * speedMultiplier);
    }
    
    /**
     * Apply hit effect
     */
    onHit(intensity = 1) {
        this.hitFlash = 1;
        // Squash on impact
        this.targetSquash = { x: 1.4, y: 0.6 };
    }
    
    /**
     * Get dash cooldown progress (0-1)
     */
    getDashCooldownProgress() {
        if (this.dashCooldown <= 0) return 1;
        return 1 - (this.dashCooldown / CONFIG.DASH.COOLDOWN);
    }
    
    /**
     * Update physics
     */
    update(deltaTime, arena, frictionMultiplier = 1) {
        if (!this.isAlive) return;
        
        // Update trail
        if (this.velocity.magnitude() > 1) {
            this.trailPositions.unshift({ x: this.position.x, y: this.position.y });
            if (this.trailPositions.length > this.maxTrailLength) {
                this.trailPositions.pop();
            }
        }
        
        // Track idle time
        if (this.velocity.magnitude() < 0.5) {
            this.idleTime += deltaTime;
            if (this.idleTime >= this.maxIdleTime) {
                this.isIdle = true;
            }
        } else {
            this.idleTime = 0;
            this.isIdle = false;
            this.idleWarningShown = false;
        }
        
        // Apply friction (less during dash) with modifier support
        const baseFriction = this.isDashing ? 0.98 : CONFIG.PLAYER.FRICTION;
        const friction = baseFriction * frictionMultiplier;
        // Clamp friction to reasonable range
        const clampedFriction = Math.min(0.995, Math.max(0.85, friction));
        this.velocity.multiply(clampedFriction);
        
        // Limit speed (except during dash)
        const maxSpeed = this.isDashing 
            ? CONFIG.PLAYER.MAX_SPEED * CONFIG.DASH.SPEED_MULTIPLIER 
            : CONFIG.PLAYER.MAX_SPEED;
        this.velocity.limit(maxSpeed);
        
        // Update position
        this.position.add(this.velocity);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime, arena);
    }
    
    /**
     * Update visual effect states
     */
    updateVisualEffects(deltaTime, arena) {
        // Decay hit flash
        if (this.hitFlash > 0) {
            this.hitFlash -= 0.1;
        }
        
        // Update pulse phase
        this.pulsePhase += deltaTime * 0.005;
        
        // Lerp squash/stretch back to normal
        this.squashStretch.x += (this.targetSquash.x - this.squashStretch.x) * 0.2;
        this.squashStretch.y += (this.targetSquash.y - this.squashStretch.y) * 0.2;
        this.targetSquash.x += (1 - this.targetSquash.x) * 0.1;
        this.targetSquash.y += (1 - this.targetSquash.y) * 0.1;
        
        // Check edge proximity
        if (arena) {
            const distToEdge = arena.getDistanceToBoundary(this.position.x, this.position.y);
            const warningDistance = 60;
            
            if (distToEdge < warningDistance) {
                this.nearEdge = true;
                this.edgeWarningIntensity = 1 - (distToEdge / warningDistance);
            } else {
                this.nearEdge = false;
                this.edgeWarningIntensity = 0;
            }
        }
    }
    
    /**
     * Eliminate the player
     */
    eliminate() {
        this.isAlive = false;
        this.velocity = new Vector2();
        // Store elimination time for ghost effect
        this.eliminationTime = Date.now();
    }
    
    /**
     * Check if player should show ghost (brief fade after death)
     */
    isShowingGhost() {
        if (this.isAlive || !this.eliminationTime) return false;
        return Date.now() - this.eliminationTime < 500; // 500ms ghost
    }
    
    /**
     * Get ghost alpha (fade out effect)
     */
    getGhostAlpha() {
        if (!this.eliminationTime) return 0;
        const elapsed = Date.now() - this.eliminationTime;
        return Math.max(0, 1 - (elapsed / 500));
    }
    
    /**
     * Award a round win
     */
    addWin() {
        this.wins++;
    }
    
    /**
     * Check if player has won the match
     */
    hasWonMatch() {
        return this.wins >= CONFIG.ROUNDS.WINS_NEEDED;
    }
    
    /**
     * Get angle of movement
     */
    getMoveAngle() {
        return Math.atan2(this.lastMoveDirection.y, this.lastMoveDirection.x);
    }
    
    /**
     * Render the player
     */
    render(ctx) {
        // Show ghost effect briefly after elimination
        const showGhost = this.isShowingGhost();
        if (!this.isAlive && !showGhost) return;
        
        const { x, y } = this.position;
        
        // Apply ghost alpha if eliminated
        if (showGhost) {
            ctx.globalAlpha = this.getGhostAlpha() * 0.6;
        }
        
        // Draw trail (only if alive)
        if (this.isAlive) {
            this.renderTrail(ctx);
        }
        
        // Draw shadow
        this.renderShadow(ctx);
        
        // Skip warnings and effects for ghost
        if (this.isAlive) {
            // Draw idle warning
            if (this.idleTime > 2000) {
                this.renderIdleWarning(ctx);
            }
            
            // Draw edge warning glow
            if (this.nearEdge) {
                this.renderEdgeWarning(ctx);
            }
            
            // Draw dash effect
            if (this.isDashing) {
                this.renderDashEffect(ctx);
            }
        }
        
        // Save context for squash/stretch
        ctx.save();
        ctx.translate(x, y);
        
        // Apply squash/stretch based on velocity direction
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.rotate(angle);
        ctx.scale(this.squashStretch.y, this.squashStretch.x);
        ctx.rotate(-angle);
        
        // Draw outer glow
        const glowSize = this.radius * 1.5;
        const gradient = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, glowSize);
        gradient.addColorStop(0, this.color + '40');
        gradient.addColorStop(1, this.color + '00');
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw player body with gradient
        const bodyGradient = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.3, 0,
            0, 0, this.radius
        );
        bodyGradient.addColorStop(0, this.secondaryColor);
        bodyGradient.addColorStop(0.7, this.color);
        bodyGradient.addColorStop(1, this.darkColor);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGradient;
        ctx.fill();
        
        // Hit flash overlay
        if (this.hitFlash > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlash * 0.7})`;
            ctx.fill();
        }
        
        // Draw outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw inner highlight
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
        
        ctx.restore();
        
        // Draw player number (not affected by squash)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.id + 1, x, y);
        
        // Draw dash cooldown indicator (only if alive)
        if (this.isAlive) {
            this.renderCooldownIndicator(ctx);
        }
        
        // Reset alpha if we were showing ghost
        ctx.globalAlpha = 1;
    }
    
    /**
     * Render motion trail
     */
    renderTrail(ctx) {
        if (this.trailPositions.length < 2) return;
        
        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const alpha = (1 - i / this.trailPositions.length) * 0.3;
            const size = this.radius * (1 - i / this.trailPositions.length) * 0.8;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.fill();
        }
    }
    
    /**
     * Render shadow beneath player
     */
    renderShadow(ctx) {
        const shadowOffset = 5;
        ctx.beginPath();
        ctx.ellipse(
            this.position.x + shadowOffset,
            this.position.y + shadowOffset + this.radius * 0.5,
            this.radius * 0.9,
            this.radius * 0.4,
            0, 0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
    }
    
    /**
     * Render edge warning effect
     */
    renderEdgeWarning(ctx) {
        const { x, y } = this.position;
        const pulseSize = this.radius * (1.3 + Math.sin(this.pulsePhase * 10) * 0.1 * this.edgeWarningIntensity);
        
        ctx.beginPath();
        ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 68, 68, ${this.edgeWarningIntensity * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    /**
     * Render idle warning effect
     */
    renderIdleWarning(ctx) {
        const { x, y } = this.position;
        const idleProgress = Math.min(1, (this.idleTime - 2000) / 3000); // 0 to 1 over 3 seconds
        const pulseSpeed = 5 + idleProgress * 10;
        const alpha = 0.3 + Math.sin(this.pulsePhase * pulseSpeed) * 0.2;
        
        // Shrinking circle showing time remaining
        const maxRadius = this.radius * 2.5;
        const currentRadius = maxRadius * (1 - idleProgress);
        
        if (currentRadius > this.radius) {
            ctx.beginPath();
            ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Warning text
        if (idleProgress > 0.3) {
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255, 200, 0, ${0.7 + Math.sin(this.pulsePhase * 10) * 0.3})`;
            ctx.fillText('MOVE!', x, y - this.radius - 15);
        }
    }
    
    /**
     * Render dash visual effect
     */
    renderDashEffect(ctx) {
        const { x, y } = this.position;
        
        // Speed lines
        const numLines = 8;
        const progress = 1 - (this.dashTimeRemaining / CONFIG.DASH.DURATION);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(this.dashDirection.y, this.dashDirection.x));
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i / numLines) * this.radius * 2 - this.radius;
            const lineLength = 20 + Math.random() * 30;
            const alpha = (1 - progress) * 0.6;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.radius - 10, offset);
            ctx.lineTo(-this.radius - 10 - lineLength, offset);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, this.radius * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '30';
        ctx.fill();
    }
    
    /**
     * Render cooldown indicator below player
     */
    renderCooldownIndicator(ctx) {
        const progress = this.getDashCooldownProgress();
        if (progress >= 1) {
            // Show ready indicator
            const pulseAlpha = 0.3 + Math.sin(this.pulsePhase * 3) * 0.2;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y + this.radius + 12, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(78, 205, 196, ${pulseAlpha})`;
            ctx.fill();
            return;
        }
        
        const barWidth = 30;
        const barHeight = 4;
        const x = this.position.x - barWidth / 2;
        const y = this.position.y + this.radius + 10;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
        
        // Fill with gradient
        if (progress > 0) {
            const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
            gradient.addColorStop(0, '#ff6b6b');
            gradient.addColorStop(1, '#4ecdc4');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth * progress, barHeight, 2);
            ctx.fill();
        }
    }
}
