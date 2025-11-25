const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const overlay = document.getElementById("overlay");
const playButton = document.getElementById("playButton");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const resultPanel = document.getElementById("resultPanel");
const resultScore = document.getElementById("resultScore");
const resultBest = document.getElementById("resultBest");

const CONFIG = {
  gravity: 1800, // px per second^2
  jumpVelocity: -520, // px per second
  maxFallVelocity: 820,
  pipeWidth: 110,
  pipeInterval: 1.75, // seconds
  pipeSpeed: 250,
  minGap: 180,
  maxGap: 260,
  safeMargin: 86,
  parallaxLayers: [
    { countScale: 0.8, size: [1.8, 3.5], speed: 12, alpha: 0.45 },
    { countScale: 1.1, size: [1.2, 2.3], speed: 28, alpha: 0.68 },
    { countScale: 1.4, size: [0.9, 1.6], speed: 60, alpha: 0.85 }
  ]
};

const state = {
  mode: "ready",
  width: 0,
  height: 0,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2.5),
  score: 0,
  best: Number(localStorage.getItem("flappy-nebula-best") || 0),
  pipes: [],
  stars: [],
  nebulas: [],
  dust: [],
  pipeTimer: 0,
  readyTime: 0,
  lastTimestamp: performance.now()
};

const bird = {
  x: 0,
  y: 0,
  velocity: 0,
  width: 58,
  height: 42,
  rotation: 0,
  flapTime: 0
};

function resizeCanvas() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);

  canvas.width = Math.round(state.width * state.pixelRatio);
  canvas.height = Math.round(state.height * state.pixelRatio);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);

  regenerateBackground();
  resetBirdPosition();
}

function regenerateBackground() {
  generateNebulas();
  generateStars();
  generateDust();
}

function generateNebulas() {
  const count = 3;
  state.nebulas = Array.from({ length: count }, (_, i) => {
    const baseSize = Math.max(state.width, state.height) * (0.6 + i * 0.25);
    return {
      x: state.width * (0.2 + i * 0.35),
      y: state.height * (0.35 + i * 0.12),
      radius: baseSize,
      hue: 210 + i * 45,
      alpha: 0.24 - i * 0.04,
      distortion: 0.18 + i * 0.05
    };
  });
}

function generateStars() {
  state.stars = CONFIG.parallaxLayers.map((layer, layerIndex) => {
    const area = state.width * state.height;
    const count = Math.max(12, Math.round((area / 12000) * layer.countScale));
    return Array.from({ length: count }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      size: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
      speed: layer.speed * (0.8 + Math.random() * 0.4),
      alpha: layer.alpha * (0.8 + Math.random() * 0.4),
      hue: 200 + layerIndex * 30 + Math.random() * 30
    }));
  });
}

function generateDust() {
  const count = Math.max(18, Math.round((state.width / 10) * 0.8));
  state.dust = Array.from({ length: count }, () => ({
    x: Math.random() * state.width,
    y: state.height * (0.65 + Math.random() * 0.35),
    length: 40 + Math.random() * 60,
    speed: 60 + Math.random() * 80,
    alpha: 0.18 + Math.random() * 0.14
  }));
}

function resetBirdPosition() {
  bird.x = Math.min(state.width * 0.32, 320);
  bird.y = state.height * 0.45;
  bird.velocity = 0;
  bird.rotation = 0;
}

function setMode(mode) {
  state.mode = mode;
  if (mode === "ready") {
    overlay.classList.remove("hidden");
    resultPanel.hidden = true;
    playButton.textContent = "Play";
    state.pipeTimer = 0;
    state.pipes = [];
    state.score = 0;
    state.readyTime = performance.now();
    resetBirdPosition();
    updateScoreboard();
  } else if (mode === "playing") {
    overlay.classList.add("hidden");
    state.pipeTimer = 0;
    state.pipes = [];
    state.score = 0;
    state.lastTimestamp = performance.now();
    updateScoreboard();
  } else if (mode === "gameover") {
    overlay.classList.remove("hidden");
    resultPanel.hidden = false;
    playButton.textContent = "Play Again";
    resultScore.textContent = state.score.toString();
    resultBest.textContent = state.best.toString();
  }
}

function updateScoreboard() {
  scoreValue.textContent = state.score.toString();
  bestValue.textContent = state.best.toString();
}

function startGame() {
  if (state.mode === "playing") return;
  setMode("playing");
}

function handlePrimaryAction() {
  if (state.mode === "ready") {
    startGame();
    flap();
  } else if (state.mode === "playing") {
    flap();
  } else if (state.mode === "gameover") {
    setMode("ready");
  }
}

function flap() {
  bird.velocity = CONFIG.jumpVelocity;
  bird.flapTime = performance.now();
}

function spawnPipe() {
  const gapSize =
    CONFIG.minGap +
    Math.random() * (CONFIG.maxGap - CONFIG.minGap) *
      Math.min(1, state.height / 720);
  const maxTop = state.height - CONFIG.safeMargin - gapSize;
  const minTop = CONFIG.safeMargin;
  const gapTop = minTop + Math.random() * Math.max(1, maxTop - minTop);
  state.pipes.push({
    x: state.width + CONFIG.pipeWidth,
    width: CONFIG.pipeWidth,
    gapTop,
    gapBottom: gapTop + gapSize,
    scored: false
  });
}

function update(delta) {
  if (state.mode === "ready") {
    const elapsed = (performance.now() - state.readyTime) / 1000;
    bird.y =
      state.height * 0.45 +
      Math.sin(elapsed * 2.8) * Math.min(22, state.height * 0.04);
    bird.rotation = Math.sin(elapsed * 2.8) * 0.1;
  }

  animateBackground(delta);

  if (state.mode !== "playing") {
    return;
  }

  state.pipeTimer += delta;
  if (state.pipeTimer >= CONFIG.pipeInterval) {
    state.pipeTimer = 0;
    spawnPipe();
  }

  bird.velocity += CONFIG.gravity * delta;
  bird.velocity = Math.min(bird.velocity, CONFIG.maxFallVelocity);
  bird.y += bird.velocity * delta;
  bird.rotation = Math.min(
    Math.max(-0.5, (bird.velocity / CONFIG.maxFallVelocity) * 1.1),
    0.7
  );

  const birdTop = bird.y - bird.height / 2;
  const birdBottom = bird.y + bird.height / 2;

  if (birdTop < CONFIG.safeMargin * 0.35) {
    bird.y = CONFIG.safeMargin * 0.35 + bird.height / 2;
    bird.velocity = 0;
  }

  let hitGround = false;

  state.pipes.forEach((pipe) => {
    pipe.x -= CONFIG.pipeSpeed * delta;
    if (!pipe.scored && pipe.x + pipe.width < bird.x - bird.width / 2) {
      state.score += 1;
      pipe.scored = true;
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem("flappy-nebula-best", state.best.toString());
      }
      updateScoreboard();
    }

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;
    const birdLeft = bird.x - bird.width / 2;
    const birdRight = bird.x + bird.width / 2;

    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      if (birdTop < pipe.gapTop || birdBottom > pipe.gapBottom) {
        hitGround = true;
      }
    }
  });

  state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -200);

  const groundLine = state.height - state.height * 0.12;
  if (birdBottom >= groundLine) {
    hitGround = true;
  }

  if (hitGround) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  setMode("gameover");
}

function animateBackground(delta) {
  const width = state.width;
  state.stars.forEach((layer, layerIndex) => {
    const baseSpeed = CONFIG.parallaxLayers[layerIndex].speed;
    layer.forEach((star) => {
      star.x -= star.speed * delta;
      if (star.x < -20) {
        star.x = width + 20 + Math.random() * 40;
        star.y = Math.random() * state.height;
      }
    });
  });

  state.dust.forEach((particle) => {
    particle.x -= particle.speed * delta;
    if (particle.x < -particle.length) {
      particle.x = width + Math.random() * width * 0.2;
      particle.y = state.height * (0.65 + Math.random() * 0.35);
    }
  });
}

function render() {
  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground();
  drawPipes();
  drawBird();
  drawForeground();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#030615");
  gradient.addColorStop(0.45, "#0c1f38");
  gradient.addColorStop(1, "#02030b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  state.nebulas.forEach((nebula, index) => {
    const gradientNebula = ctx.createRadialGradient(
      nebula.x,
      nebula.y,
      nebula.radius * 0.1,
      nebula.x,
      nebula.y,
      nebula.radius
    );
    gradientNebula.addColorStop(0, `hsla(${nebula.hue}, 82%, 72%, ${nebula.alpha})`);
    gradientNebula.addColorStop(
      0.5,
      `hsla(${nebula.hue + 30}, 78%, 55%, ${nebula.alpha * 0.6})`
    );
    gradientNebula.addColorStop(1, "rgba(5, 10, 24, 0)");
    ctx.fillStyle = gradientNebula;
    ctx.beginPath();
    const distortion = nebula.distortion;
    ctx.ellipse(
      nebula.x,
      nebula.y,
      nebula.radius * (0.6 + distortion),
      nebula.radius * (0.4 + distortion),
      index % 2 === 0 ? 0.25 : -0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  state.stars.forEach((layer) => {
    layer.forEach((star) => {
      const gradientStar = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        star.size * 3
      );
      gradientStar.addColorStop(0, `hsla(${star.hue}, 90%, 75%, ${star.alpha})`);
      gradientStar.addColorStop(
        0.4,
        `hsla(${star.hue}, 94%, 65%, ${star.alpha * 0.7})`
      );
      gradientStar.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradientStar;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function drawPipes() {
  state.pipes.forEach((pipe) => {
    const shimmer = (Math.sin(performance.now() / 400 + pipe.x * 0.01) + 1) * 0.22;
    const bodyGradientTop = ctx.createLinearGradient(
      pipe.x,
      0,
      pipe.x + pipe.width,
      0
    );
    bodyGradientTop.addColorStop(0, `rgba(65, 225, 255, ${0.65 + shimmer})`);
    bodyGradientTop.addColorStop(1, `rgba(177, 129, 255, ${0.75 + shimmer * 0.8})`);

    // Upper pipe
    ctx.fillStyle = bodyGradientTop;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapTop);

    const edgeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x, 40);
    edgeGradient.addColorStop(0, "rgba(255,255,255,0.4)");
    edgeGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(pipe.x - 2, pipe.gapTop - 18, pipe.width + 4, 24);

    // Lower pipe
    ctx.fillStyle = bodyGradientTop;
    ctx.fillRect(pipe.x, pipe.gapBottom, pipe.width, state.height - pipe.gapBottom);

    const glowGradient = ctx.createLinearGradient(
      pipe.x - 12,
      pipe.gapTop,
      pipe.x + pipe.width + 12,
      pipe.gapBottom
    );
    glowGradient.addColorStop(0, "rgba(66, 222, 255, 0)");
    glowGradient.addColorStop(0.5, "rgba(124, 201, 255, 0.35)");
    glowGradient.addColorStop(1, "rgba(228, 120, 255, 0)");
    ctx.fillStyle = glowGradient;
    ctx.fillRect(pipe.x - 12, pipe.gapTop, pipe.width + 24, pipe.gapBottom - pipe.gapTop);

    const capGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    capGradient.addColorStop(0, "rgba(247, 255, 255, 0.35)");
    capGradient.addColorStop(0.5, "rgba(212, 237, 255, 0.25)");
    capGradient.addColorStop(1, "rgba(255,255,255,0.35)");

    const capHeight = 24;
    // Top cap
    ctx.fillStyle = capGradient;
    ctx.fillRect(pipe.x - 4, pipe.gapTop - capHeight, pipe.width + 8, capHeight);
    // Bottom cap
    ctx.fillRect(pipe.x - 4, pipe.gapBottom, pipe.width + 8, capHeight);
  });
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  const bodyGradient = ctx.createLinearGradient(-20, -20, 30, 20);
  bodyGradient.addColorStop(0, "rgba(247, 255, 255, 0.92)");
  bodyGradient.addColorStop(0.4, "rgba(138, 214, 255, 0.95)");
  bodyGradient.addColorStop(1, "rgba(247, 158, 255, 0.95)");

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.width * 0.48, bird.height * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  const wingTime = ((performance.now() - bird.flapTime) / 1000) * 8;
  const wingOffset = Math.sin(wingTime) * 14;
  const wingGradient = ctx.createLinearGradient(-28, -6, 16, 8);
  wingGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
  wingGradient.addColorStop(1, "rgba(162, 236, 255, 0.3)");

  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.moveTo(-12, 4);
  ctx.quadraticCurveTo(-32, -6 - wingOffset, -4, -12 - wingOffset * 0.6);
  ctx.quadraticCurveTo(18, -10 - wingOffset * 0.5, 12, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#192942";
  ctx.beginPath();
  ctx.arc(14, -4, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(16, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fef6ff";
  ctx.beginPath();
  ctx.moveTo(24, 2);
  ctx.quadraticCurveTo(42, 2, 30, 10);
  ctx.quadraticCurveTo(18, 10, 24, 2);
  ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 12, 0, 0, 52);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawForeground() {
  const groundHeight = state.height * 0.18;
  const groundY = state.height - groundHeight;

  const gradient = ctx.createLinearGradient(0, groundY, 0, state.height);
  gradient.addColorStop(0, "rgba(10, 24, 50, 0.75)");
  gradient.addColorStop(0.6, "rgba(6, 18, 40, 0.92)");
  gradient.addColorStop(1, "rgba(3, 10, 24, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundY, state.width, groundHeight);

  ctx.strokeStyle = "rgba(92, 166, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const waveAmplitude = 12;
  const waveLength = 180;
  const time = performance.now() / 900;
  for (let x = 0; x <= state.width; x += 6) {
    const y =
      groundY +
      Math.sin((x + time * 70) / waveLength) * waveAmplitude +
      Math.cos((x - time * 50) / (waveLength * 0.6)) * (waveAmplitude * 0.6);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(state.width, state.height);
  ctx.lineTo(0, state.height);
  ctx.closePath();
  ctx.stroke();

  state.dust.forEach((particle) => {
    const dustGradient = ctx.createLinearGradient(
      particle.x,
      particle.y,
      particle.x + particle.length,
      particle.y
    );
    dustGradient.addColorStop(0, `rgba(120, 189, 255, 0)`);
    dustGradient.addColorStop(0.5, `rgba(120, 189, 255, ${particle.alpha})`);
    dustGradient.addColorStop(1, `rgba(120, 189, 255, 0)`);
    ctx.strokeStyle = dustGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x + particle.length, particle.y);
    ctx.stroke();
  });

  const highlightGradient = ctx.createRadialGradient(
    bird.x,
    state.height,
    0,
    bird.x,
    state.height,
    groundHeight * 1.2
  );
  highlightGradient.addColorStop(0, "rgba(112, 208, 255, 0.28)");
  highlightGradient.addColorStop(1, "rgba(112, 208, 255, 0)");
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.ellipse(
    bird.x,
    state.height - groundHeight * 0.35,
    120,
    40,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.05);
  state.lastTimestamp = timestamp;
  update(delta);
  render();
  requestAnimationFrame(loop);
}

playButton.addEventListener("click", startGame);

window.addEventListener("pointerdown", (event) => {
  if (event.target === playButton) return;
  handlePrimaryAction();
});

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
    event.preventDefault();
    handlePrimaryAction();
  }
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

window.addEventListener("focus", () => {
  state.lastTimestamp = performance.now();
});

resizeCanvas();
updateScoreboard();
requestAnimationFrame((ts) => {
  state.lastTimestamp = ts;
  requestAnimationFrame(loop);
});
