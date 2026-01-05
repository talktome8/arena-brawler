import { CONFIG } from '../config.js';
import { InputManager } from './InputManager.js';
import { Physics } from './Physics.js';
import { RoundManager } from './RoundManager.js';
import { Arena } from '../entities/Arena.js';
import { Player } from '../entities/Player.js';
import { UI } from '../ui/UI.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { ScreenEffects } from '../effects/ScreenEffects.js';

/**
 * Main Game class - orchestrates all game systems
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Store base dimensions for scaling
        this.baseWidth = CONFIG.CANVAS_WIDTH;
        this.baseHeight = CONFIG.CANVAS_HEIGHT;
        this.scale = 1;
        
        // Set canvas size (responsive)
        this.resizeCanvas();
        
        // Initialize systems
        this.input = new InputManager();
        this.roundManager = new RoundManager();
        this.ui = new UI();
        this.particles = new ParticleSystem();
        this.screenEffects = new ScreenEffects();
        
        // Initialize arena
        this.arena = new Arena(this.baseWidth, this.baseHeight);
        
        // Initialize players
        this.playerCount = 2; // Default to 2 players
        this.players = [];
        this.initializePlayers();
        
        // Current round modifier effects
        this.activeModifier = null;
        
        // Setup round manager callbacks
        this.setupRoundCallbacks();
        
        // Game loop timing
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.roundResetDone = false;
        
        // Set canvas rect for UI positioning
        this.updateCanvasRect();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.updateCanvasRect();
        });
        
        // Show waiting message
        this.ui.showWaitingMessage();
        
        // Setup start game listener
        this.setupStartListener();
        
        // Start game loop
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Resize canvas to fit screen while maintaining aspect ratio
     */
    resizeCanvas() {
        const maxWidth = Math.min(window.innerWidth - 20, this.baseWidth);
        const maxHeight = Math.min(window.innerHeight - 250, this.baseHeight); // Leave room for HUD
        
        const scaleX = maxWidth / this.baseWidth;
        const scaleY = maxHeight / this.baseHeight;
        this.scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
        
        // Keep internal resolution at base size for consistent gameplay
        this.canvas.width = this.baseWidth;
        this.canvas.height = this.baseHeight;
        
        // Scale the canvas element visually
        this.canvas.style.width = `${this.baseWidth * this.scale}px`;
        this.canvas.style.height = `${this.baseHeight * this.scale}px`;
    }
    
    /**
     * Initialize players at spawn positions
     */
    initializePlayers() {
        this.players = [];
        const spawnPositions = this.arena.getSpawnPositions(this.playerCount);
        
        for (let i = 0; i < this.playerCount; i++) {
            const spawn = spawnPositions[i];
            const color = CONFIG.PLAYER.COLORS[i];
            const player = new Player(i, spawn.x, spawn.y, color);
            this.players.push(player);
        }
        
        this.ui.initScoreboard(this.players);
        this.roundResetDone = false; // Ensure reset happens when match starts
    }
    
    /**
     * Setup round manager callbacks
     */
    setupRoundCallbacks() {
        this.roundManager.onCountdownTick = (value) => {
            this.ui.showCountdown(value);
            if (value > 0) {
                // Pulse effect on countdown
                this.screenEffects.flash('#ffffff', 0.1);
            }
        };
        
        this.roundManager.onRoundStart = (round, modifier) => {
            this.roundResetDone = false; // Allow reset for next round
            this.activeModifier = modifier;
            this.ui.hideWinner();
            this.screenEffects.flash('#4ecdc4', 0.3);
            
            // Apply modifier to arena if needed
            if (modifier && modifier.key === 'TINY_ARENA') {
                this.arena.setScale(modifier.arenaScale);
            } else if (modifier && modifier.key === 'FAST_SHRINK') {
                this.arena.setShrinkSpeed(modifier.shrinkSpeed);
            }
            
            // Burst particles at center
            this.particles.burst(
                this.arena.centerX,
                this.arena.centerY,
                30,
                { color: '#4ecdc4', size: 6, speed: 8 }
            );
            // Show alive counter for 3+ players
            if (this.playerCount > 2) {
                this.ui.updateAliveCounter(this.playerCount, this.playerCount);
            }
            console.log(`Round ${round} started! Modifier: ${modifier?.name || 'Standard'}`);
        };
        
        this.roundManager.onModifierAnnounce = (modifier) => {
            this.ui.showModifierAnnouncement(modifier);
            this.screenEffects.flash(modifier.key === 'HEAVY_HITS' ? '#ff4444' : '#ffe66d', 0.3);
        };
        
        this.roundManager.onEscalation = (type, message) => {
            this.ui.showEscalationWarning(message);
            this.screenEffects.shake(10, 300);
            this.screenEffects.flash('#ff4444', 0.2);
        };
        
        this.roundManager.onFinalCountdown = (seconds) => {
            this.ui.showFinalCountdown(seconds);
            if (seconds > 0) {
                this.screenEffects.shake(5 + (5 - seconds) * 2, 200);
            }
        };
        
        this.roundManager.onCentrifugeStart = () => {
            // Activate centrifuge mode in arena
            this.arena.activateCentrifuge();
            this.ui.hideFinalCountdown();
            this.screenEffects.flash('#44ff44', 0.4);
            this.screenEffects.shake(15, 400);
            
            // Burst of green particles
            this.particles.burst(
                this.arena.centerX,
                this.arena.centerY,
                50,
                { color: '#44ff44', size: 8, speed: 12 }
            );
        };
        
        this.roundManager.onRoundEnd = (winner, round, reason) => {
            this.ui.showRoundWinner(winner, round, this.playerCount, reason);
            this.ui.updateScoreboard(this.players);
            this.ui.hideAliveCounter();
            this.ui.hideFinalCountdown();
            
            // Reset modifier
            this.activeModifier = null;
            
            if (winner) {
                // Show winner crown above survivor
                this.ui.showSurvivorText(winner.position.x, winner.position.y, winner.color);
                
                // Victory particles
                this.particles.burst(
                    winner.position.x,
                    winner.position.y,
                    40,
                    { color: winner.color, size: 8, speed: 10, life: 1.5 }
                );
                
                // Victory flash
                this.screenEffects.flash(winner.color, 0.3);
            } else {
                // Draw - dramatic effect
                this.screenEffects.flash('#ff4444', 0.4);
                this.screenEffects.shake(10, 300);
            }
        };
        
        this.roundManager.onMatchEnd = (winner) => {
            this.ui.showMatchWinner(winner);
            // Big celebration
            this.screenEffects.flash(winner.color, 0.5);
            this.screenEffects.shake(15, 500);
            
            // Fireworks effect
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const x = this.arena.bounds.left + Math.random() * this.arena.width;
                    const y = this.arena.bounds.top + Math.random() * this.arena.height;
                    this.particles.burst(x, y, 30, {
                        color: CONFIG.PLAYER.COLORS[Math.floor(Math.random() * 4)],
                        size: 6,
                        speed: 8,
                        gravity: 0.1
                    });
                }, i * 200);
            }
            
            console.log(`Player ${winner.id + 1} wins the match!`);
        };
    }
    
    /**
     * Setup start game listener
     */
    setupStartListener() {
        // Keyboard start (SPACE)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.roundManager.isWaiting() || this.roundManager.isMatchOver()) {
                    this.startNewMatch();
                }
            }
        });
        
        // Gamepad start (A button / Cross) - check in game loop
        this.gamepadStartPreviousState = new Map();
        
        // Player count buttons
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const count = parseInt(e.target.dataset.count);
                this.setPlayerCount(count);
                
                // Update button states
                document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update player slot visibility
                document.querySelectorAll('.player-slot').forEach(slot => {
                    const playerNum = parseInt(slot.dataset.player);
                    slot.classList.toggle('hidden', playerNum > count);
                });
            });
        });
        
        // Set default active button and slot visibility
        const defaultBtn = document.querySelector('.player-btn[data-count="2"]');
        if (defaultBtn) defaultBtn.classList.add('active');
        // Initialize slots visibility for 2 players
        document.querySelectorAll('.player-slot').forEach(slot => {
            const playerNum = parseInt(slot.dataset.player);
            slot.classList.toggle('hidden', playerNum > 2);
        });
    }
    
    /**
     * Update canvas rect for UI positioning
     */
    updateCanvasRect() {
        const rect = this.canvas.getBoundingClientRect();
        this.ui.setCanvasRect(rect);
    }
    
    /**
     * Start a new match
     */
    startNewMatch() {
        // Reset arena to original bounds
        this.arena.reset();
        
        // Update spawn positions and reset players
        const spawnPositions = this.arena.getSpawnPositions(this.playerCount);
        for (let i = 0; i < this.players.length; i++) {
            const spawn = spawnPositions[i];
            this.players[i].setSpawnPosition(spawn.x, spawn.y);
            this.players[i].wins = 0;
            this.players[i].reset();
        }
        
        this.particles.clear();
        this.roundResetDone = true; // Mark as done so countdown doesn't reset again
        this.ui.resetForMatch(this.players);
        this.roundManager.startMatch();
    }
    
    /**
     * Reset players for new round
     */
    resetForRound() {
        // Reset arena first to restore original bounds
        this.arena.reset();
        
        // Update spawn positions based on reset arena and reset players
        const spawnPositions = this.arena.getSpawnPositions(this.playerCount);
        for (let i = 0; i < this.players.length; i++) {
            const spawn = spawnPositions[i];
            this.players[i].setSpawnPosition(spawn.x, spawn.y);
            this.players[i].reset();
        }
        
        this.particles.clear();
        this.ui.resetForRound(this.players);
    }
    
    /**
     * Check gamepad start button (A/Cross - button 0)
     */
    checkGamepadStart() {
        if (!this.roundManager.isWaiting() && !this.roundManager.isMatchOver()) return;
        
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (!gp) continue;
            
            const startButton = gp.buttons[0]; // A on Xbox, Cross on PlayStation
            const wasPressed = this.gamepadStartPreviousState.get(gp.index) || false;
            const isPressed = startButton?.pressed || false;
            
            // Update previous state
            this.gamepadStartPreviousState.set(gp.index, isPressed);
            
            // Detect just pressed
            if (isPressed && !wasPressed) {
                this.startNewMatch();
                return;
            }
        }
    }
    
    /**
     * Check touch start button
     */
    checkTouchStart() {
        if (!this.roundManager.isWaiting() && !this.roundManager.isMatchOver()) return;
        
        if (this.input.getTouchStart()) {
            this.startNewMatch();
        }
    }
    
    /**
     * Update touch controls visibility based on game state
     */
    updateTouchControls() {
        if (!this.input.isTouchDevice()) return;
        
        if (this.roundManager.isWaiting() || this.roundManager.isMatchOver()) {
            this.input.disableTouchControls();
            this.input.showTouchStartButton();
        } else if (this.roundManager.isPlaying()) {
            this.input.enableTouchControls();
            this.input.hideTouchStartButton();
        } else {
            // Countdown or other states
            this.input.disableTouchControls();
            this.input.hideTouchStartButton();
        }
    }
    
    /**
     * Main game loop
     */
    gameLoop(currentTime) {
        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update input
        this.input.update();
        
        // Check gamepad start button
        this.checkGamepadStart();
        
        // Check touch start button
        this.checkTouchStart();
        
        // Update touch controls visibility
        this.updateTouchControls();
        
        // Update screen effects
        this.screenEffects.update(deltaTime);
        
        // Get time scale for slow motion
        const timeScale = this.screenEffects.getTimeScale();
        const scaledDelta = deltaTime * timeScale;
        
        // Fixed timestep for physics
        this.accumulator += scaledDelta;
        const fixedDelta = CONFIG.PHYSICS.FIXED_TIMESTEP;
        
        while (this.accumulator >= fixedDelta) {
            this.fixedUpdate(fixedDelta);
            this.accumulator -= fixedDelta;
        }
        
        // Store previous input states
        this.input.lateUpdate();
        
        // Update particles (always at full speed for smoothness)
        this.particles.update();
        
        // Render
        this.render();
        
        // Continue loop
        requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Fixed timestep update for physics
     */
    fixedUpdate(deltaTime) {
        // Update round manager
        this.roundManager.update(deltaTime, this.players);
        
        // Update arena
        this.arena.update(deltaTime, this.roundManager.isPlaying());
        
        // Only process game logic if playing
        if (!this.roundManager.isPlaying()) {
            // Reset players at start of countdown (only once per countdown)
            if (this.roundManager.state === 'countdown' && !this.roundResetDone) {
                this.resetForRound();
                this.roundResetDone = true;
            }
            return;
        }
        
        // Get current modifier effects
        const modifier = this.activeModifier;
        const frictionMod = modifier?.friction || 1;
        const speedMod = modifier?.speedMultiplier || 1;
        const pushMod = modifier?.pushMultiplier || 1;
        const bounceMod = modifier?.bounceMultiplier || 1;
        
        // Process player input and movement
        for (const player of this.players) {
            const input = this.input.getPlayerInput(player.id);
            const result = player.handleInput(input, deltaTime, speedMod);
            
            // Create dash effects - ENHANCED
            if (result && result.dashStarted) {
                const angle = player.getMoveAngle();
                this.particles.dashStart(
                    player.position.x,
                    player.position.y,
                    angle,
                    player.color
                );
                // Show dash text
                this.ui.showDashText(player.position.x, player.position.y, player.color);
                // Stronger screen shake
                this.screenEffects.shake(8, 150);
                // Brief slow-mo for impact feel
                this.screenEffects.slowMotion(0.7, 50);
            }
            
            player.update(deltaTime, this.arena, frictionMod);
            
            // Calculate distance from center for forced resolution
            player.distanceFromCenter = Math.sqrt(
                Math.pow(player.position.x - this.arena.centerX, 2) +
                Math.pow(player.position.y - this.arena.centerY, 2)
            );
            
            // Apply centrifuge force (pushes players outward from spinning)
            if (player.isAlive && this.arena.centrifugeMode) {
                const force = this.arena.getCentrifugeForce(player.position.x, player.position.y);
                player.velocity.x += force.x;
                player.velocity.y += force.y;
                
                // Centrifuge spark particles
                if (Math.random() < 0.25) {
                    this.particles.trail(player.position.x, player.position.y, {
                        color: '#44ff44',
                        size: 4
                    });
                }
            }
            
            // Apply sudden death force - pushes players toward center
            if (player.isAlive && this.arena.suddenDeathActive && !this.arena.centrifugeMode) {
                const force = this.arena.getSuddenDeathForce(player.position.x, player.position.y);
                player.velocity.x += force.x;
                player.velocity.y += force.y;
                
                // Sudden death spark particles
                if (Math.random() < 0.3) {
                    this.particles.trail(player.position.x, player.position.y, {
                        color: '#ff4444',
                        size: 4
                    });
                }
            }
            
            // Apply instability forces (chaos mode)
            if (player.isAlive && this.roundManager.instabilityActive) {
                const instForce = this.roundManager.getInstabilityForce(
                    player.position.x, 
                    player.position.y,
                    { x: this.arena.centerX, y: this.arena.centerY }
                );
                player.velocity.x += instForce.x;
                player.velocity.y += instForce.y;
                
                // Chaos particles
                if (Math.random() < 0.15) {
                    this.particles.trail(player.position.x, player.position.y, {
                        color: '#ff66ff',
                        size: 3
                    });
                }
            }
            
            // Apply idle penalty - push toward edge if idle too long
            if (player.isIdle && player.isAlive) {
                const centerX = this.arena.centerX;
                const centerY = this.arena.centerY;
                const dirX = player.position.x - centerX;
                const dirY = player.position.y - centerY;
                const dist = Math.sqrt(dirX * dirX + dirY * dirY);
                if (dist > 1) {
                    const pushForce = 0.15;
                    player.velocity.x += (dirX / dist) * pushForce;
                    player.velocity.y += (dirY / dist) * pushForce;
                }
                
                // Warning particles
                if (Math.random() < 0.2) {
                    this.particles.trail(player.position.x, player.position.y, {
                        color: '#ff4444',
                        size: 3
                    });
                }
            }
            
            // Trail particles when dashing
            if (player.isDashing) {
                this.particles.trail(player.position.x, player.position.y, {
                    color: player.color,
                    size: 4
                });
            }
            
            // Edge warning particles
            if (player.nearEdge && Math.random() < player.edgeWarningIntensity * 0.3) {
                this.particles.edgeWarning(player.position.x, player.position.y, player.color);
            }
        }
        
        // Update alive count for sudden death tracking
        const aliveCount = this.players.filter(p => p.isAlive).length;
        this.arena.setAliveCount(aliveCount);
        
        // Process collisions with effects (including damage multiplier)
        this.processCollisionsWithEffects(pushMod, bounceMod);
        
        // Check arena boundaries
        for (const player of this.players) {
            if (Physics.checkArenaBoundary(player, this.arena)) {
                this.onPlayerEliminated(player);
            }
        }
    }
    
    /**
     * Process collisions and create effects
     */
    processCollisionsWithEffects(pushMod = 1, bounceMod = 1) {
        // Get damage multiplier from escalation
        const damageMultiplier = this.roundManager.damageMultiplier || 1;
        
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                const p1 = this.players[i];
                const p2 = this.players[j];
                
                if (!p1.isAlive || !p2.isAlive) continue;
                
                if (Physics.checkCircleCollision(p1, p2)) {
                    // Calculate collision intensity based on relative velocity
                    const relVelX = p1.velocity.x - p2.velocity.x;
                    const relVelY = p1.velocity.y - p2.velocity.y;
                    const intensity = Math.sqrt(relVelX * relVelX + relVelY * relVelY) / 10;
                    
                    // Collision point
                    const midX = (p1.position.x + p2.position.x) / 2;
                    const midY = (p1.position.y + p2.position.y) / 2;
                    
                    // Create collision effects - ENHANCED
                    if (intensity > 0.3) {
                        this.particles.collision(midX, midY, p1.color, p2.color, intensity * damageMultiplier);
                        this.screenEffects.impact(intensity * damageMultiplier);
                        
                        // Apply hit flash to players
                        p1.onHit(intensity);
                        p2.onHit(intensity);
                        
                        // Show hit text for strong impacts
                        if (intensity > 0.8) {
                            const hitText = damageMultiplier > 1.5 ? '💥 MEGA HIT!' : null;
                            this.ui.showHitText(midX, midY, intensity * damageMultiplier, hitText);
                        }
                    }
                    
                    // Resolve the collision with modifiers
                    Physics.resolveCollision(p1, p2, damageMultiplier * pushMod, bounceMod);
                }
            }
        }
    }
    
    /**
     * Handle player elimination
     */
    onPlayerEliminated(player) {
        // Create elimination explosion
        this.particles.elimination(
            player.position.x,
            player.position.y,
            player.color
        );
        
        // Screen effects - ENHANCED
        this.screenEffects.elimination();
        this.arena.triggerBorderGlow();
        
        // Show elimination text
        this.ui.showEliminationText(
            player.position.x, 
            player.position.y, 
            player.id + 1, 
            player.color
        );
        
        // Eliminate player
        player.eliminate();
        this.ui.updateScoreboard(this.players);
        
        // Update alive counter
        const aliveCount = this.players.filter(p => p.isAlive).length;
        this.ui.updateAliveCounter(aliveCount, this.playerCount);
    }
    
    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        
        // Apply screen effects (shake, zoom)
        this.screenEffects.preRender(ctx, this.canvas);
        
        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render arena
        this.arena.render(ctx);
        
        // Render particles (behind players)
        this.particles.render(ctx);
        
        // Render players
        for (const player of this.players) {
            player.render(ctx);
        }
        
        // Render round info
        this.renderRoundInfo();
        
        // Apply post-render effects (flash, vignette)
        this.screenEffects.postRender(ctx, this.canvas);
    }
    
    /**
     * Render round information
     */
    renderRoundInfo() {
        if (this.roundManager.currentRound > 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(
                `Round ${this.roundManager.currentRound}`,
                this.canvas.width - 20,
                30
            );
            
            // Show damage multiplier if elevated
            if (this.roundManager.damageMultiplier > 1.1) {
                const dmgPercent = Math.round((this.roundManager.damageMultiplier - 1) * 100);
                this.ctx.fillStyle = `rgba(255, ${Math.max(0, 200 - dmgPercent * 2)}, ${Math.max(0, 200 - dmgPercent * 2)}, 0.8)`;
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText(
                    `DMG +${dmgPercent}%`,
                    this.canvas.width - 20,
                    50
                );
            }
        }
        
        // Show modifier if active
        if (this.activeModifier && this.activeModifier.name !== 'Standard' && this.roundManager.isPlaying()) {
            this.ctx.fillStyle = 'rgba(255, 230, 109, 0.8)';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                `${this.activeModifier.icon} ${this.activeModifier.name}`,
                20,
                30
            );
        }
        
        // Show shrink warning countdown
        if (this.roundManager.isPlaying()) {
            const timeUntilShrink = Math.max(0, this.arena.shrinkStartTime - this.arena.roundTime);
            
            if (timeUntilShrink > 0 && timeUntilShrink <= 5000) {
                // Warning: arena about to shrink
                const seconds = Math.ceil(timeUntilShrink / 1000);
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = `rgba(255, 100, 100, ${0.7 + Math.sin(Date.now() * 0.01) * 0.3})`;
                this.ctx.fillText(
                    `Arena shrinks in ${seconds}...`,
                    this.canvas.width / 2,
                    80
                );
            }
            
            // Show chaos mode indicator
            if (this.roundManager.instabilityActive && !this.roundManager.finalCountdownActive) {
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                const pulseAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
                this.ctx.fillStyle = `rgba(255, 102, 255, ${pulseAlpha})`;
                this.ctx.fillText(
                    '⚡ CHAOS MODE ⚡',
                    this.canvas.width / 2,
                    this.canvas.height - 30
                );
            }
        }
    }
    
    /**
     * Set player count (2-4)
     */
    setPlayerCount(count) {
        this.playerCount = Math.max(2, Math.min(4, count));
        this.arena.reset(); // Reset arena bounds before recalculating spawn positions
        this.initializePlayers();
        this.roundResetDone = false; // Allow reset when new match starts
    }
}
