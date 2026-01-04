import { CONFIG } from '../config.js';

/**
 * UI Manager - handles scoreboard and overlays with animations
 */
export class UI {
    constructor() {
        this.scoreboardElement = document.getElementById('scoreboard');
        this.countdownElement = document.getElementById('countdown');
        this.winnerElement = document.getElementById('winner-announcement');
        this.aliveCounterElement = document.getElementById('alive-counter');
        this.floatingTextsElement = document.getElementById('floating-texts');
        this.gamepadStatusElement = document.getElementById('gamepad-status');
        
        // Animation state
        this.countdownScale = 1;
        
        // Track canvas position for floating text positioning
        this.canvasRect = null;
        
        // Final countdown element (created dynamically)
        this.finalCountdownElement = null;
        
        // Start gamepad polling
        this.pollGamepads();
    }
    
    /**
     * Poll for gamepad status and update display
     */
    pollGamepads() {
        this.updateGamepadStatus();
        setInterval(() => this.updateGamepadStatus(), 1000);
    }
    
    /**
     * Update gamepad status display
     */
    updateGamepadStatus() {
        if (!this.gamepadStatusElement) return;
        
        const gamepads = navigator.getGamepads();
        let connectedCount = 0;
        const connectedNames = [];
        
        for (const gp of gamepads) {
            if (gp) {
                connectedCount++;
                // Simplify gamepad name
                let name = gp.id.split('(')[0].trim();
                if (name.length > 20) name = name.substring(0, 17) + '...';
                connectedNames.push(name);
            }
        }
        
        if (connectedCount > 0) {
            this.gamepadStatusElement.innerHTML = `<span class="gamepad-icon">🎮</span>${connectedCount} gamepad${connectedCount > 1 ? 's' : ''} connected<br><small style="color:#4ecdc4">P1-P4 can use gamepad!</small>`;
            this.gamepadStatusElement.classList.add('connected');
            this.gamepadStatusElement.title = connectedNames.join(', ');
        } else {
            this.gamepadStatusElement.innerHTML = `<span class="gamepad-icon">🎮</span>No gamepads<br><small>Connect controller anytime</small>`;
            this.gamepadStatusElement.classList.remove('connected');
            this.gamepadStatusElement.title = 'Connect a gamepad to use it for any player';
        }
    }
    
    /**
     * Update canvas reference for positioning
     */
    setCanvasRect(rect) {
        this.canvasRect = rect;
    }
    
    /**
     * Initialize scoreboard for players
     */
    initScoreboard(players) {
        if (!this.scoreboardElement) return;
        
        this.scoreboardElement.innerHTML = '';
        
        for (const player of players) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-score';
            playerDiv.id = `player-score-${player.id}`;
            playerDiv.style.setProperty('--player-color', player.color);
            
            // Player indicator
            const indicator = document.createElement('div');
            indicator.className = 'player-indicator';
            indicator.style.background = player.color;
            indicator.textContent = player.id + 1;
            playerDiv.appendChild(indicator);
            
            // Player info container
            const infoDiv = document.createElement('div');
            infoDiv.className = 'player-info';
            
            // Player name
            const nameDiv = document.createElement('div');
            nameDiv.className = 'name';
            nameDiv.textContent = `Player ${player.id + 1}`;
            infoDiv.appendChild(nameDiv);
            
            // Win pips
            const winsDiv = document.createElement('div');
            winsDiv.className = 'wins';
            
            for (let i = 0; i < CONFIG.ROUNDS.WINS_NEEDED; i++) {
                const pip = document.createElement('div');
                pip.className = 'win-pip';
                pip.style.borderColor = player.color;
                winsDiv.appendChild(pip);
            }
            
            infoDiv.appendChild(winsDiv);
            playerDiv.appendChild(infoDiv);
            this.scoreboardElement.appendChild(playerDiv);
        }
    }
    
    /**
     * Update scoreboard
     */
    updateScoreboard(players) {
        if (!this.scoreboardElement) return;
        
        for (const player of players) {
            const playerDiv = document.getElementById(`player-score-${player.id}`);
            if (!playerDiv) continue;
            
            // Update eliminated state
            if (player.isAlive) {
                playerDiv.classList.remove('eliminated');
            } else {
                playerDiv.classList.add('eliminated');
            }
            
            // Update win pips with animation
            const pips = playerDiv.querySelectorAll('.win-pip');
            pips.forEach((pip, index) => {
                if (index < player.wins) {
                    if (!pip.classList.contains('filled')) {
                        pip.classList.add('filled');
                        pip.style.background = player.color;
                        // Trigger animation
                        pip.style.animation = 'none';
                        pip.offsetHeight; // Trigger reflow
                        pip.style.animation = 'pipFill 0.3s ease-out';
                    }
                } else {
                    pip.classList.remove('filled');
                    pip.style.background = 'transparent';
                }
            });
        }
    }
    
    /**
     * Show countdown with animation
     */
    showCountdown(value) {
        if (!this.countdownElement) return;
        
        if (value > 0) {
            this.countdownElement.textContent = value;
            this.countdownElement.classList.add('visible');
            
            // Trigger pop animation
            this.countdownElement.style.animation = 'none';
            this.countdownElement.offsetHeight;
            this.countdownElement.style.animation = 'countdownPop 0.5s ease-out';
        } else {
            // Show "GO!" with different style
            this.countdownElement.textContent = 'GO!';
            this.countdownElement.classList.add('go');
            this.countdownElement.style.animation = 'none';
            this.countdownElement.offsetHeight;
            this.countdownElement.style.animation = 'goPop 0.5s ease-out';
            
            const countdownEl = this.countdownElement;
            setTimeout(() => {
                if (countdownEl) {
                    countdownEl.classList.remove('visible', 'go');
                }
            }, 500);
        }
    }
    
    /**
     * Hide countdown
     */
    hideCountdown() {
        if (!this.countdownElement) return;
        this.countdownElement.classList.remove('visible', 'go');
    }
    
    /**
     * Show round winner with progress
     */
    showRoundWinner(winner, round, totalPlayers, reason = 'knockout') {
        if (!this.winnerElement) return;
        
        const winsNeeded = CONFIG.ROUNDS.WINS_NEEDED;
        if (winner) {
            const winsRemaining = winsNeeded - winner.wins;
            let progressText = '';
            let reasonText = '';
            
            if (winsRemaining === 0) {
                progressText = `<div class="progress-text match-point">🏆 MATCH WINNER! 🏆</div>`;
            } else if (winsRemaining === 1) {
                progressText = `<div class="progress-text match-point">⚠️ MATCH POINT! ⚠️</div>`;
            } else {
                progressText = `<div class="progress-text">${winner.wins}/${winsNeeded} wins</div>`;
            }
            
            // Explain why they won based on reason
            if (reason === 'timeout') {
                reasonText = `<div class="last-survivor" style="color:#ff6b6b">⏱️ TIME'S UP! Closest to center wins!</div>`;
            } else if (totalPlayers > 2) {
                reasonText = `<div class="last-survivor">Last player standing!</div>`;
            } else {
                reasonText = `<div class="last-survivor">Knocked out opponent!</div>`;
            }
            
            // Add next round hint unless it's a match winner
            let nextRoundHint = '';
            if (winsRemaining > 0) {
                nextRoundHint = `<div class="next-round-hint">Next round starting...</div>`;
            }
            
            this.winnerElement.innerHTML = `
                <div class="round-win-text">🎯 Round ${round} 🎯</div>
                <div class="winner-name" style="color: ${winner.color}">
                    Player ${winner.id + 1} wins!
                </div>
                ${reasonText}
                ${progressText}
                ${nextRoundHint}
            `;
        } else {
            this.winnerElement.innerHTML = `
                <div class="round-win-text">Round ${round}</div>
                <div class="winner-name" style="color: #ff6b6b">⚔️ DRAW! ⚔️</div>
                <div class="draw-explanation">All players eliminated simultaneously!</div>
                <div class="progress-text">No points awarded</div>
                <div class="next-round-hint">Next round starting...</div>
            `;
        }
        this.winnerElement.classList.add('visible');
    }
    
    /**
     * Show match winner
     */
    showMatchWinner(winner) {
        if (!this.winnerElement) return;
        
        this.winnerElement.innerHTML = `
            <div class="trophy">🏆</div>
            <div class="match-winner" style="color: ${winner.color}">
                Player ${winner.id + 1}
            </div>
            <div class="wins-text">WINNER!</div>
            <div class=\"restart-hint\">Press <span class=\"key-inline\">SPACE</span> or <span class=\"key-inline gamepad-inline\">\ud83c\udfae A</span> to Restart</div>
        `;
        this.winnerElement.classList.add('visible', 'match-win');
    }
    
    /**
     * Show waiting message with tutorial
     */
    showWaitingMessage() {
        if (!this.winnerElement) return;
        
        this.winnerElement.innerHTML = `
            <div class="title-text">⚔ Arena Brawler ⚔</div>
            <div class="subtitle">KNOCK OUT YOUR OPPONENTS!</div>
            <div class="game-rules">
                <div class="rule-item">
                    <span class="rule-icon">💥</span>
                    <span class="rule-text">Slam into opponents to push them out</span>
                </div>
                <div class="rule-item">
                    <span class="rule-icon">⚡</span>
                    <span class="rule-text"><strong>DASH</strong> for devastating knockback</span>
                </div>
                <div class="rule-item">
                    <span class="rule-icon">⏱</span>
                    <span class="rule-text">Arena shrinks! <strong>25s MAX</strong> per round</span>
                </div>
                <div class="rule-item">
                    <span class="rule-icon">�</span>
                    <span class="rule-text"><strong>First to 3 wins</strong> takes the match</span>
                </div>
            </div>
            <div class="start-hint">Press <span class="key-inline">SPACE</span> or <span class="key-inline gamepad-inline">🎮 A</span> to FIGHT!</div>
        `;
        this.winnerElement.classList.add('visible');
    }
    
    /**
     * Hide winner announcement
     */
    hideWinner() {
        if (!this.winnerElement) return;
        this.winnerElement.classList.remove('visible', 'match-win');
    }
    
    /**
     * Show floating text at a position (canvas coordinates)
     */
    showFloatingText(x, y, text, type = 'hit', color = null) {
        if (!this.floatingTextsElement || !this.canvasRect) return;
        
        const textEl = document.createElement('div');
        textEl.className = `floating-text ${type}`;
        textEl.textContent = text;
        
        // Position relative to canvas
        textEl.style.left = `${this.canvasRect.left + x}px`;
        textEl.style.top = `${this.canvasRect.top + y}px`;
        textEl.style.transform = 'translate(-50%, -50%)';
        
        if (color) {
            textEl.style.color = color;
        }
        
        this.floatingTextsElement.appendChild(textEl);
        
        // Remove after animation
        setTimeout(() => {
            textEl.remove();
        }, type === 'eliminated' ? 1500 : 1000);
    }
    
    /**
     * Show dash activation text
     */
    showDashText(x, y, color) {
        this.showFloatingText(x, y - 40, '💨 DASH!', 'dash', color);
    }
    
    /**
     * Show hit impact text
     */
    showHitText(x, y, intensity, customText = null) {
        if (customText) {
            this.showFloatingText(x, y, customText, 'hit');
            return;
        }
        const texts = intensity > 1.5 ? ['💥 POW!', '💥 WHAM!', '💥 CRASH!'] : ['💫', '⚡', '✨'];
        const text = texts[Math.floor(Math.random() * texts.length)];
        this.showFloatingText(x, y, text, 'hit');
    }
    
    /**
     * Show modifier announcement
     */
    showModifierAnnouncement(modifier) {
        if (!this.floatingTextsElement || !this.canvasRect) return;
        
        const textEl = document.createElement('div');
        textEl.className = 'modifier-announcement';
        textEl.innerHTML = `
            <div class="modifier-icon">${modifier.icon}</div>
            <div class="modifier-name">${modifier.name}</div>
            <div class="modifier-desc">${modifier.description}</div>
        `;
        
        // Position at center of canvas
        textEl.style.left = `${this.canvasRect.left + this.canvasRect.width / 2}px`;
        textEl.style.top = `${this.canvasRect.top + 100}px`;
        
        this.floatingTextsElement.appendChild(textEl);
        
        // Remove after animation
        setTimeout(() => textEl.remove(), 2500);
    }
    
    /**
     * Show escalation warning (chaos mode, etc)
     */
    showEscalationWarning(message) {
        if (!this.floatingTextsElement || !this.canvasRect) return;
        
        const textEl = document.createElement('div');
        textEl.className = 'escalation-warning';
        textEl.innerHTML = `<span class="warning-icon">⚠️</span> ${message}`;
        
        textEl.style.left = `${this.canvasRect.left + this.canvasRect.width / 2}px`;
        textEl.style.top = `${this.canvasRect.top + 60}px`;
        
        this.floatingTextsElement.appendChild(textEl);
        
        setTimeout(() => textEl.remove(), 2000);
    }
    
    /**
     * Show final countdown (guaranteed round end)
     */
    showFinalCountdown(seconds) {
        // Create element if not exists
        if (!this.finalCountdownElement) {
            this.finalCountdownElement = document.createElement('div');
            this.finalCountdownElement.id = 'final-countdown';
            this.finalCountdownElement.className = 'final-countdown';
            document.getElementById('ui-overlay').appendChild(this.finalCountdownElement);
        }
        
        if (seconds <= 0) {
            this.finalCountdownElement.innerHTML = `
                <div class="final-text">💀 ELIMINATION! 💀</div>
                <div class="final-subtext">Closest to center survives!</div>
            `;
        } else {
            this.finalCountdownElement.innerHTML = `
                <div class="final-text">⚡ FINAL ${seconds} ⚡</div>
                <div class="final-subtext">Get to center or be eliminated!</div>
            `;
        }
        
        this.finalCountdownElement.classList.add('visible');
    }
    
    /**
     * Hide final countdown
     */
    hideFinalCountdown() {
        if (this.finalCountdownElement) {
            this.finalCountdownElement.classList.remove('visible');
        }
    }
    
    /**
     * Show elimination text
     */
    showEliminationText(x, y, playerNum, color) {
        this.showFloatingText(x, y, `💀 P${playerNum} OUT!`, 'eliminated', color);
    }
    
    /**
     * Show last survivor text
     */
    showSurvivorText(x, y, color) {
        this.showFloatingText(x, y - 50, '👑 WINNER!', 'survivor', color);
    }
    
    /**
     * Update alive counter display
     */
    updateAliveCounter(aliveCount, totalCount) {
        if (!this.aliveCounterElement) return;
        
        if (aliveCount <= 0 || aliveCount === totalCount) {
            this.aliveCounterElement.classList.remove('visible');
            return;
        }
        
        this.aliveCounterElement.innerHTML = `<span class="count">${aliveCount}</span> / ${totalCount} players remaining`;
        this.aliveCounterElement.classList.add('visible');
        
        // Add danger class when only 2 remain
        if (aliveCount <= 2) {
            this.aliveCounterElement.classList.add('danger');
        } else {
            this.aliveCounterElement.classList.remove('danger');
        }
    }
    
    /**
     * Hide alive counter
     */
    hideAliveCounter() {
        if (!this.aliveCounterElement) return;
        this.aliveCounterElement.classList.remove('visible', 'danger');
    }
    
    /**
     * Reset UI for new round
     */
    resetForRound(players) {
        this.hideWinner();
        this.hideCountdown();
        this.hideAliveCounter();
        this.updateScoreboard(players);
        // Clear any lingering floating texts
        if (this.floatingTextsElement) {
            this.floatingTextsElement.innerHTML = '';
        }
    }
    
    /**
     * Reset UI for new match
     */
    resetForMatch(players) {
        this.hideWinner();
        this.hideCountdown();
        this.hideAliveCounter();
        this.initScoreboard(players);
        if (this.floatingTextsElement) {
            this.floatingTextsElement.innerHTML = '';
        }
    }
}
