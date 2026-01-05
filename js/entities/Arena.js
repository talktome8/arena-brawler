import { CONFIG } from '../config.js';

/**
 * Arena - the play area with boundaries and visual effects
 */
export class Arena {
    constructor(canvasWidth, canvasHeight) {
        const padding = CONFIG.ARENA.PADDING;
        
        this.bounds = {
            left: padding,
            right: canvasWidth - padding,
            top: padding,
            bottom: canvasHeight - padding
        };
        
        this.width = this.bounds.right - this.bounds.left;
        this.height = this.bounds.bottom - this.bounds.top;
        this.centerX = this.bounds.left + this.width / 2;
        this.centerY = this.bounds.top + this.height / 2;
        
        // Animation state
        this.time = 0;
        this.pulsePhase = 0;
        this.borderGlow = 0;
        this.targetBorderGlow = 0;
        
        // Shrinking mechanic
        this.originalBounds = { ...this.bounds };
        this.shrinkStartTime = 8000; // Start shrinking after 8 seconds
        this.shrinkDuration = 12000; // Shrink over 12 seconds
        this.minSizePercent = 0.35; // Shrink to 35% of original size
        this.roundTime = 0;
        this.isShrinking = false;
        this.shrinkWarningShown = false;
        
        // Modifier-based scaling and shrink speed
        this.arenaScale = 1.0;
        this.shrinkSpeedMultiplier = 1.0;
        
        // Sudden death tie-breaker
        this.suddenDeathActive = false;
        this.suddenDeathStartTime = 12000; // Sudden death after 12 seconds (was 20s)
        this.suddenDeathShrinkSpeed = 5; // 5x faster shrinking (was 3x)
        this.suddenDeathForce = 0.15; // Strong force pushing players toward center (was 0.08)
        
        // Centrifuge tiebreaker mode
        this.centrifugeMode = false;
        this.centrifugeRadius = 0;
        this.centrifugeRotation = 0;
        this.centrifugeSpeed = 0;
        this.centrifugeMaxSpeed = 0.004; // radians per ms
        this.centrifugeForce = 0;
        this.centrifugeMaxForce = 0.35;
    }
    
    /**
     * Set arena scale (for modifiers like TINY_ARENA)
     */
    setScale(scale) {
        this.arenaScale = scale;
        this.applyScale();
    }
    
    /**
     * Set shrink speed multiplier (for modifiers like FAST_SHRINK)
     */
    setShrinkSpeed(multiplier) {
        this.shrinkSpeedMultiplier = multiplier;
    }
    
    /**
     * Apply current scale to bounds
     */
    applyScale() {
        const origWidth = this.originalBounds.right - this.originalBounds.left;
        const origHeight = this.originalBounds.bottom - this.originalBounds.top;
        const newWidth = origWidth * this.arenaScale;
        const newHeight = origHeight * this.arenaScale;
        
        this.bounds.left = this.centerX - newWidth / 2;
        this.bounds.right = this.centerX + newWidth / 2;
        this.bounds.top = this.centerY - newHeight / 2;
        this.bounds.bottom = this.centerY + newHeight / 2;
        this.width = newWidth;
        this.height = newHeight;
    }
    
    /**
     * Get spawn positions for players
     */
    getSpawnPositions(playerCount) {
        const positions = [];
        const padding = 80;
        
        // Predefined spawn positions based on player count
        const spawnPoints = [
            { x: this.bounds.left + padding, y: this.centerY }, // Left
            { x: this.bounds.right - padding, y: this.centerY }, // Right
            { x: this.centerX, y: this.bounds.top + padding }, // Top
            { x: this.centerX, y: this.bounds.bottom - padding } // Bottom
        ];
        
        for (let i = 0; i < playerCount; i++) {
            positions.push(spawnPoints[i]);
        }
        
        return positions;
    }
    
    /**
     * Check if a position is outside the arena
     */
    isOutOfBounds(x, y, radius = 0) {
        if (this.centrifugeMode) {
            return this.isOutOfCentrifuge(x, y, radius);
        }
        return (
            x - radius < this.bounds.left ||
            x + radius > this.bounds.right ||
            y - radius < this.bounds.top ||
            y + radius > this.bounds.bottom
        );
    }
    
    /**
     * Check if player is completely outside (eliminated)
     */
    isEliminated(x, y, radius) {
        if (this.centrifugeMode) {
            return this.isEliminatedCentrifuge(x, y, radius);
        }
        return (
            x + radius < this.bounds.left ||
            x - radius > this.bounds.right ||
            y + radius < this.bounds.top ||
            y - radius > this.bounds.bottom
        );
    }
    
    /**
     * Get distance to nearest boundary (negative if outside)
     */
    getDistanceToBoundary(x, y) {
        const distances = [
            x - this.bounds.left,
            this.bounds.right - x,
            y - this.bounds.top,
            this.bounds.bottom - y
        ];
        return Math.min(...distances);
    }
    
    /**
     * Trigger border glow effect
     */
    triggerBorderGlow() {
        this.targetBorderGlow = 1;
    }
    
    /**
     * Reset arena for new round
     */
    reset() {
        this.bounds = { ...this.originalBounds };
        this.width = this.bounds.right - this.bounds.left;
        this.height = this.bounds.bottom - this.bounds.top;
        this.centerX = this.bounds.left + this.width / 2;
        this.centerY = this.bounds.top + this.height / 2;
        this.roundTime = 0;
        this.isShrinking = false;
        this.shrinkWarningShown = false;
        this.suddenDeathActive = false;
        // Reset centrifuge
        this.centrifugeMode = false;
        this.centrifugeRotation = 0;
        this.centrifugeSpeed = 0;
        this.centrifugeForce = 0;
        // Reset modifiers
        this.arenaScale = 1.0;
        this.shrinkSpeedMultiplier = 1.0;
    }
    
    /**
     * Get shrink progress (0-1)
     */
    getShrinkProgress() {
        if (this.roundTime < this.shrinkStartTime) return 0;
        const shrinkTime = this.roundTime - this.shrinkStartTime;
        return Math.min(1, shrinkTime / this.shrinkDuration);
    }
    
    /**
     * Check if about to shrink (for warning)
     */
    isAboutToShrink() {
        return this.roundTime > this.shrinkStartTime - 3000 && this.roundTime < this.shrinkStartTime;
    }
    
    /**
     * Set alive player count for sudden death calculation
     */
    setAliveCount(count) {
        // Activate sudden death when only 2 players remain and time threshold reached
        if (count <= 2 && this.roundTime >= this.suddenDeathStartTime && !this.suddenDeathActive) {
            this.suddenDeathActive = true;
        }
    }
    
    /**
     * Activate centrifuge tiebreaker mode
     */
    activateCentrifuge() {
        this.centrifugeMode = true;
        this.centrifugeRadius = Math.min(this.width, this.height) * 0.45;
        this.centrifugeRotation = 0;
        this.centrifugeSpeed = 0;
        this.centrifugeForce = 0;
    }
    
    /**
     * Check if a position is outside the circular centrifuge arena
     */
    isOutOfCentrifuge(x, y, radius = 0) {
        if (!this.centrifugeMode) return false;
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist + radius > this.centrifugeRadius;
    }
    
    /**
     * Check if player eliminated in centrifuge mode
     */
    isEliminatedCentrifuge(x, y, radius) {
        if (!this.centrifugeMode) return false;
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist - radius > this.centrifugeRadius;
    }
    
    /**
     * Get centrifugal force for a position (pushes outward from center based on rotation)
     */
    getCentrifugeForce(x, y) {
        if (!this.centrifugeMode || this.centrifugeForce === 0) return { x: 0, y: 0 };
        
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 10) return { x: 0, y: 0 };
        
        // Centrifugal force pushes outward, stronger further from center
        const forceMagnitude = this.centrifugeForce * (dist / 100);
        return {
            x: (dx / dist) * forceMagnitude,
            y: (dy / dist) * forceMagnitude
        };
    }
    
    /**
     * Get sudden death force vector toward center for a position
     */
    getSuddenDeathForce(x, y) {
        if (!this.suddenDeathActive) return { x: 0, y: 0 };
        
        const dx = this.centerX - x;
        const dy = this.centerY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 1) return { x: 0, y: 0 };
        
        // Force increases the further from center
        const forceMultiplier = Math.min(dist / 100, 2) * this.suddenDeathForce;
        return {
            x: (dx / dist) * forceMultiplier,
            y: (dy / dist) * forceMultiplier
        };
    }
    
    /**
     * Update arena animations and shrinking
     */
    update(deltaTime, isPlaying = false) {
        this.time += deltaTime;
        this.pulsePhase += deltaTime * 0.003;
        
        // Decay border glow
        this.borderGlow += (this.targetBorderGlow - this.borderGlow) * 0.1;
        this.targetBorderGlow *= 0.95;
        
        // Update centrifuge mode
        if (this.centrifugeMode && isPlaying) {
            // Gradually increase rotation speed
            this.centrifugeSpeed = Math.min(this.centrifugeSpeed + 0.000005 * deltaTime, this.centrifugeMaxSpeed);
            this.centrifugeRotation += this.centrifugeSpeed * deltaTime;
            
            // Gradually increase centrifugal force
            this.centrifugeForce = Math.min(this.centrifugeForce + 0.0001 * deltaTime, this.centrifugeMaxForce);
            
            // Slowly shrink the centrifuge radius
            this.centrifugeRadius = Math.max(80, this.centrifugeRadius - 0.015 * deltaTime);
        }
        
        // Update round time and shrinking only when playing
        if (isPlaying) {
            this.roundTime += deltaTime;
            
            // Calculate effective shrink speed (faster during sudden death or with modifier)
            const shrinkMultiplier = this.suddenDeathActive ? 
                this.suddenDeathShrinkSpeed : this.shrinkSpeedMultiplier;
            
            // Check if we should be shrinking
            if (this.roundTime >= this.shrinkStartTime) {
                this.isShrinking = true;
                const baseProgress = this.getShrinkProgress();
                // Accelerate progress during sudden death or with modifier
                const progress = Math.min(1, baseProgress * shrinkMultiplier);
                const scale = 1 - (1 - this.minSizePercent) * progress;
                // Also apply arena scale modifier
                const finalScale = scale * this.arenaScale;
                
                // Calculate new bounds from center
                const newWidth = (this.originalBounds.right - this.originalBounds.left) * finalScale;
                const newHeight = (this.originalBounds.bottom - this.originalBounds.top) * finalScale;
                
                this.bounds.left = this.centerX - newWidth / 2;
                this.bounds.right = this.centerX + newWidth / 2;
                this.bounds.top = this.centerY - newHeight / 2;
                this.bounds.bottom = this.centerY + newHeight / 2;
                this.width = newWidth;
                this.height = newHeight;
            }
        }
    }
    
    /**
     * Render the arena
     */
    render(ctx) {
        // Draw outer area (out of bounds)
        this.renderOutOfBounds(ctx);
        
        if (this.centrifugeMode) {
            // Render circular spinning arena
            this.renderCentrifugeArena(ctx);
        } else {
            // Draw background
            this.renderBackground(ctx);
            
            // Draw danger zone gradient (edge warning)
            this.renderDangerZone(ctx);
            
            // Draw shrinking warning
            if (this.isShrinking) {
                this.renderShrinkingEffect(ctx);
            }
            
            // Draw border (sharp corners for aggressive look)
            this.renderBorder(ctx);
            
            // Draw corner markers (impact points)
            this.renderCornerMarkers(ctx);
        }
    }
    
    /**
     * Render centrifuge arena (circular spinning arena)
     */
    renderCentrifugeArena(ctx) {
        ctx.save();
        
        // Translate to center for rotation
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.centrifugeRotation);
        
        // Draw circular arena background
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.centrifugeRadius);
        gradient.addColorStop(0, '#1a3a1a');
        gradient.addColorStop(0.3, '#152515');
        gradient.addColorStop(0.7, '#102010');
        gradient.addColorStop(1, '#0a150a');
        
        ctx.beginPath();
        ctx.arc(0, 0, this.centrifugeRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw spinning pattern lines (radial)
        const numLines = 12;
        const pulseAlpha = 0.3 + Math.sin(this.pulsePhase * 4) * 0.1;
        ctx.strokeStyle = `rgba(100, 255, 100, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.centrifugeRadius, Math.sin(angle) * this.centrifugeRadius);
            ctx.stroke();
        }
        
        // Draw concentric rings
        const numRings = 4;
        for (let i = 1; i <= numRings; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, (this.centrifugeRadius / numRings) * i, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 255, 100, ${0.1 + i * 0.05})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw non-rotating elements
        // Safe zone indicator in center
        const safeZoneRadius = 60;
        const safeGlow = 0.4 + Math.sin(this.pulsePhase * 3) * 0.2;
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, safeZoneRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 255, 100, ${safeGlow * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(100, 255, 100, ${safeGlow})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw outer border (glowing)
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.centrifugeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#44ff44';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#44ff44';
        ctx.shadowBlur = 20 + Math.sin(this.pulsePhase * 6) * 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Warning text
        const textPulse = 1 + Math.sin(this.pulsePhase * 8) * 0.1;
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.floor(24 * textPulse)}px Arial`;
        ctx.fillStyle = '#44ff44';
        ctx.shadowColor = '#44ff44';
        ctx.shadowBlur = 15;
        ctx.fillText('🌀 CENTRIFUGE MODE 🌀', this.centerX, this.centerY - this.centrifugeRadius - 20);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#88ff88';
        ctx.fillText('STAY IN THE CENTER!', this.centerX, this.centerY - this.centrifugeRadius - 45);
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render shrinking arena effect
     */
    renderShrinkingEffect(ctx) {
        const pulseIntensity = this.suddenDeathActive ? 
            0.5 + Math.sin(this.pulsePhase * 12) * 0.4 :
            0.3 + Math.sin(this.pulsePhase * 5) * 0.2;
        
        // Pulsing overlay - MUCH more intense during sudden death
        const overlayAlpha = this.suddenDeathActive ? pulseIntensity * 0.35 : pulseIntensity * 0.1;
        ctx.fillStyle = `rgba(255, 0, 0, ${overlayAlpha})`;
        ctx.fillRect(this.bounds.left, this.bounds.top, this.width, this.height);
        
        // During sudden death, add flashing border effect
        if (this.suddenDeathActive) {
            const flashIntensity = 0.6 + Math.sin(this.pulsePhase * 15) * 0.4;
            ctx.strokeStyle = `rgba(255, 50, 50, ${flashIntensity})`;
            ctx.lineWidth = 8;
            ctx.strokeRect(this.bounds.left, this.bounds.top, this.width, this.height);
        }
        
        // Warning text - different for sudden death
        ctx.save();
        ctx.textAlign = 'center';
        
        if (this.suddenDeathActive) {
            // Large, unmistakable sudden death text
            const textPulse = 1 + Math.sin(this.pulsePhase * 10) * 0.15;
            ctx.font = `bold ${Math.floor(28 * textPulse)}px Arial`;
            ctx.fillStyle = `rgba(255, 50, 50, 1)`;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.fillText('⚡ SUDDEN DEATH ⚡', this.centerX, this.bounds.top + 35);
            ctx.shadowBlur = 0;
        } else {
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = `rgba(255, 100, 100, ${0.7 + Math.sin(this.pulsePhase * 8) * 0.3})`;
            ctx.fillText('⚠ ARENA SHRINKING ⚠', this.centerX, this.bounds.top + 25);
        }
        ctx.restore();
    }
    
    /**
     * Render out of bounds area
     */
    renderOutOfBounds(ctx) {
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Add subtle pattern
        const patternSize = 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        
        for (let x = 0; x < ctx.canvas.width; x += patternSize * 2) {
            for (let y = 0; y < ctx.canvas.height; y += patternSize * 2) {
                ctx.fillRect(x, y, patternSize, patternSize);
                ctx.fillRect(x + patternSize, y + patternSize, patternSize, patternSize);
            }
        }
    }
    
    /**
     * Render arena background with gradient - aggressive dark look
     */
    renderBackground(ctx) {
        // Create radial gradient - darker, more menacing
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.width * 0.7
        );
        gradient.addColorStop(0, '#252535');
        gradient.addColorStop(0.5, '#1a1a28');
        gradient.addColorStop(1, '#12121a');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.bounds.left,
            this.bounds.top,
            this.width,
            this.height
        );
        
        // Subtle diagonal slash pattern for aggressive texture
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.03)';
        ctx.lineWidth = 2;
        const slashSpacing = 40;
        for (let i = -this.height; i < this.width + this.height; i += slashSpacing) {
            ctx.beginPath();
            ctx.moveTo(this.bounds.left + i, this.bounds.top);
            ctx.lineTo(this.bounds.left + i + this.height, this.bounds.bottom);
            ctx.stroke();
        }
    }
    
    /**
     * Render danger zone near edges
     */
    renderDangerZone(ctx) {
        const dangerWidth = CONFIG.ARENA.DANGER_ZONE_WIDTH;
        const pulseIntensity = 0.2 + Math.sin(this.pulsePhase * 2) * 0.1;
        
        // Create gradient for each edge
        const edges = [
            { x: this.bounds.left, y: this.bounds.top, w: dangerWidth, h: this.height, dir: 'right' },
            { x: this.bounds.right - dangerWidth, y: this.bounds.top, w: dangerWidth, h: this.height, dir: 'left' },
            { x: this.bounds.left, y: this.bounds.top, w: this.width, h: dangerWidth, dir: 'down' },
            { x: this.bounds.left, y: this.bounds.bottom - dangerWidth, w: this.width, h: dangerWidth, dir: 'up' }
        ];
        
        for (const edge of edges) {
            let gradient;
            if (edge.dir === 'right') {
                gradient = ctx.createLinearGradient(edge.x, 0, edge.x + edge.w, 0);
            } else if (edge.dir === 'left') {
                gradient = ctx.createLinearGradient(edge.x + edge.w, 0, edge.x, 0);
            } else if (edge.dir === 'down') {
                gradient = ctx.createLinearGradient(0, edge.y, 0, edge.y + edge.h);
            } else {
                gradient = ctx.createLinearGradient(0, edge.y + edge.h, 0, edge.y);
            }
            
            gradient.addColorStop(0, `rgba(255, 68, 68, ${pulseIntensity + this.borderGlow * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(edge.x, edge.y, edge.w, edge.h);
        }
    }
    
    /**
     * Render animated grid pattern
     */
    renderGrid(ctx) {
        const gridSize = 50;
        const lineAlpha = 0.06 + Math.sin(this.pulsePhase) * 0.02;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = this.bounds.left + gridSize; x < this.bounds.right; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, this.bounds.top);
            ctx.lineTo(x, this.bounds.bottom);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = this.bounds.top + gridSize; y < this.bounds.bottom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(this.bounds.left, y);
            ctx.lineTo(this.bounds.right, y);
            ctx.stroke();
        }
        
        // Grid intersection dots
        ctx.fillStyle = `rgba(255, 255, 255, ${lineAlpha * 2})`;
        for (let x = this.bounds.left + gridSize; x < this.bounds.right; x += gridSize) {
            for (let y = this.bounds.top + gridSize; y < this.bounds.bottom; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Render arena border
     */
    renderBorder(ctx) {
        const glowIntensity = 0.5 + this.borderGlow * 0.5;
        
        // Outer glow
        ctx.shadowColor = CONFIG.ARENA.BORDER_COLOR;
        ctx.shadowBlur = 15 + this.borderGlow * 20;
        
        ctx.strokeStyle = CONFIG.ARENA.BORDER_COLOR;
        ctx.lineWidth = CONFIG.ARENA.BORDER_WIDTH;
        ctx.strokeRect(
            this.bounds.left,
            this.bounds.top,
            this.width,
            this.height
        );
        
        ctx.shadowBlur = 0;
        
        // Inner border highlight
        ctx.strokeStyle = `rgba(255, 100, 100, ${0.3 + this.borderGlow * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.bounds.left + 4,
            this.bounds.top + 4,
            this.width - 8,
            this.height - 8
        );
    }
    
    /**
     * Render corner markers - sharp aggressive style
     */
    renderCornerMarkers(ctx) {
        const markerSize = 25;
        const pulseSize = markerSize + Math.sin(this.pulsePhase * 3) * 4;
        
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 5;
        ctx.lineCap = 'square'; // Sharp corners
        
        const corners = [
            { x: this.bounds.left, y: this.bounds.top, dx: 1, dy: 1 },
            { x: this.bounds.right, y: this.bounds.top, dx: -1, dy: 1 },
            { x: this.bounds.left, y: this.bounds.bottom, dx: 1, dy: -1 },
            { x: this.bounds.right, y: this.bounds.bottom, dx: -1, dy: -1 }
        ];
        
        for (const corner of corners) {
            // Glow effect
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 15;
            
            ctx.beginPath();
            ctx.moveTo(corner.x + corner.dx * pulseSize, corner.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.lineTo(corner.x, corner.y + corner.dy * pulseSize);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            
            // Corner spike
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.moveTo(corner.x, corner.y);
            ctx.lineTo(corner.x + corner.dx * 8, corner.y);
            ctx.lineTo(corner.x, corner.y + corner.dy * 8);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.lineCap = 'butt';
    }
    
    /**
     * Render center marker
     */
    renderCenterMarker(ctx) {
        const pulseSize = 4 + Math.sin(this.pulsePhase * 1.5) * 2;
        const ringSize = 30 + Math.sin(this.pulsePhase) * 5;
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, ringSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, ringSize * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
        
        // Cross lines
        const crossSize = 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(this.centerX - crossSize, this.centerY);
        ctx.lineTo(this.centerX + crossSize, this.centerY);
        ctx.moveTo(this.centerX, this.centerY - crossSize);
        ctx.lineTo(this.centerX, this.centerY + crossSize);
        ctx.stroke();
    }
}
