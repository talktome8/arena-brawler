import { Vector2 } from '../utils/Vector2.js';

/**
 * Touch controls for mobile devices
 * Provides a virtual joystick and dash button
 */
export class TouchControls {
    constructor() {
        this.enabled = false;
        this.movement = new Vector2();
        this.dashPressed = false;
        this.startPressed = false;
        
        this.joystickOrigin = null;
        this.joystickCurrent = null;
        this.joystickTouchId = null;
        
        this.maxJoystickDistance = 50;
        
        // Check if touch device
        this.isTouchDevice = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) ||
                            (navigator.msMaxTouchPoints > 0);
        
        if (this.isTouchDevice) {
            this.createTouchUI();
            this.setupTouchListeners();
        }
    }
    
    /**
     * Create touch control UI elements
     */
    createTouchUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        
        // Create joystick
        this.joystickOuter = document.createElement('div');
        this.joystickOuter.className = 'touch-joystick';
        
        this.joystickInner = document.createElement('div');
        this.joystickInner.className = 'touch-joystick-inner';
        this.joystickOuter.appendChild(this.joystickInner);
        
        // Create dash button
        this.dashButton = document.createElement('div');
        this.dashButton.className = 'touch-dash-btn';
        this.dashButton.textContent = 'DASH';
        
        // Create start button (shown when waiting)
        this.startButton = document.createElement('div');
        this.startButton.className = 'touch-start-btn';
        this.startButton.textContent = '▶ TAP TO START';
        
        // Create landscape hint
        this.landscapeHint = document.createElement('div');
        this.landscapeHint.className = 'landscape-hint';
        this.landscapeHint.innerHTML = `
            <div class="rotate-icon">📱</div>
            <h2>Rotate Your Device</h2>
            <p>For the best experience, please rotate to landscape mode</p>
            <button class="dismiss-btn" style="margin-top: 20px; padding: 10px 20px; background: rgba(78, 205, 196, 0.3); border: 2px solid #4ecdc4; color: #4ecdc4; border-radius: 5px; font-size: 16px;">Continue Anyway</button>
        `;
        
        // Add dismiss functionality
        const dismissBtn = this.landscapeHint.querySelector('.dismiss-btn');
        dismissBtn.addEventListener('click', () => {
            this.landscapeHint.classList.add('dismissed');
        });
        
        this.container.appendChild(this.joystickOuter);
        this.container.appendChild(this.dashButton);
        document.body.appendChild(this.container);
        document.body.appendChild(this.startButton);
        document.body.appendChild(this.landscapeHint);
    }
    
    /**
     * Setup touch event listeners
     */
    setupTouchListeners() {
        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => {
            if (this.enabled) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Joystick touch handling
        this.joystickOuter.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.joystickTouchId = touch.identifier;
            const rect = this.joystickOuter.getBoundingClientRect();
            this.joystickOrigin = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            this.updateJoystick(touch);
        });
        
        document.addEventListener('touchmove', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    e.preventDefault();
                    this.updateJoystick(touch);
                    break;
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.joystickTouchId) {
                    this.joystickTouchId = null;
                    this.joystickOrigin = null;
                    this.movement.set(0, 0);
                    this.resetJoystickVisual();
                    break;
                }
            }
        });
        
        // Dash button handling
        this.dashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.dashPressed = true;
            this.dashButton.style.transform = 'scale(0.9)';
            this.dashButton.style.background = 'rgba(78, 205, 196, 0.6)';
        });
        
        this.dashButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.dashButton.style.transform = 'scale(1)';
            this.dashButton.style.background = 'rgba(78, 205, 196, 0.3)';
        });
        
        // Start button handling
        this.startButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startPressed = true;
            this.startButton.style.transform = 'translate(-50%, -50%) scale(0.95)';
        });
        
        this.startButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.startButton.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }
    
    /**
     * Update joystick position based on touch
     */
    updateJoystick(touch) {
        if (!this.joystickOrigin) return;
        
        const dx = touch.clientX - this.joystickOrigin.x;
        const dy = touch.clientY - this.joystickOrigin.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clampedDistance = Math.min(distance, this.maxJoystickDistance);
        
        let normalizedX = 0;
        let normalizedY = 0;
        
        if (distance > 0) {
            normalizedX = (dx / distance) * (clampedDistance / this.maxJoystickDistance);
            normalizedY = (dy / distance) * (clampedDistance / this.maxJoystickDistance);
        }
        
        this.movement.set(normalizedX, normalizedY);
        
        // Update joystick visual
        const visualX = normalizedX * this.maxJoystickDistance;
        const visualY = normalizedY * this.maxJoystickDistance;
        this.joystickInner.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    }
    
    /**
     * Reset joystick visual to center
     */
    resetJoystickVisual() {
        this.joystickInner.style.transform = 'translate(-50%, -50%)';
    }
    
    /**
     * Enable touch controls
     */
    enable() {
        if (!this.isTouchDevice) return;
        
        this.enabled = true;
        this.container.classList.add('active');
    }
    
    /**
     * Disable touch controls
     */
    disable() {
        if (!this.isTouchDevice) return;
        
        this.enabled = false;
        this.container.classList.remove('active');
        this.movement.set(0, 0);
        this.resetJoystickVisual();
    }
    
    /**
     * Show start button
     */
    showStartButton() {
        if (!this.isTouchDevice) return;
        this.startButton.classList.add('visible');
    }
    
    /**
     * Hide start button
     */
    hideStartButton() {
        if (!this.isTouchDevice) return;
        this.startButton.classList.remove('visible');
    }
    
    /**
     * Get movement vector
     */
    getMovement() {
        return this.movement.clone();
    }
    
    /**
     * Check if dash was pressed (and consume the press)
     */
    getDash() {
        const pressed = this.dashPressed;
        this.dashPressed = false;
        return pressed;
    }
    
    /**
     * Check if start was pressed (and consume the press)
     */
    getStart() {
        const pressed = this.startPressed;
        this.startPressed = false;
        return pressed;
    }
    
    /**
     * Check if this is a touch device
     */
    isTouch() {
        return this.isTouchDevice;
    }
}
