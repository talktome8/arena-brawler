import { CONFIG } from '../config.js';

/**
 * Manages rounds and match state with escalation mechanics
 */
export class RoundManager {
    constructor() {
        this.currentRound = 0;
        this.state = 'waiting'; // waiting, countdown, playing, roundEnd, matchEnd
        this.countdownValue = 0;
        this.countdownTimer = 0;
        this.roundEndTimer = 0;
        this.winner = null;
        this.roundWinner = null;
        
        // Round time tracking for escalation
        this.roundTime = 0;
        
        // Current round modifier
        this.currentModifier = null;
        this.modifierKeys = Object.keys(CONFIG.MODIFIERS).filter(k => k !== 'NONE');
        
        // Escalation state
        this.damageMultiplier = CONFIG.ESCALATION.BASE_DAMAGE_MULTIPLIER;
        this.instabilityActive = false;
        this.finalCountdownActive = false;
        this.finalCountdownTime = 0;
        
        // Callbacks
        this.onCountdownTick = null;
        this.onRoundStart = null;
        this.onRoundEnd = null;
        this.onMatchEnd = null;
        this.onModifierAnnounce = null;
        this.onFinalCountdown = null;
        this.onEscalation = null;
    }
    
    /**
     * Get a random modifier for the round (with some probability of standard)
     */
    getRandomModifier() {
        // 40% chance of standard round, 60% chance of modifier
        if (Math.random() < 0.4) {
            return CONFIG.MODIFIERS.NONE;
        }
        const key = this.modifierKeys[Math.floor(Math.random() * this.modifierKeys.length)];
        return { key, ...CONFIG.MODIFIERS[key] };
    }
    
    /**
     * Start a new match
     */
    startMatch() {
        this.currentRound = 0;
        this.state = 'countdown';
        this.winner = null;
        this.startCountdown();
    }
    
    /**
     * Start the countdown
     */
    startCountdown() {
        this.countdownValue = CONFIG.ROUNDS.COUNTDOWN_DURATION;
        this.countdownTimer = 1000; // 1 second per count
        this.state = 'countdown';
        this.roundWinner = null;
        
        // Reset escalation state
        this.roundTime = 0;
        this.damageMultiplier = CONFIG.ESCALATION.BASE_DAMAGE_MULTIPLIER;
        this.instabilityActive = false;
        this.finalCountdownActive = false;
        this.finalCountdownTime = 0;
        
        // Pick modifier for this round (not first round - let players warm up)
        if (this.currentRound >= 1) {
            this.currentModifier = this.getRandomModifier();
        } else {
            this.currentModifier = CONFIG.MODIFIERS.NONE;
        }
        
        if (this.onCountdownTick) {
            this.onCountdownTick(this.countdownValue);
        }
    }
    
    /**
     * Update round state
     */
    update(deltaTime, players) {
        switch (this.state) {
            case 'countdown':
                this.updateCountdown(deltaTime);
                break;
            case 'playing':
                this.updatePlaying(deltaTime, players);
                break;
            case 'roundEnd':
                this.updateRoundEnd(deltaTime, players);
                break;
            case 'matchEnd':
                // Wait for restart
                break;
        }
    }
    
    /**
     * Update countdown timer
     */
    updateCountdown(deltaTime) {
        this.countdownTimer -= deltaTime;
        
        if (this.countdownTimer <= 0) {
            this.countdownValue--;
            
            if (this.countdownValue <= 0) {
                // Start the round
                this.state = 'playing';
                this.currentRound++;
                this.roundTime = 0;
                
                if (this.onRoundStart) {
                    this.onRoundStart(this.currentRound, this.currentModifier);
                }
                
                // Announce modifier if not standard
                if (this.currentModifier && this.currentModifier.name !== 'Standard' && this.onModifierAnnounce) {
                    this.onModifierAnnounce(this.currentModifier);
                }
                
                if (this.onCountdownTick) {
                    this.onCountdownTick(0); // Hide countdown
                }
            } else {
                this.countdownTimer = 1000;
                
                if (this.onCountdownTick) {
                    this.onCountdownTick(this.countdownValue);
                }
            }
        }
    }
    
    /**
     * Update playing state with escalation
     */
    updatePlaying(deltaTime, players) {
        this.roundTime += deltaTime;
        
        // Update damage multiplier based on time
        this.updateDamageMultiplier();
        
        // Check for instability activation
        if (!this.instabilityActive && this.roundTime >= CONFIG.ESCALATION.INSTABILITY_START) {
            this.instabilityActive = true;
            if (this.onEscalation) {
                this.onEscalation('instability', 'CHAOS MODE! Random forces active!');
            }
        }
        
        // Check for final countdown (guaranteed end)
        if (!this.finalCountdownActive && this.roundTime >= CONFIG.ESCALATION.FINAL_COUNTDOWN_START) {
            this.finalCountdownActive = true;
            this.finalCountdownTime = CONFIG.ESCALATION.FINAL_COUNTDOWN_DURATION;
            if (this.onFinalCountdown) {
                this.onFinalCountdown(Math.ceil(this.finalCountdownTime / 1000));
            }
        }
        
        // Update final countdown
        if (this.finalCountdownActive) {
            this.finalCountdownTime -= deltaTime;
            const secondsLeft = Math.ceil(this.finalCountdownTime / 1000);
            
            if (this.onFinalCountdown) {
                this.onFinalCountdown(secondsLeft);
            }
            
            // Force end when countdown reaches 0
            if (this.finalCountdownTime <= 0) {
                this.forceRoundEnd(players);
                return;
            }
        }
        
        // Check normal round end
        this.checkRoundEnd(players);
    }
    
    /**
     * Update damage multiplier based on round time
     */
    updateDamageMultiplier() {
        const rampStart = CONFIG.ESCALATION.DAMAGE_RAMP_START;
        const rampDuration = CONFIG.ESCALATION.DAMAGE_RAMP_DURATION;
        const baseMultiplier = CONFIG.ESCALATION.BASE_DAMAGE_MULTIPLIER;
        const maxMultiplier = CONFIG.ESCALATION.MAX_DAMAGE_MULTIPLIER;
        
        if (this.roundTime < rampStart) {
            this.damageMultiplier = baseMultiplier;
        } else {
            const progress = Math.min(1, (this.roundTime - rampStart) / rampDuration);
            this.damageMultiplier = baseMultiplier + (maxMultiplier - baseMultiplier) * progress;
        }
    }
    
    /**
     * Get instability force for a position
     */
    getInstabilityForce(x, y, arenaCenter) {
        if (!this.instabilityActive) return { x: 0, y: 0 };
        
        // Time-based chaotic force
        const time = this.roundTime * 0.001;
        const intensity = Math.min(1, (this.roundTime - CONFIG.ESCALATION.INSTABILITY_START) / 5000);
        const maxForce = CONFIG.ESCALATION.INSTABILITY_MAX_FORCE * intensity;
        
        // Pseudo-random force based on position and time
        const forceAngle = Math.sin(time * 2 + x * 0.01) * Math.cos(time * 1.5 + y * 0.01) * Math.PI * 2;
        const forceMag = (Math.sin(time * 3 + x * 0.02 + y * 0.02) * 0.5 + 0.5) * maxForce;
        
        return {
            x: Math.cos(forceAngle) * forceMag,
            y: Math.sin(forceAngle) * forceMag
        };
    }
    
    /**
     * Force round to end - pick winner based on arena position
     */
    forceRoundEnd(players) {
        const alivePlayers = players.filter(p => p.isAlive);
        
        if (alivePlayers.length === 0) {
            // All dead - no winner
            this.roundWinner = null;
        } else if (alivePlayers.length === 1) {
            // Single survivor
            this.roundWinner = alivePlayers[0];
        } else {
            // Multiple alive - player closest to center survives, eliminate others
            let closestPlayer = null;
            let closestDist = Infinity;
            
            for (const player of alivePlayers) {
                // Distance from center (will be calculated by game)
                const dist = player.distanceFromCenter || 0;
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                }
            }
            
            // Eliminate all except closest
            for (const player of alivePlayers) {
                if (player !== closestPlayer) {
                    player.eliminate();
                }
            }
            
            this.roundWinner = closestPlayer;
        }
        
        if (this.roundWinner) {
            this.roundWinner.addWin();
        }
        
        this.state = 'roundEnd';
        this.roundEndTimer = CONFIG.ROUNDS.ROUND_END_DELAY;
        
        if (this.onRoundEnd) {
            this.onRoundEnd(this.roundWinner, this.currentRound, 'timeout');
        }
    }
    
    /**
     * Check if round should end
     */
    checkRoundEnd(players) {
        const alivePlayers = players.filter(p => p.isAlive);
        
        if (alivePlayers.length <= 1) {
            this.roundWinner = alivePlayers.length === 1 ? alivePlayers[0] : null;
            
            if (this.roundWinner) {
                this.roundWinner.addWin();
            }
            
            this.state = 'roundEnd';
            this.roundEndTimer = CONFIG.ROUNDS.ROUND_END_DELAY;
            
            if (this.onRoundEnd) {
                this.onRoundEnd(this.roundWinner, this.currentRound, 'knockout');
            }
        }
    }
    
    /**
     * Update round end timer
     */
    updateRoundEnd(deltaTime, players) {
        this.roundEndTimer -= deltaTime;
        
        if (this.roundEndTimer <= 0) {
            // Check for match winner
            const matchWinner = players.find(p => p.hasWonMatch());
            
            if (matchWinner) {
                this.winner = matchWinner;
                this.state = 'matchEnd';
                this.roundEndTimer = CONFIG.ROUNDS.MATCH_END_DELAY;
                
                if (this.onMatchEnd) {
                    this.onMatchEnd(matchWinner);
                }
            } else {
                // Start next round
                this.startCountdown();
            }
        }
    }
    
    /**
     * Check if game is in playing state
     */
    isPlaying() {
        return this.state === 'playing';
    }
    
    /**
     * Check if waiting for start
     */
    isWaiting() {
        return this.state === 'waiting';
    }
    
    /**
     * Check if match is over
     */
    isMatchOver() {
        return this.state === 'matchEnd';
    }
    
    /**
     * Get current state info for UI
     */
    getStateInfo() {
        return {
            state: this.state,
            round: this.currentRound,
            countdown: this.countdownValue,
            winner: this.winner,
            roundWinner: this.roundWinner,
            modifier: this.currentModifier,
            roundTime: this.roundTime,
            damageMultiplier: this.damageMultiplier,
            instabilityActive: this.instabilityActive,
            finalCountdownActive: this.finalCountdownActive,
            finalCountdownTime: this.finalCountdownTime
        };
    }
}
