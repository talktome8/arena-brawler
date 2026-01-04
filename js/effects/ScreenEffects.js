/**
 * Screen effects like shake, flash, etc.
 */
export class ScreenEffects {
    constructor() {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeDecay = 0.9;
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Flash effect
        this.flashColor = '#ffffff';
        this.flashAlpha = 0;
        this.flashDecay = 0.1;
        
        // Slow motion
        this.timeScale = 1;
        this.targetTimeScale = 1;
        this.timeScaleLerp = 0.1;
        
        // Zoom effect
        this.zoom = 1;
        this.targetZoom = 1;
        this.zoomLerp = 0.05;
        
        // Vignette
        this.vignetteIntensity = 0;
        this.targetVignette = 0;
    }
    
    /**
     * Trigger screen shake
     */
    shake(intensity, duration = 200) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }
    
    /**
     * Trigger screen flash
     */
    flash(color = '#ffffff', alpha = 0.5) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    }
    
    /**
     * Trigger slow motion
     */
    slowMotion(scale, duration) {
        this.targetTimeScale = scale;
        setTimeout(() => {
            this.targetTimeScale = 1;
        }, duration);
    }
    
    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.targetZoom = zoom;
    }
    
    /**
     * Set vignette intensity
     */
    setVignette(intensity) {
        this.targetVignette = intensity;
    }
    
    /**
     * Big impact effect (combines multiple effects)
     */
    impact(intensity = 1) {
        this.shake(intensity * 12, 150);
        this.flash('#ffffff', intensity * 0.25);
        if (intensity > 1.5) {
            this.slowMotion(0.4, 80);
        }
    }
    
    /**
     * Elimination effect - ENHANCED for drama
     */
    elimination() {
        this.shake(25, 400);
        this.flash('#ff4444', 0.5);
        this.slowMotion(0.15, 200);
        // Add vignette for dramatic effect
        this.targetVignette = 0.4;
        setTimeout(() => {
            this.targetVignette = 0;
        }, 300);
    }
    
    /**
     * Update effects
     */
    update(deltaTime) {
        // Update shake
        if (this.shakeDuration > 0) {
            this.offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeDuration -= deltaTime;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.shakeIntensity = 0;
        }
        
        // Update flash
        if (this.flashAlpha > 0) {
            this.flashAlpha -= this.flashDecay;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
        
        // Update time scale
        this.timeScale += (this.targetTimeScale - this.timeScale) * this.timeScaleLerp;
        
        // Update zoom
        this.zoom += (this.targetZoom - this.zoom) * this.zoomLerp;
        
        // Update vignette
        this.vignetteIntensity += (this.targetVignette - this.vignetteIntensity) * 0.1;
    }
    
    /**
     * Apply pre-render transforms
     */
    preRender(ctx, canvas) {
        ctx.save();
        
        // Apply shake offset
        ctx.translate(this.offsetX, this.offsetY);
        
        // Apply zoom (centered)
        if (this.zoom !== 1) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(this.zoom, this.zoom);
            ctx.translate(-centerX, -centerY);
        }
    }
    
    /**
     * Apply post-render effects
     */
    postRender(ctx, canvas) {
        ctx.restore();
        
        // Render flash
        if (this.flashAlpha > 0) {
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
        
        // Render vignette
        if (this.vignetteIntensity > 0) {
            this.renderVignette(ctx, canvas);
        }
    }
    
    /**
     * Render vignette effect
     */
    renderVignette(ctx, canvas) {
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.8
        );
        
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteIntensity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Get current time scale for physics
     */
    getTimeScale() {
        return this.timeScale;
    }
}
