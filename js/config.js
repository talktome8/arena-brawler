/**
 * Game Configuration
 * Central place for all game constants and settings
 */
export const CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,
    
    // Arena settings
    ARENA: {
        PADDING: 50,
        BORDER_WIDTH: 4,
        BORDER_COLOR: '#ff4444',
        DANGER_ZONE_WIDTH: 30,
        BACKGROUND_COLOR: '#2a2a4a'
    },
    
    // Player settings
    PLAYER: {
        RADIUS: 25,
        MASS: 1,
        MAX_SPEED: 6,
        ACCELERATION: 0.8,
        FRICTION: 0.92,
        BOUNCE_FACTOR: 0.8,
        COLORS: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3']
    },
    
    // Dash settings
    DASH: {
        SPEED_MULTIPLIER: 3,
        DURATION: 150, // ms
        COOLDOWN: 1500, // ms
    },
    
    // Collision settings
    COLLISION: {
        PUSH_FORCE: 1.5,
        DASH_PUSH_MULTIPLIER: 2
    },
    
    // Gamepad settings
    GAMEPAD: {
        DEADZONE: 0.2,
        DASH_BUTTON: 1 // B button on Xbox, Circle on PlayStation
    },
    
    // Round settings
    ROUNDS: {
        WINS_NEEDED: 3, // Best of 5
        COUNTDOWN_DURATION: 3,
        ROUND_END_DELAY: 2000,
        MATCH_END_DELAY: 3000,
        MAX_ROUND_TIME: 25000 // 25 second hard limit per round
    },
    
    // Physics
    PHYSICS: {
        FIXED_TIMESTEP: 1000 / 60
    },
    
    // Escalation settings - force combat and resolution
    ESCALATION: {
        // Damage amplification over time
        BASE_DAMAGE_MULTIPLIER: 1.0,
        MAX_DAMAGE_MULTIPLIER: 2.5,
        DAMAGE_RAMP_START: 8000, // Start ramping at 8 seconds
        DAMAGE_RAMP_DURATION: 10000, // Reach max over 10 seconds
        
        // Instability - random forces that increase over time
        INSTABILITY_START: 12000, // Start at 12 seconds
        INSTABILITY_MAX_FORCE: 0.3,
        
        // Final resolution - guaranteed end
        FINAL_COUNTDOWN_START: 20000, // 20 seconds - start 5 second final countdown
        FINAL_COUNTDOWN_DURATION: 5000 // 5 second countdown to instant death
    },
    
    // Round Modifiers - add variety
    MODIFIERS: {
        NONE: { name: 'Standard', description: 'Normal rules', icon: '⚔️' },
        SLIPPERY: { name: 'Ice Arena', description: 'Low friction!', icon: '🧊', friction: 0.98 },
        HEAVY_HITS: { name: 'Heavy Hits', description: '2x knockback!', icon: '💥', pushMultiplier: 2.0 },
        TINY_ARENA: { name: 'Claustrophobic', description: 'Small arena!', icon: '📦', arenaScale: 0.7 },
        FAST_SHRINK: { name: 'Closing In', description: 'Fast shrinking!', icon: '⏱️', shrinkSpeed: 2.5 },
        TURBO: { name: 'Turbo Mode', description: 'Speed boost!', icon: '⚡', speedMultiplier: 1.4 },
        BOUNCY: { name: 'Bouncy', description: 'Extra bouncy!', icon: '🏀', bounceMultiplier: 1.5 }
    }
};
