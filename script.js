// Main Game Class
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game settings
        this.gridSize = 20;
        this.cellSize = this.canvas.width / this.gridSize;
        
        // Game state
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.gameSpeed = 10; // Frames per move
        this.speedLevel = 1;
        this.isPaused = false;
        this.gameOver = false;
        this.gameStarted = false;
        
        // Game objects
        this.snake = null;
        this.foods = [];
        this.bonusFood = null;
        this.bonusTimer = 0;
        
        // Game settings
        this.settings = {
            difficulty: 'normal',
            gameMode: 'classic',
            showGrid: true,
            snakeTrail: true,
            visualEffects: true,
            soundEnabled: true,
            snakeColor: '#4CAF50'
        };
        
        // Visual effects
        this.particles = [];
        this.trail = [];
        
        // Initialize game
        this.init();
        this.setupEventListeners();
        this.updateDisplay();
        this.loadSettings();
    }
    
    init() {
        // Set canvas size based on grid
        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;
        
        // Initialize snake
        const startX = Math.floor(this.gridSize / 2);
        const startY = Math.floor(this.gridSize / 2);
        this.snake = new Snake(startX, startY, 3, this.settings.snakeColor);
        
        // Initialize first food
        this.spawnFood();
        
        // Start game loop
        this.lastTime = 0;
        this.frameCount = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    gameLoop(timestamp) {
        // Calculate delta time for consistent movement
        const deltaTime = timestamp - this.lastTime || 0;
        this.lastTime = timestamp;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Update bonus food timer
        if (this.bonusTimer > 0) {
            this.bonusTimer -= deltaTime / 1000;
            if (this.bonusTimer <= 0) {
                this.bonusFood = null;
            }
        }
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update game state if not paused and game is running
        if (!this.isPaused && this.gameStarted && !this.gameOver) {
            this.frameCount++;
            
            // Move snake at specified speed
            if (this.frameCount >= this.gameSpeed) {
                this.frameCount = 0;
                this.update();
            }
        }
        
        // Draw game objects
        this.drawFoods();
        this.drawSnake();
        this.drawParticles();
        
        // Draw bonus food timer
        if (this.bonusFood) {
            this.drawBonusTimer();
        }
        
        // Draw overlay if needed
        if (!this.gameStarted || this.gameOver || this.isPaused) {
            this.drawOverlay();
        }
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    drawBackground() {
        // Draw checkerboard pattern
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.ctx.fillStyle = (x + y) % 2 === 0 ? '#1a1a1a' : '#222';
                this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            }
        }
        
        // Draw grid lines if enabled
        if (this.settings.showGrid) {
            this.ctx.strokeStyle = '#2a2a2a';
            this.ctx.lineWidth = 0.5;
            
            // Vertical lines
            for (let x = 0; x <= this.gridSize; x++) {
                this.ctx.beginPath();
                this.ctx.moveTo(x * this.cellSize, 0);
                this.ctx.lineTo(x * this.cellSize, this.canvas.height);
                this.ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 0; y <= this.gridSize; y++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y * this.cellSize);
                this.ctx.lineTo(this.canvas.width, y * this.cellSize);
                this.ctx.stroke();
            }
        }
    }
    
    drawSnake() {
        // Draw snake trail if enabled
        if (this.settings.snakeTrail && this.trail.length > 0) {
            for (let i = 0; i < this.trail.length; i++) {
                const segment = this.trail[i];
                const alpha = 0.1 + (i / this.trail.length) * 0.3;
                const color = this.hexToRgb(this.settings.snakeColor, alpha);
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(
                    segment.x * this.cellSize,
                    segment.y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }
        
        // Draw snake body
        for (let i = 0; i < this.snake.body.length; i++) {
            const segment = this.snake.body[i];
            
            // Head is drawn differently
            if (i === 0) {
                this.drawSnakeHead(segment);
            } else {
                this.drawSnakeSegment(segment, i);
            }
        }
    }
    
    drawSnakeHead(head) {
        const x = head.x * this.cellSize;
        const y = head.y * this.cellSize;
        const size = this.cellSize;
        
        // Draw head with gradient
        const gradient = this.ctx.createRadialGradient(
            x + size/2, y + size/2, 0,
            x + size/2, y + size/2, size/2
        );
        gradient.addColorStop(0, this.lightenColor(this.settings.snakeColor, 40));
        gradient.addColorStop(1, this.settings.snakeColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, size, size);
        
        // Draw eyes
        this.ctx.fillStyle = 'white';
        const eyeSize = size / 5;
        
        // Eye positions based on direction
        let eye1X, eye1Y, eye2X, eye2Y;
        
        switch(this.snake.direction) {
            case 'right':
                eye1X = x + size - eyeSize - 2;
                eye1Y = y + size/3;
                eye2X = x + size - eyeSize - 2;
                eye2Y = y + 2*size/3;
                break;
            case 'left':
                eye1X = x + 2;
                eye1Y = y + size/3;
                eye2X = x + 2;
                eye2Y = y + 2*size/3;
                break;
            case 'up':
                eye1X = x + size/3;
                eye1Y = y + 2;
                eye2X = x + 2*size/3;
                eye2Y = y + 2;
                break;
            case 'down':
                eye1X = x + size/3;
                eye1Y = y + size - eyeSize - 2;
                eye2X = x + 2*size/3;
                eye2Y = y + size - eyeSize - 2;
                break;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, eyeSize/2, 0, Math.PI * 2);
        this.ctx.arc(eye2X, eye2Y, eyeSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, eyeSize/4, 0, Math.PI * 2);
        this.ctx.arc(eye2X, eye2Y, eyeSize/4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawSnakeSegment(segment, index) {
        const x = segment.x * this.cellSize;
        const y = segment.y * this.cellSize;
        const size = this.cellSize;
        
        // Calculate color intensity based on position in snake
        const intensity = 1 - (index / this.snake.body.length) * 0.5;
        const color = this.lightenColor(this.settings.snakeColor, -20 * intensity);
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, size, size);
        
        // Draw segment border
        this.ctx.strokeStyle = this.lightenColor(color, 20);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    }
    
    drawFoods() {
        // Draw regular foods
        this.foods.forEach(food => {
            this.drawFood(food, '#F44336');
        });
        
        // Draw bonus food if exists
        if (this.bonusFood) {
            this.drawFood(this.bonusFood, '#FF9800', true);
        }
    }
    
    drawFood(food, color, isBonus = false) {
        const x = food.x * this.cellSize;
        const y = food.y * this.cellSize;
        const size = this.cellSize;
        const centerX = x + size/2;
        const centerY = y + size/2;
        const radius = size/2 - 2;
        
        // Draw food with gradient
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        
        if (isBonus) {
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, '#FF5722');
        } else {
            gradient.addColorStop(0, '#FF8A80');
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, '#D32F2F');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - radius/3, centerY - radius/3, radius/3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add glow effect for bonus food
        if (isBonus && this.settings.visualEffects) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            
            // Draw star for bonus food
            this.ctx.fillStyle = '#FFF';
            this.drawStar(centerX, centerY, 5, radius/2, radius/4);
        }
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawBonusTimer() {
        const x = this.bonusFood.x * this.cellSize;
        const y = this.bonusFood.y * this.cellSize - 10;
        const width = this.cellSize;
        const height = 5;
        const progress = this.bonusTimer / 10; // 10 seconds total
        
        // Draw background bar
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, width, height);
        
        // Draw progress bar
        this.ctx.fillStyle = '#FF9800';
        this.ctx.fillRect(x, y, width * progress, height);
        
        // Draw border
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    drawOverlay() {
        const overlay = document.getElementById('game-overlay');
        const title = document.getElementById('overlay-title');
        const message = document.getElementById('overlay-message');
        const startBtn = document.getElementById('start-btn');
        
        if (this.gameOver) {
            title.textContent = 'Game Over!';
            message.textContent = `Final Score: ${this.score}`;
            startBtn.textContent = 'Play Again';
            overlay.style.display = 'flex';
        } else if (this.isPaused) {
            title.textContent = 'Game Paused';
            message.textContent = 'Press P or click Resume to continue';
            startBtn.textContent = 'Resume';
            overlay.style.display = 'flex';
        } else if (!this.gameStarted) {
            title.textContent = 'Snake Game';
            message.textContent = 'Use arrow keys to move. Eat the food to grow!';
            startBtn.textContent = 'Start Game';
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }
    
    update() {
        // Move snake
        this.snake.move();
        
        // Add current head position to trail
        if (this.settings.snakeTrail) {
            this.trail.unshift({...this.snake.body[0]});
            if (this.trail.length > 10) {
                this.trail.pop();
            }
        }
        
        // Check wall collision based on game mode
        const head = this.snake.body[0];
        
        if (this.settings.gameMode === 'classic') {
            // Classic mode: die on wall collision
            if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
                this.endGame();
                return;
            }
        } else {
            // No walls mode: wrap around
            if (head.x < 0) head.x = this.gridSize - 1;
            if (head.x >= this.gridSize) head.x = 0;
            if (head.y < 0) head.y = this.gridSize - 1;
            if (head.y >= this.gridSize) head.y = 0;
        }
        
        // Check self collision
        for (let i = 1; i < this.snake.body.length; i++) {
            if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
                this.endGame();
                return;
            }
        }
        
        // Check food collision
        this.checkFoodCollision();
        
        // Randomly spawn bonus food
        if (!this.bonusFood && Math.random() < 0.005) {
            this.spawnBonusFood();
        }
    }
    
    checkFoodCollision() {
        const head = this.snake.body[0];
        
        // Check regular foods
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            if (head.x === food.x && head.y === food.y) {
                this.eatFood(food, false);
                this.foods.splice(i, 1);
                this.spawnFood();
                break;
            }
        }
        
        // Check bonus food
        if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
            this.eatFood(this.bonusFood, true);
            this.bonusFood = null;
            this.bonusTimer = 0;
        }
    }
    
    eatFood(food, isBonus) {
        // Grow snake
        this.snake.grow();
        
        // Update score
        const points = isBonus ? 50 : 10;
        this.score += points;
        
        // Increase speed every 100 points
        const newSpeedLevel = Math.floor(this.score / 100) + 1;
        if (newSpeedLevel > this.speedLevel) {
            this.speedLevel = newSpeedLevel;
            this.updateGameSpeed();
        }
        
        // Update display
        this.updateDisplay();
        
        // Create eating effect
        if (this.settings.visualEffects) {
            this.createEatingEffect(food.x, food.y, isBonus);
        }
        
        // Play sound if enabled
        if (this.settings.soundEnabled) {
            this.playEatSound();
        }
        
        // Update high score if needed
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.updateDisplay();
        }
    }
    
    createEatingEffect(x, y, isBonus) {
        const centerX = x * this.cellSize + this.cellSize/2;
        const centerY = y * this.cellSize + this.cellSize/2;
        const color = isBonus ? '#FF9800' : '#F44336';
        const particleCount = isBonus ? 15 : 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                life: 1.0,
                decay: 0.03 + Math.random() * 0.02
            });
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // Gravity
            
            // Update life
            p.life -= p.decay;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                // Draw particle
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }
        }
    }
    
    drawParticles() {
        // Particles are drawn in updateParticles method
    }
    
    spawnFood() {
        let food;
        let overlapping;
        
        do {
            overlapping = false;
            food = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            
            // Check if food overlaps with snake
            for (const segment of this.snake.body) {
                if (segment.x === food.x && segment.y === food.y) {
                    overlapping = true;
                    break;
                }
            }
            
            // Check if food overlaps with existing foods
            for (const existingFood of this.foods) {
                if (existingFood.x === food.x && existingFood.y === food.y) {
                    overlapping = true;
                    break;
                }
            }
            
            // Check if food overlaps with bonus food
            if (this.bonusFood && this.bonusFood.x === food.x && this.bonusFood.y === food.y) {
                overlapping = true;
            }
            
        } while (overlapping);
        
        this.foods.push(food);
    }
    
    spawnBonusFood() {
        let food;
        let overlapping;
        
        do {
            overlapping = false;
            food = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
            
            // Check if food overlaps with snake
            for (const segment of this.snake.body) {
                if (segment.x === food.x && segment.y === food.y) {
                    overlapping = true;
                    break;
                }
            }
            
            // Check if food overlaps with existing foods
            for (const existingFood of this.foods) {
                if (existingFood.x === food.x && existingFood.y === food.y) {
                    overlapping = true;
                    break;
                }
            }
            
        } while (overlapping);
        
        this.bonusFood = food;
        this.bonusTimer = 10; // 10 seconds
    }
    
    updateGameSpeed() {
        // Adjust game speed based on difficulty and score level
        let baseSpeed;
        
        switch(this.settings.difficulty) {
            case 'easy':
                baseSpeed = 15;
                break;
            case 'hard':
                baseSpeed = 7;
                break;
            default: // normal
                baseSpeed = 10;
        }
        
        // Make game faster as score increases
        this.gameSpeed = Math.max(3, baseSpeed - Math.floor(this.speedLevel / 2));
        
        // Update speed display
        const speedDisplay = document.getElementById('game-speed');
        const speedNames = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast', 'Extreme'];
        const speedIndex = Math.min(5, Math.floor((15 - this.gameSpeed) / 2));
        speedDisplay.textContent = speedNames[speedIndex];
    }
    
    endGame() {
        this.gameOver = true;
        this.gameStarted = false;
        
        // Play game over sound if enabled
        if (this.settings.soundEnabled) {
            this.playGameOverSound();
        }
        
        // Update overlay
        this.drawOverlay();
    }
    
    resetGame() {
        this.score = 0;
        this.speedLevel = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.gameStarted = false;
        
        // Reset snake
        const startX = Math.floor(this.gridSize / 2);
        const startY = Math.floor(this.gridSize / 2);
        this.snake = new Snake(startX, startY, 3, this.settings.snakeColor);
        
        // Reset food
        this.foods = [];
        this.bonusFood = null;
        this.bonusTimer = 0;
        
        // Reset effects
        this.particles = [];
        this.trail = [];
        
        // Spawn initial food
        this.spawnFood();
        
        // Update game speed
        this.updateGameSpeed();
        
        // Update display
        this.updateDisplay();
        this.drawOverlay();
    }
    
    updateDisplay() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('snake-length').textContent = this.snake.body.length;
        
        // Update pause button text
        const pauseBtn = document.getElementById('pause-btn');
        if (this.isPaused) {
            pauseBtn.innerHTML = '<i class="icon-play"></i> Resume';
        } else {
            pauseBtn.innerHTML = '<i class="icon-pause"></i> Pause';
        }
    }
    
    playEatSound() {
        // Create a simple eat sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Audio context not supported');
        }
    }
    
    playGameOverSound() {
        // Create a simple game over sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 200;
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio context not supported');
        }
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameStarted && e.key === ' ') {
                this.startGame();
                return;
            }
            
            switch(e.key) {
                case 'ArrowUp':
                    if (this.snake.direction !== 'down') this.snake.changeDirection('up');
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    if (this.snake.direction !== 'up') this.snake.changeDirection('down');
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    if (this.snake.direction !== 'right') this.snake.changeDirection('left');
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    if (this.snake.direction !== 'left') this.snake.changeDirection('right');
                    e.preventDefault();
                    break;
                case ' ':
                case 'p':
                    this.togglePause();
                    e.preventDefault();
                    break;
                case 'r':
                    this.resetGame();
                    e.preventDefault();
                    break;
                case 'Escape':
                    if (this.gameStarted && !this.gameOver) {
                        this.togglePause();
                    }
                    e.preventDefault();
                    break;
            }
        });
        
        // Button events
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.gameOver) {
                this.resetGame();
            }
            this.startGame();
        });
        
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('sound-toggle').addEventListener('click', () => {
            this.toggleSound();
        });
        
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });
        
        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeSettings();
        });
        
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Mobile controls
        document.querySelectorAll('.mobile-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.gameStarted) return;
                
                const direction = e.currentTarget.getAttribute('data-direction');
                if (direction === 'up' && this.snake.direction !== 'down') {
                    this.snake.changeDirection('up');
                } else if (direction === 'down' && this.snake.direction !== 'up') {
                    this.snake.changeDirection('down');
                } else if (direction === 'left' && this.snake.direction !== 'right') {
                    this.snake.changeDirection('left');
                } else if (direction === 'right' && this.snake.direction !== 'left') {
                    this.snake.changeDirection('right');
                }
            });
        });
        
        // Touch swipe controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (!touchStartX || !touchStartY || !this.gameStarted) return;
            
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            // Only consider significant swipes
            if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    if (dx > 0 && this.snake.direction !== 'left') {
                        this.snake.changeDirection('right');
                    } else if (dx < 0 && this.snake.direction !== 'right') {
                        this.snake.changeDirection('left');
                    }
                } else {
                    // Vertical swipe
                    if (dy > 0 && this.snake.direction !== 'up') {
                        this.snake.changeDirection('down');
                    } else if (dy < 0 && this.snake.direction !== 'down') {
                        this.snake.changeDirection('up');
                    }
                }
                
                touchStartX = null;
                touchStartY = null;
            }
            
            e.preventDefault();
        });
        
        // Close settings modal when clicking outside
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settings-modal')) {
                this.closeSettings();
            }
        });
        
        // Color option selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            });
        });
    }
    
    startGame() {
        if (this.gameOver) {
            this.resetGame();
        }
        
        this.gameStarted = true;
        this.isPaused = false;
        this.drawOverlay();
        this.updateDisplay();
    }
    
    togglePause() {
        if (!this.gameStarted || this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        this.updateDisplay();
        this.drawOverlay();
    }
    
    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        const soundBtn = document.getElementById('sound-toggle');
        if (this.settings.soundEnabled) {
            soundBtn.innerHTML = '<i class="icon-sound"></i> Sound On';
        } else {
            soundBtn.innerHTML = '<i class="icon-mute"></i> Sound Off';
        }
        this.saveSettings();
    }
    
    openSettings() {
        document.getElementById('settings-modal').style.display = 'flex';
        
        // Load current settings into form
        document.querySelector(`input[name="difficulty"][value="${this.settings.difficulty}"]`).checked = true;
        document.querySelector(`input[name="game-mode"][value="${this.settings.gameMode}"]`).checked = true;
        document.getElementById('grid-toggle').checked = this.settings.showGrid;
        document.getElementById('trail-toggle').checked = this.settings.snakeTrail;
        document.getElementById('effects-toggle').checked = this.settings.visualEffects;
        
        // Set active color
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-color') === this.settings.snakeColor) {
                option.classList.add('active');
            }
        });
    }
    
    closeSettings() {
        document.getElementById('settings-modal').style.display = 'none';
    }
    
    saveSettings() {
        // Get difficulty
        const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
        this.settings.difficulty = difficulty;
        
        // Get game mode
        const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
        this.settings.gameMode = gameMode;
        
        // Get visual options
        this.settings.showGrid = document.getElementById('grid-toggle').checked;
        this.settings.snakeTrail = document.getElementById('trail-toggle').checked;
        this.settings.visualEffects = document.getElementById('effects-toggle').checked;
        
        // Get snake color
        const activeColor = document.querySelector('.color-option.active');
        if (activeColor) {
            this.settings.snakeColor = activeColor.getAttribute('data-color');
            this.snake.color = this.settings.snakeColor;
        }
        
        // Update game speed based on new difficulty
        this.updateGameSpeed();
        
        // Save to localStorage
        localStorage.setItem('snakeSettings', JSON.stringify(this.settings));
        
        // Close modal
        this.closeSettings();
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('snakeSettings');
        if (savedSettings) {
            this.settings = {...this.settings, ...JSON.parse(savedSettings)};
            this.snake.color = this.settings.snakeColor;
        }
        
        // Update sound button
        const soundBtn = document.getElementById('sound-toggle');
        if (this.settings.soundEnabled) {
            soundBtn.innerHTML = '<i class="icon-sound"></i> Sound On';
        } else {
            soundBtn.innerHTML = '<i class="icon-mute"></i> Sound Off';
        }
        
        // Update game speed
        this.updateGameSpeed();
    }
    
    // Utility functions
    hexToRgb(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }
}

// Snake Class
class Snake {
    constructor(startX, startY, length, color) {
        this.body = [];
        this.direction = 'right';
        this.color = color;
        
        // Initialize snake body
        for (let i = 0; i < length; i++) {
            this.body.push({x: startX - i, y: startY});
        }
    }
    
    move() {
        // Create new head based on current direction
        const head = {...this.body[0]};
        
        switch(this.direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }
        
        // Add new head to beginning of body
        this.body.unshift(head);
        
        // Remove tail (snake moves, doesn't grow unless eating)
        this.body.pop();
    }
    
    changeDirection(newDirection) {
        // Prevent 180-degree turns
        if (
            (newDirection === 'up' && this.direction !== 'down') ||
            (newDirection === 'down' && this.direction !== 'up') ||
            (newDirection === 'left' && this.direction !== 'right') ||
            (newDirection === 'right' && this.direction !== 'left')
        ) {
            this.direction = newDirection;
        }
    }
    
    grow() {
        // Add a new segment at the end of the snake
        const tail = {...this.body[this.body.length - 1]};
        this.body.push(tail);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    // Create icon CSS
    const iconStyle = document.createElement('style');
    iconStyle.textContent = `
        .icon-pause:before { content: "⏸"; }
        .icon-play:before { content: "▶"; }
        .icon-restart:before { content: "↻"; }
        .icon-sound:before { content: "🔊"; }
        .icon-mute:before { content: "🔇"; }
    `;
    document.head.appendChild(iconStyle);
    
    // Initialize the game
    const game = new SnakeGame();
    window.game = game; // Make game accessible from console for debugging
});