import { Game } from './core/Game.js';

/**
 * Entry point for Arena Brawler
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Initialize game
    const game = new Game(canvas);
    
    // Expose game instance for debugging
    window.game = game;
    
    console.log('%c⚔ Arena Brawler ⚔', 'font-size: 20px; font-weight: bold; color: #ff6b6b');
    console.log('%cLocal Multiplayer Brawler', 'font-size: 14px; color: #4ecdc4');
    console.log('');
    console.log('%c📋 CONTROLS:', 'font-weight: bold; color: #ffe66d');
    console.log('%c  Player 1: WASD + Shift (Dash)       OR  🎮 Gamepad 1', 'color: #ff6b6b');
    console.log('%c  Player 2: Arrow Keys + Right Ctrl   OR  🎮 Gamepad 2', 'color: #4ecdc4');
    console.log('%c  Player 3: IJKL + H (Dash)           OR  🎮 Gamepad 3', 'color: #ffe66d');
    console.log('%c  Player 4: 🎮 Gamepad 4 ONLY', 'color: #95e1d3');
    console.log('');
    console.log('%c🎮 GAMEPAD CONTROLS:', 'font-weight: bold; color: #4ecdc4');
    console.log('  Move: Left Stick');
    console.log('  Dash: B button (Xbox) / Circle (PlayStation)');
    console.log('  Start: A button (Xbox) / Cross (PlayStation)');
    console.log('');
    console.log('%c⏱ ESCALATION:', 'font-weight: bold; color: #ff4444');
    console.log('  • Damage increases over time');
    console.log('  • Arena shrinks at 8 seconds');
    console.log('  • Chaos mode activates at 12 seconds');
    console.log('  • FORCED RESOLUTION at 25 seconds - closest to center wins!');
    console.log('');
    console.log('Press SPACE or Gamepad A to start!');
});
