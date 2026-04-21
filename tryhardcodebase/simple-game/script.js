const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlay-kicker");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startButton = document.getElementById("start-button");

const width = canvas.width;
const height = canvas.height;
const keys = new Set();

let player;
let hazards = [];
let score = 0;
let bestScore = loadBestScore();
let spawnTimer = 0;
let running = false;
let gameOver = false;
let lastFrame = performance.now();

bestScoreElement.textContent = bestScore;

function loadBestScore() {
  try {
    return Number(localStorage.getItem("neon-dodge-best")) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(nextBest) {
  try {
    localStorage.setItem("neon-dodge-best", String(nextBest));
  } catch {
    // Ignore storage failures so the game still works from local files.
  }
}

function resetGame() {
  player = {
    width: 60,
    height: 20,
    x: width / 2 - 30,
    y: height - 56,
    speed: 360,
  };
  hazards = [];
  score = 0;
  spawnTimer = 0;
  gameOver = false;
  updateScore();
}

function startGame() {
  resetGame();
  running = true;
  overlay.classList.add("hidden");
  lastFrame = performance.now();
}

function showOverlay(kicker, title, text, buttonLabel) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonLabel;
  overlay.classList.remove("hidden");
}

function endGame() {
  running = false;
  gameOver = true;
  const finalScore = Math.floor(score);
  if (finalScore > bestScore) {
    bestScore = finalScore;
    bestScoreElement.textContent = bestScore;
    saveBestScore(bestScore);
  }
  showOverlay(
    "Game Over",
    `Score: ${finalScore}`,
    "Press the button or tap space to jump back in and try for a new best run.",
    "Play Again"
  );
}

function updateScore() {
  scoreElement.textContent = Math.floor(score);
}

function spawnHazard() {
  const difficulty = 1 + score / 140;
  const size = 22 + Math.random() * 34;
  hazards.push({
    width: size,
    height: size,
    x: Math.random() * (width - size),
    y: -size,
    speed: 160 + Math.random() * 110 + difficulty * 18,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 2.4,
  });
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function update(deltaSeconds) {
  const moveX = (keys.has("ArrowLeft") || keys.has("a") ? -1 : 0) +
    (keys.has("ArrowRight") || keys.has("d") ? 1 : 0);
  const moveY = (keys.has("ArrowUp") || keys.has("w") ? -1 : 0) +
    (keys.has("ArrowDown") || keys.has("s") ? 1 : 0);

  player.x += moveX * player.speed * deltaSeconds;
  player.y += moveY * player.speed * deltaSeconds;
  player.x = Math.max(0, Math.min(width - player.width, player.x));
  player.y = Math.max(0, Math.min(height - player.height, player.y));

  score += deltaSeconds * 22;
  updateScore();

  const difficulty = Math.max(0.35, 0.92 - score / 900);
  spawnTimer -= deltaSeconds;
  if (spawnTimer <= 0) {
    spawnHazard();
    spawnTimer = difficulty;
  }

  hazards = hazards.filter((hazard) => hazard.y < height + hazard.height);

  for (const hazard of hazards) {
    hazard.y += hazard.speed * deltaSeconds;
    hazard.rotation += hazard.spin * deltaSeconds;
    if (intersects(player, hazard)) {
      endGame();
      break;
    }
  }
}

function roundedRect(x, y, rectWidth, rectHeight, radius) {
  const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + rectWidth - r, y);
  ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + r);
  ctx.lineTo(x + rectWidth, y + rectHeight - r);
  ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - r, y + rectHeight);
  ctx.lineTo(x + r, y + rectHeight);
  ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground() {
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#0d1830");
  background.addColorStop(1, "#050912");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 12; i += 1) {
    const y = ((performance.now() * 0.02) + i * 54) % (height + 80) - 40;
    ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
    ctx.fillRect(0, y, width, 2);
  }

  for (let i = 0; i < 18; i += 1) {
    const x = (i * 31 + 14) % width;
    const y = (i * 57 + 26) % height;
    ctx.fillStyle = "rgba(138, 245, 211, 0.7)";
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const glow = ctx.createLinearGradient(player.x, player.y, player.x + player.width, player.y);
  glow.addColorStop(0, "#8af5d3");
  glow.addColorStop(1, "#39d4ff");

  ctx.save();
  ctx.shadowColor = "rgba(57, 212, 255, 0.55)";
  ctx.shadowBlur = 18;
  roundedRect(player.x, player.y, player.width, player.height, 10);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y - 12);
  ctx.lineTo(player.x + player.width - 8, player.y + 8);
  ctx.lineTo(player.x + 8, player.y + 8);
  ctx.closePath();
  ctx.fillStyle = "#d6fff5";
  ctx.fill();
  ctx.restore();
}

function drawHazard(hazard) {
  ctx.save();
  ctx.translate(hazard.x + hazard.width / 2, hazard.y + hazard.height / 2);
  ctx.rotate(hazard.rotation);
  ctx.shadowColor = "rgba(255, 131, 100, 0.45)";
  ctx.shadowBlur = 16;
  roundedRect(-hazard.width / 2, -hazard.height / 2, hazard.width, hazard.height, 8);
  const fill = ctx.createLinearGradient(-hazard.width / 2, 0, hazard.width / 2, 0);
  fill.addColorStop(0, "#ffb46c");
  fill.addColorStop(1, "#ff6f61");
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawGameOverBanner() {
  if (!gameOver) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundedRect(120, 248, 240, 78, 18);
  ctx.fill();
  ctx.fillStyle = "#f5f7fb";
  ctx.font = "700 28px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("Crashed", width / 2, 280);
  ctx.font = "16px Trebuchet MS";
  ctx.fillStyle = "rgba(245, 247, 251, 0.8)";
  ctx.fillText("Hit space to go again", width / 2, 306);
  ctx.restore();
}

function draw() {
  drawBackground();
  hazards.forEach(drawHazard);
  drawPlayer();
  drawGameOverBanner();
}

function gameLoop(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.032);
  lastFrame = now;

  if (running) {
    update(deltaSeconds);
  }

  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);

  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    if (!running) {
      startGame();
    }
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

startButton.addEventListener("click", startGame);

resetGame();
showOverlay(
  "Ready?",
  "Stay alive.",
  "Use W, A, S, and D or the arrow keys to steer. The blocks speed up over time, so keep moving.",
  "Start Game"
);
requestAnimationFrame(gameLoop);
