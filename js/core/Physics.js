import { CONFIG } from '../config.js';
import { Vector2 } from '../utils/Vector2.js';

/**
 * Physics system for collision detection and resolution
 */
export class Physics {
    /**
     * Check collision between two circle players
     */
    static checkCircleCollision(p1, p2) {
        const dx = p2.position.x - p1.position.x;
        const dy = p2.position.y - p1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = p1.radius + p2.radius;
        
        return distance < minDistance;
    }
    
    /**
     * Resolve collision between two players
     * @param {Player} p1 - First player
     * @param {Player} p2 - Second player
     * @param {number} damageMultiplier - Multiplier for push force (escalation)
     * @param {number} bounceMultiplier - Multiplier for bounce (modifier)
     */
    static resolveCollision(p1, p2, damageMultiplier = 1, bounceMultiplier = 1) {
        if (!p1.isAlive || !p2.isAlive) return;
        
        const dx = p2.position.x - p1.position.x;
        const dy = p2.position.y - p1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = p1.radius + p2.radius;
        
        if (distance >= minDistance || distance === 0) return;
        
        // Calculate collision normal
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Separate the players
        const overlap = minDistance - distance;
        const separationX = (overlap / 2) * nx;
        const separationY = (overlap / 2) * ny;
        
        p1.position.x -= separationX;
        p1.position.y -= separationY;
        p2.position.x += separationX;
        p2.position.y += separationY;
        
        // Calculate relative velocity
        const dvx = p1.velocity.x - p2.velocity.x;
        const dvy = p1.velocity.y - p2.velocity.y;
        
        // Calculate relative velocity in collision normal direction
        const dvn = dvx * nx + dvy * ny;
        
        // Don't resolve if velocities are separating
        if (dvn > 0) return;
        
        // Calculate restitution (bounciness) with modifier
        const restitution = CONFIG.PLAYER.BOUNCE_FACTOR * bounceMultiplier;
        
        // Calculate impulse scalar
        const totalMass = p1.mass + p2.mass;
        let impulse = -(1 + restitution) * dvn / totalMass;
        
        // Apply push force with damage multiplier
        let pushMultiplier = CONFIG.COLLISION.PUSH_FORCE * damageMultiplier;
        
        // Extra push if either player is dashing
        if (p1.isDashing || p2.isDashing) {
            pushMultiplier *= CONFIG.COLLISION.DASH_PUSH_MULTIPLIER;
        }
        
        impulse *= pushMultiplier;
        
        // Apply impulse to velocities
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;
        
        // Adjust based on mass ratio
        p1.velocity.x += (impulseX * p2.mass);
        p1.velocity.y += (impulseY * p2.mass);
        p2.velocity.x -= (impulseX * p1.mass);
        p2.velocity.y -= (impulseY * p1.mass);
        
        // Add slight drag on collision to make hits feel more impactful
        const dragFactor = 0.95;
        if (damageMultiplier > 1.5) {
            // At high damage, reduce drag for more explosive hits
            p1.velocity.x *= 1.0;
            p1.velocity.y *= 1.0;
            p2.velocity.x *= 1.0;
            p2.velocity.y *= 1.0;
        }
    }
    
    /**
     * Process all player collisions
     */
    static processCollisions(players, damageMultiplier = 1, bounceMultiplier = 1) {
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                
                if (this.checkCircleCollision(p1, p2)) {
                    this.resolveCollision(p1, p2, damageMultiplier, bounceMultiplier);
                }
            }
        }
    }
    
    /**
     * Check and handle arena boundary collisions
     * Returns true if player should be eliminated
     */
    static checkArenaBoundary(player, arena) {
        if (!player.isAlive) return false;
        
        const { x, y } = player.position;
        const radius = player.radius;
        
        // Check if completely out of bounds (eliminated)
        if (arena.isEliminated(x, y, radius)) {
            return true;
        }
        
        return false;
    }
}
