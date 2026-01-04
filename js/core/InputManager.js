import { CONFIG } from '../config.js';
import { Vector2 } from '../utils/Vector2.js';
import { TouchControls } from './TouchControls.js';

/**
 * Handles all input: keyboard, gamepad, and touch
 */
export class InputManager {
    constructor() {
        this.keys = new Set();
        this.keyJustPressed = new Set();
        this.gamepads = new Map();
        this.previousGamepadButtons = new Map();
        
        // Touch controls for mobile
        this.touch = new TouchControls();
        
        this.setupKeyboardListeners();
        this.setupGamepadListeners();
    }
    
    setupKeyboardListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) {
                this.keyJustPressed.add(e.code);
            }
            this.keys.add(e.code);
            
            // Prevent default for game keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                 'ShiftLeft', 'ShiftRight', 'ControlRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });
        
        // Clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys.clear();
        });
    }
    
    setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            console.log(`Gamepad connected: ${e.gamepad.id}`);
            this.gamepads.set(e.gamepad.index, e.gamepad);
            // Always reinitialize button state array on connect/reconnect
            const buttonCount = e.gamepad.buttons?.length || 17;
            this.previousGamepadButtons.set(e.gamepad.index, new Array(buttonCount).fill(false));
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log(`Gamepad disconnected: ${e.gamepad.id}`);
            this.gamepads.delete(e.gamepad.index);
            this.previousGamepadButtons.delete(e.gamepad.index);
        });
    }
    
    /**
     * Update gamepad states - must be called each frame
     */
    update() {
        // Clear just pressed keys
        this.keyJustPressed.clear();
        
        // Update gamepad references (required for Chrome)
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (gamepad) {
                this.gamepads.set(gamepad.index, gamepad);
            }
        }
    }
    
    /**
     * Store previous button states after input processing
     */
    lateUpdate() {
        for (const [index, gamepad] of this.gamepads) {
            if (!gamepad || !gamepad.buttons) continue;
            
            let prev = this.previousGamepadButtons.get(index);
            // Reinitialize if array size doesn't match
            if (!prev || prev.length !== gamepad.buttons.length) {
                prev = new Array(gamepad.buttons.length).fill(false);
                this.previousGamepadButtons.set(index, prev);
            }
            
            for (let i = 0; i < gamepad.buttons.length; i++) {
                prev[i] = gamepad.buttons[i]?.pressed || false;
            }
        }
    }
    
    /**
     * Check if key is currently pressed
     */
    isKeyDown(code) {
        return this.keys.has(code);
    }
    
    /**
     * Check if key was just pressed this frame
     */
    isKeyJustPressed(code) {
        return this.keyJustPressed.has(code);
    }
    
    /**
     * Get movement input for a player (keyboard)
     */
    getKeyboardMovement(playerIndex) {
        const movement = new Vector2();
        
        if (playerIndex === 0) {
            // Player 1: WASD
            if (this.isKeyDown('KeyW')) movement.y -= 1;
            if (this.isKeyDown('KeyS')) movement.y += 1;
            if (this.isKeyDown('KeyA')) movement.x -= 1;
            if (this.isKeyDown('KeyD')) movement.x += 1;
        } else if (playerIndex === 1) {
            // Player 2: Arrow keys
            if (this.isKeyDown('ArrowUp')) movement.y -= 1;
            if (this.isKeyDown('ArrowDown')) movement.y += 1;
            if (this.isKeyDown('ArrowLeft')) movement.x -= 1;
            if (this.isKeyDown('ArrowRight')) movement.x += 1;
        } else if (playerIndex === 2) {
            // Player 3: IJKL
            if (this.isKeyDown('KeyI')) movement.y -= 1;
            if (this.isKeyDown('KeyK')) movement.y += 1;
            if (this.isKeyDown('KeyJ')) movement.x -= 1;
            if (this.isKeyDown('KeyL')) movement.x += 1;
        }
        // Player 4: Gamepad only
        
        // Normalize diagonal movement
        if (movement.magnitude() > 0) {
            movement.normalize();
        }
        
        return movement;
    }
    
    /**
     * Check if dash is pressed for a player (keyboard)
     */
    getKeyboardDash(playerIndex) {
        if (playerIndex === 0) {
            return this.isKeyJustPressed('ShiftLeft') || this.isKeyJustPressed('ShiftRight');
        } else if (playerIndex === 1) {
            return this.isKeyJustPressed('ControlRight');
        } else if (playerIndex === 2) {
            return this.isKeyJustPressed('KeyH');
        }
        // Player 4: Gamepad only
        return false;
    }
    
    /**
     * Get gamepad movement with deadzone
     */
    getGamepadMovement(gamepadIndex) {
        const gamepad = this.gamepads.get(gamepadIndex);
        if (!gamepad) return new Vector2();
        
        let x = gamepad.axes[0] || 0;
        let y = gamepad.axes[1] || 0;
        
        // Apply deadzone
        const deadzone = CONFIG.GAMEPAD.DEADZONE;
        const magnitude = Math.sqrt(x * x + y * y);
        
        if (magnitude < deadzone) {
            return new Vector2();
        }
        
        // Normalize and scale past deadzone
        const normalizedMagnitude = (magnitude - deadzone) / (1 - deadzone);
        x = (x / magnitude) * normalizedMagnitude;
        y = (y / magnitude) * normalizedMagnitude;
        
        return new Vector2(x, y);
    }
    
    /**
     * Check if dash button was just pressed on gamepad
     */
    getGamepadDash(gamepadIndex) {
        const gamepad = this.gamepads.get(gamepadIndex);
        const prev = this.previousGamepadButtons.get(gamepadIndex);
        
        if (!gamepad || !prev) return false;
        
        const buttonIndex = CONFIG.GAMEPAD.DASH_BUTTON;
        if (buttonIndex >= gamepad.buttons.length || buttonIndex >= prev.length) return false;
        
        const isPressed = gamepad.buttons[buttonIndex]?.pressed || false;
        const wasPressed = prev[buttonIndex] || false;
        
        return isPressed && !wasPressed;
    }
    
    /**
     * Get combined input for a player (keyboard + gamepad + touch)
     */
    getPlayerInput(playerIndex) {
        // Try keyboard first
        let movement = this.getKeyboardMovement(playerIndex);
        let dash = this.getKeyboardDash(playerIndex);
        
        // Check for gamepad input
        const gamepadMovement = this.getGamepadMovement(playerIndex);
        const gamepadDash = this.getGamepadDash(playerIndex);
        
        // Use gamepad if it has input
        if (gamepadMovement.magnitude() > 0) {
            movement = gamepadMovement;
        }
        
        if (gamepadDash) {
            dash = true;
        }
        
        // Touch controls only affect player 1 (index 0)
        if (playerIndex === 0 && this.touch.isTouch()) {
            const touchMovement = this.touch.getMovement();
            const touchDash = this.touch.getDash();
            
            if (touchMovement.magnitude() > 0) {
                movement = touchMovement;
            }
            
            if (touchDash) {
                dash = true;
            }
        }
        
        return { movement, dash };
    }
    
    /**
     * Check if start was pressed via touch
     */
    getTouchStart() {
        return this.touch.getStart();
    }
    
    /**
     * Enable touch controls
     */
    enableTouchControls() {
        this.touch.enable();
    }
    
    /**
     * Disable touch controls
     */
    disableTouchControls() {
        this.touch.disable();
    }
    
    /**
     * Show touch start button
     */
    showTouchStartButton() {
        this.touch.showStartButton();
    }
    
    /**
     * Hide touch start button
     */
    hideTouchStartButton() {
        this.touch.hideStartButton();
    }
    
    /**
     * Check if using touch device
     */
    isTouchDevice() {
        return this.touch.isTouch();
    }
    
    /**
     * Get number of connected gamepads
     */
    getConnectedGamepadCount() {
        return this.gamepads.size;
    }
}
