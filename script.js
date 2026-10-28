
/* ===== NUMBER HUNTER: GAME SETTINGS ===== */

const difficulties = {
    easy: { maxNumber: 50, attempts: 10, label: "Easy" },
    medium: { maxNumber: 100, attempts: 7, label: "Medium" },
    hard: { maxNumber: 500, attempts: 5, label: "Hard" }
};

let selectedDifficulty = "medium";
let secretNumber;
let attemptsLeft;
let maxAttempts;
let maxNumber;
let score = Number(localStorage.getItem("numberHunterScore")) || 0;
let gameOver = false;
let audioContext;

/* ===== CONNECT HTML ELEMENTS ===== */

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");

const startButton = document.getElementById("startButton");
const guessButton = document.getElementById("guessButton");
const restartButton = document.getElementById("restartButton");
const backHomeButton = document.getElementById("backHomeButton");
const leaderboardButton = document.getElementById("leaderboardButton");
const leaderboardPlayButton = document.getElementById("leaderboardPlayButton");
const leaderboardHomeButton = document.getElementById("leaderboardHomeButton");
const clearLeaderboardButton = document.getElementById("clearLeaderboardButton");

const guessInput = document.getElementById("guessInput");
const message = document.getElementById("message");
const attemptsText = document.getElementById("attempts");
const scoreText = document.getElementById("score");
const difficultyLabel = document.getElementById("difficultyLabel");
const rangeLabel = document.getElementById("rangeLabel");
const gameContainer = document.querySelector(".game-container");
const leaderboardList = document.getElementById("leaderboardList");

const difficultyCards = document.querySelectorAll(".difficulty-card");
const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

/* ===== SAFE STORAGE HELPERS ===== */

function readNumber(key) {
    try {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
        return 0;
    }
}

function readLeaderboard() {
    try {
        const data = JSON.parse(
            localStorage.getItem("numberHunterLeaderboard") || "[]"
        );
        return Array.isArray(data)
            ? data.filter(item =>
                item &&
                typeof item.name === "string" &&
                Number.isFinite(item.score) &&
                item.score >= 0
            ).slice(0, 10)
            : [];
    } catch {
        return [];
    }
}

score = readNumber("numberHunterScore");
scoreText.textContent = "🏆 Score: " + score;

/* ===== SCREEN NAVIGATION ===== */

function showScreen(screen) {
    homeScreen.hidden = screen !== "home";
    gameScreen.hidden = screen !== "game";
    leaderboardScreen.hidden = screen !== "leaderboard";
}

function selectDifficulty(card) {
    selectedDifficulty = card.dataset.difficulty;

    difficultyCards.forEach(item => {
        const active = item === card;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
    });
}

difficultyCards.forEach(card => {
    card.addEventListener("click", () => selectDifficulty(card));
});

/* ===== SOUND EFFECTS ===== */

function playSound(frequency, duration = 0.15) {
    try {
        audioContext ??= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch {
        // The game still works if audio is unavailable.
    }
}

/* ===== START AND RESET GAME ===== */

function startGame() {
    const settings = difficulties[selectedDifficulty];

    maxNumber = settings.maxNumber;
    maxAttempts = settings.attempts;
    attemptsLeft = maxAttempts;
    secretNumber = Math.floor(Math.random() * maxNumber) + 1;
    gameOver = false;

    difficultyLabel.textContent = "Difficulty: " + settings.label;
    rangeLabel.textContent = "Guess between 1 and " + maxNumber;
    guessInput.min = 1;
    guessInput.max = maxNumber;
    guessInput.value = "";

    attemptsText.textContent = "Attempts left: " + attemptsLeft;
    scoreText.textContent = "🏆 Score: " + score;
    message.textContent = "Ready to play? Find the secret number!";
    guessButton.disabled = false;

    gameContainer.classList.remove("winner");
    message.classList.remove("win-message");

    showScreen("game");
    guessInput.focus();
    playSound(500);
}

/* ===== LEADERBOARD ===== */

function saveLeaderboardEntry(points) {
    const records = readLeaderboard();

    records.push({
        name: difficulties[selectedDifficulty].label,
        score: points,
        date: new Date().toLocaleDateString()
    });

    records.sort((a, b) => b.score - a.score);
    const topTen = records.slice(0, 10);

    try {
        localStorage.setItem(
            "numberHunterLeaderboard",
            JSON.stringify(topTen)
        );
    } catch {
        message.textContent += " (Could not save leaderboard.)";
    }
}

function renderLeaderboard() {
    const records = readLeaderboard();
    leaderboardList.replaceChildren();

    if (records.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No scores yet. Start hunting!";
        leaderboardList.appendChild(item);
        return;
    }

    records.forEach((record, index) => {
        const item = document.createElement("li");
        item.textContent =
            `#${index + 1} — ${record.name}: ${record.score} points (${record.date})`;
        leaderboardList.appendChild(item);
    });
}

/* ===== CHECK GUESS ===== */

function checkGuess() {
    if (gameOver) return;

    const value = guessInput.value.trim();
    const guess = Number(value);

    if (
        value === "" ||
        !Number.isInteger(guess) ||
        guess < 1 ||
        guess > maxNumber
    ) {
        message.textContent =
            "Enter a whole number from 1 to " + maxNumber + "!";
        playSound(180);
        return;
    }

    attemptsLeft--;
    attemptsText.textContent = "Attempts left: " + attemptsLeft;

    if (guess === secretNumber) {
        gameOver = true;

        const pointsEarned = attemptsLeft * 100 + 100;
        score += pointsEarned;

        try {
            localStorage.setItem("numberHunterScore", String(score));
        } catch {
            // Current-session score still updates.
        }

        scoreText.textContent = "🏆 Score: " + score;
        message.textContent =
            "🎉 YOU WIN! +" + pointsEarned + " points!";

        saveLeaderboardEntry(pointsEarned);
        celebrateVictory();
        playSound(880, 0.4);
        guessButton.disabled = true;
        return;
    }

    if (guess < secretNumber) {
        message.textContent = "⬆️ Too Low! Try a higher number.";
        playSound(300);
    } else {
        message.textContent = "⬇️ Too High! Try a lower number.";
        playSound(220);
    }

    guessInput.value = "";

    if (attemptsLeft === 0) {
        gameOver = true;
        message.textContent = "Game Over! The number was " + secretNumber;
        guessButton.disabled = true;
        playSound(150, 0.4);
    }
}

/* ===== VICTORY CELEBRATION ===== */

function celebrateVictory() {
    gameContainer.classList.add("winner");
    message.classList.add("win-message");

    if (prefersReducedMotion.matches) return;

    const colors = ["#facc15", "#a78bfa", "#22d3ee", "#4ade80", "#fb7185"];

    for (let i = 0; i < 90; i++) {
        const piece = document.createElement("div");

        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 1.2 + "s";
        piece.style.animationDuration = 2 + Math.random() * 2 + "s";

        document.body.appendChild(piece);
        piece.addEventListener("animationend", () => piece.remove());
    }
}

/* ===== BUTTON EVENTS ===== */

startButton.addEventListener("click", startGame);
leaderboardPlayButton.addEventListener("click", startGame);
guessButton.addEventListener("click", checkGuess);

guessInput.addEventListener("keydown", event => {
    if (event.key === "Enter") checkGuess();
});

restartButton.addEventListener("click", startGame);

backHomeButton.addEventListener("click", () => {
    showScreen("home");
});

leaderboardButton.addEventListener("click", () => {
    renderLeaderboard();
    showScreen("leaderboard");
});

leaderboardHomeButton.addEventListener("click", () => {
    showScreen("home");
});

clearLeaderboardButton.addEventListener("click", () => {
    if (confirm("Clear all saved leaderboard records?")) {
        try {
            localStorage.removeItem("numberHunterLeaderboard");
        } catch {
            // Storage might be unavailable.
        }
        renderLeaderboard();
    }
});

/* ===== INITIAL SCREEN ===== */

showScreen("home");
renderLeaderboard();

/* ===== ARCADE BACKGROUND PARTICLES ===== */

function createArcadeParticles() {
    if (prefersReducedMotion.matches) return;

    // Avoid creating duplicate particles.
    if (document.querySelector(".arcade-particle")) return;

    for (let i = 0; i < 22; i++) {
        const particle = document.createElement("div");

        particle.className = "arcade-particle";
        particle.style.left = Math.random() * 100 + "vw";
        particle.style.animationDuration = 8 + Math.random() * 12 + "s";
        particle.style.animationDelay = -Math.random() * 20 + "s";

        document.body.appendChild(particle);
    }
}

createArcadeParticles();

/* ===== ANIMATE GAME MESSAGES ===== */

function animateGameMessage() {
    message.classList.remove("feedback");

    // Restart the CSS animation.
    void message.offsetWidth;

    message.classList.add("feedback");
}

// Animate feedback whenever a new message appears.
const messageObserver = new MutationObserver(animateGameMessage);

messageObserver.observe(message, {
    childList: true,
    characterData: true,
    subtree: true
});
