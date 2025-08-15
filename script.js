
    // ====== Canvas / State ======
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let gameState = 'start'; // 'start' | 'playing' | 'gameOver'
    let score = 0;
    let lives = 3;
    let gameSpeed = 1;
    let lastBallSpawn = 0;
    let ballSpawnRate = 2000;

    // ====== Entities ======
    const basket = { x: canvas.width/2 - 40, y: canvas.height - 60, width: 80, height: 40, speed: 8 };
    let balls = [];
    let particles = [];

    // ====== Input ======
    const keys = {};
    let mouseX = canvas.width / 2;
    let touchX = canvas.width / 2;

    // Track “last activity” times so keyboard can take priority
    let lastKeyTime = 0;
    let lastMouseTime = 0;
    let lastTouchTime = 0;

    // Prevent page scroll with arrows; record key state
    document.addEventListener('keydown', (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
      keys[e.key] = true;
      lastKeyTime = performance.now();
    });
    document.addEventListener('keyup', (e) => {
      keys[e.key] = false;
      lastKeyTime = performance.now();
    });

    // Mouse movement (don’t force control unless mouse moved recently)
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      lastMouseTime = performance.now();
    });

    // Touch movement
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      lastTouchTime = performance.now();
    }, { passive: false });

    // ====== Objects ======
    function Ball(x, y) {
      this.x = x; this.y = y;
      this.radius = 15;
      this.speed = 2 + gameSpeed * 0.5;
      this.color = `hsl(${Math.random()*360},70%,60%)`;
      this.caught = false;
    }

    function Particle(x, y, color) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - .5) * 10;
      this.vy = (Math.random() - .5) * 10;
      this.life = 1; this.decay = .02;
      this.color = color;
    }

    // ====== Game Flow ======
    function startGame() {
      gameState = 'playing';
      score = 0; lives = 3; gameSpeed = 1;
      balls = []; particles = [];
      lastBallSpawn = Date.now();
      ballSpawnRate = 2000;
      document.getElementById('startScreen').classList.add('hidden');
      updateUI();
      gameLoop();
    }

    function restartGame() {
      document.getElementById('gameOverScreen').classList.add('hidden');
      startGame();
    }

    function updateUI() {
      document.getElementById('scoreDisplay').textContent = score;
      document.getElementById('livesDisplay').textContent = lives;
    }

    // ====== Input → Basket ======
    function updateBasket() {
      const now = performance.now();
      let usedKeyboard = false;

      // Keyboard movement
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) { basket.x -= basket.speed; usedKeyboard = true; }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) { basket.x += basket.speed; usedKeyboard = true; }

      // Only use touch/mouse if keyboard not active this frame
      if (!usedKeyboard) {
        // Prefer most recent input source: touch > mouse
        if (now - lastTouchTime < 1000) {
          basket.x = touchX - basket.width/2;
        } else if (now - lastMouseTime < 1000) {
          basket.x = mouseX - basket.width/2;
        }
      }

      // Clamp to canvas
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
    }

    // ====== Balls ======
    function spawnBall() {
      const now = Date.now();
      if (now - lastBallSpawn > ballSpawnRate) {
        const x = Math.random() * (canvas.width - 30) + 15;
        balls.push(new Ball(x, -15));
        lastBallSpawn = now;

        if (ballSpawnRate > 800) ballSpawnRate -= 5;
        gameSpeed += 0.001;
      }
    }

    function updateBalls() {
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        b.y += b.speed;

        // Catch
        if (
          b.x + b.radius > basket.x &&
          b.x - b.radius < basket.x + basket.width &&
          b.y + b.radius > basket.y &&
          b.y - b.radius < basket.y + basket.height &&
          !b.caught
        ) {
          b.caught = true;
          score += 10;
          updateUI();

          for (let j = 0; j < 8; j++) particles.push(new Particle(b.x, b.y, b.color));
          balls.splice(i, 1);
          continue;
        }

        // Missed
        if (b.y > canvas.height + b.radius) {
          lives--;
          updateUI();
          balls.splice(i, 1);
          if (lives <= 0) gameOver();
        }
      }
    }

    function updateParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    function gameOver() {
      gameState = 'gameOver';
      document.getElementById('finalScore').textContent = score;

      let msg = '';
      if (score >= 500) msg = 'Incredible! You are a Boolu Bask master!';
      else if (score >= 300) msg = 'Great job! You have excellent reflexes!';
      else if (score >= 150) msg = 'Not bad! Keep practicing to improve!';
      else msg = "Good try! You'll do better next time!";

      document.getElementById('gameOverMessage').textContent = msg;
      document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    // ====== Draw ======
    function drawBasket() {
      const g = ctx.createLinearGradient(basket.x, basket.y, basket.x, basket.y + basket.height);
      g.addColorStop(0, '#8B4513'); g.addColorStop(1, '#A0522D');
      ctx.fillStyle = g; ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
      ctx.fillStyle = '#654321'; ctx.fillRect(basket.x, basket.y, basket.width, 5);
      ctx.strokeStyle = '#654321'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(basket.x + (basket.width/4) * i, basket.y);
        ctx.lineTo(basket.x + (basket.width/4) * i, basket.y + basket.height);
        ctx.stroke();
      }
    }

    function drawBalls() {
      for (const b of balls) {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(b.x+2, b.y+2, b.radius, b.radius*0.8, 0, 0, Math.PI*2); ctx.fill();

        const grad = ctx.createRadialGradient(b.x-5, b.y-5, 0, b.x, b.y, b.radius);
        grad.addColorStop(0,'white'); grad.addColorStop(0.3,b.color); grad.addColorStop(1,'black');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(b.x,b.y,b.radius,0,Math.PI*2); ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(b.x-5,b.y-5,b.radius*0.3,0,Math.PI*2); ctx.fill();
      }
    }

    function drawParticles() {
      for (const p of particles) {
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
    }

    function drawBackground() {
      const g = ctx.createLinearGradient(0,0,0,canvas.height);
      g.addColorStop(0,'#87CEEB'); g.addColorStop(1,'#98FB98');
      ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);

      ctx.fillStyle = 'rgba(255,255,255,.3)';
      const t = Date.now()*0.001;
      for (let i=0;i<5;i++){
        const x = (t*20 + i*160) % (canvas.width + 100) - 50;
        const y = 50 + Math.sin(t + i) * 20;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI*2);
        ctx.arc(x+20, y, 40, 0, Math.PI*2);
        ctx.arc(x+40, y, 30, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // ====== Loop ======
    function gameLoop() {
      if (gameState !== 'playing') return;
      drawBackground();
      updateBasket();
      spawnBall();
      updateBalls();
      updateParticles();
      drawBasket();
      drawBalls();
      drawParticles();
      requestAnimationFrame(gameLoop);
    }

    // ====== Init / Responsive ======
    function init() {
      function resizeCanvas() {
        if (window.innerWidth <= 600) {
          canvas.style.width = '90vw';
          canvas.style.height = '60vh';
        } else {
          canvas.style.width = '800px';
          canvas.style.height = '600px';
        }
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    }
    init();
 
