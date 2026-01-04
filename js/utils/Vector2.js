/**
 * 2D Vector utility class for physics calculations
 */
export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    /**
     * Create a copy of this vector
     */
    clone() {
        return new Vector2(this.x, this.y);
    }
    
    /**
     * Set vector components
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    /**
     * Add another vector
     */
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    
    /**
     * Subtract another vector
     */
    subtract(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    
    /**
     * Multiply by scalar
     */
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    
    /**
     * Get magnitude (length) of vector
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    /**
     * Get squared magnitude (faster, no sqrt)
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }
    
    /**
     * Normalize to unit vector
     */
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }
    
    /**
     * Limit magnitude to max value
     */
    limit(max) {
        const magSq = this.magnitudeSquared();
        if (magSq > max * max) {
            this.normalize().multiply(max);
        }
        return this;
    }
    
    /**
     * Calculate dot product with another vector
     */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    
    /**
     * Calculate distance to another vector
     */
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Static method to subtract two vectors
     */
    static subtract(v1, v2) {
        return new Vector2(v1.x - v2.x, v1.y - v2.y);
    }
    
    /**
     * Static method to add two vectors
     */
    static add(v1, v2) {
        return new Vector2(v1.x + v2.x, v1.y + v2.y);
    }
}
