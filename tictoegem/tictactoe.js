/* ============================
   TIC TAC TOE – LOGIC
   Created by Sundar Dhami
   ============================ */

// ---- State ----
let board = Array(9).fill('');
let currentPlayer = 'X';
let gameMode = 'pvp'; // 'cpu' or 'pvp'
let difficulty = 'easy'; // 'easy', 'medium', 'hard'
let gameActive = true;
let scores = { X: 0, O: 0, draw: 0 };

const WIN_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],  // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],  // cols
    [0, 4, 8], [2, 4, 6]              // diags
];

function cellCenter(idx) {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return { x: col * 100 + 50, y: row * 100 + 50 };
}

// =====================
//   NAVIGATION
// =====================
function showScreen(id) {
    document.querySelectorAll('.ttt-screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showDifficulty() {
    showScreen('ttt-difficulty');
}

function startGame(mode, diff) {
    gameMode = mode;
    if (diff) difficulty = diff;

    const xLabel = document.getElementById('x-label');
    const oLabel = document.getElementById('o-label');
    if (mode === 'cpu') {
        xLabel.textContent = 'You';
        const diffLabels = { easy: 'CPU 🟢', medium: 'CPU 🟡', hard: 'CPU 🔴' };
        oLabel.textContent = diffLabels[difficulty] || 'Computer';
    } else {
        xLabel.textContent = 'Player 1';
        oLabel.textContent = 'Player 2';
    }
    scores = { X: 0, O: 0, draw: 0 };
    updateScores();
    resetBoard();
    showScreen('ttt-game');
}

function backToMode() {
    showScreen('ttt-mode');
}

// =====================
//   CELL CLICK
// =====================
function cellClick(i) {
    if (!gameActive || board[i] !== '') return;
    if (gameMode === 'cpu' && currentPlayer === 'O') return;

    makeMove(i, currentPlayer);

    const result = checkWin();
    if (result) { endRound(result); return; }

    switchPlayer();

    // AI move
    if (gameMode === 'cpu' && currentPlayer === 'O' && gameActive) {
        setTimeout(() => {
            const aiIdx = aiMove();
            makeMove(aiIdx, 'O');
            const r = checkWin();
            if (r) { endRound(r); return; }
            switchPlayer();
        }, 400);
    }
}

function makeMove(i, player) {
    board[i] = player;
    const cell = document.querySelector(`.ttt-cell[data-i="${i}"]`);
    cell.textContent = player === 'X' ? '❌' : '⭕';
    cell.classList.add('taken', player === 'X' ? 'x-mark' : 'o-mark');
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnText();
}

function updateTurnText() {
    const el = document.getElementById('turn-text');
    if (gameMode === 'cpu') {
        el.textContent = currentPlayer === 'X' ? '❌ Your turn' : '⭕ Computer thinking…';
    } else {
        el.textContent = currentPlayer === 'X' ? '❌ Player 1\'s turn' : '⭕ Player 2\'s turn';
    }
}

// =====================
//   WIN CHECK
// =====================
function checkWin() {
    for (const combo of WIN_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], combo };
        }
    }
    if (board.every(c => c !== '')) return { winner: 'draw', combo: null };
    return null;
}

// =====================
//   END ROUND
// =====================
function endRound(result) {
    gameActive = false;
    const resultDiv = document.getElementById('ttt-result');
    const resultText = document.getElementById('ttt-result-text');
    resultDiv.className = 'ttt-result';

    if (result.winner === 'draw') {
        scores.draw++;
        resultDiv.classList.add('draw-result');
        resultText.textContent = '🤝 It\'s a Draw!';
    } else {
        scores[result.winner]++;
        result.combo.forEach(idx => {
            document.querySelector(`.ttt-cell[data-i="${idx}"]`).classList.add('win-cell');
        });
        drawWinLine(result.combo);

        if (result.winner === 'X') {
            resultDiv.classList.add('x-wins');
            resultText.textContent = gameMode === 'cpu' ? '🎉 You Win!' : '🎉 Player 1 (❌) Wins!';
        } else {
            resultDiv.classList.add('o-wins');
            resultText.textContent = gameMode === 'cpu' ? '😔 Computer Wins!' : '🎉 Player 2 (⭕) Wins!';
        }
    }
    document.getElementById('turn-text').textContent = '';
    updateScores();
}

function drawWinLine(combo) {
    const start = cellCenter(combo[0]);
    const end = cellCenter(combo[2]);
    const line = document.getElementById('wl');
    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.classList.remove('animate');
    void line.offsetWidth;
    line.classList.add('animate');
}

function updateScores() {
    document.getElementById('score-x').textContent = scores.X;
    document.getElementById('score-o').textContent = scores.O;
    document.getElementById('score-draw').textContent = scores.draw;
}

// =====================
//   RESET BOARD
// =====================
function resetBoard() {
    board = Array(9).fill('');
    currentPlayer = 'X';
    gameActive = true;

    document.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.textContent = '';
        cell.className = 'ttt-cell';
    });

    const resultDiv = document.getElementById('ttt-result');
    resultDiv.className = 'ttt-result hidden';

    const line = document.getElementById('wl');
    line.classList.remove('animate');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', 0);
    line.setAttribute('y2', 0);

    updateTurnText();
}

// =====================
//   AI — DIFFICULTY LEVELS
// =====================

function aiMove() {
    switch (difficulty) {
        case 'easy': return aiEasy();
        case 'medium': return aiMedium();
        case 'hard': return aiHard();
        default: return aiHard();
    }
}

// --- BASIC: Mostly random, but blocks obvious wins ---
function aiEasy() {
    const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);

    // 30% chance to make a smart move (block or win)
    if (Math.random() < 0.3) {
        // Try to win first
        const winMove = findWinningMove('O');
        if (winMove !== -1) return winMove;
        // Try to block player
        const blockMove = findWinningMove('X');
        if (blockMove !== -1) return blockMove;
    }

    // Otherwise pick random
    return empty[Math.floor(Math.random() * empty.length)];
}

// --- MEDIUM: Mix of smart (60%) and random (40%) ---
function aiMedium() {
    const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i !== -1);

    // Always try to win if possible
    const winMove = findWinningMove('O');
    if (winMove !== -1) return winMove;

    // Always block if opponent is about to win
    const blockMove = findWinningMove('X');
    if (blockMove !== -1) return blockMove;

    // 60% chance to use minimax for best move, 40% random
    if (Math.random() < 0.6) {
        return aiHard();
    }

    // Otherwise pick random from remaining
    return empty[Math.floor(Math.random() * empty.length)];
}

// --- HARD: Unbeatable minimax ---
function aiHard() {
    let bestScore = -Infinity;
    let bestIdx = -1;

    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            const score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
    }
    return bestIdx;
}

// Helper: find a move that wins for the given player
function findWinningMove(player) {
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = player;
            const won = WIN_COMBOS.some(([a, b, c]) =>
                board[a] && board[a] === board[b] && board[a] === board[c]
            );
            board[i] = '';
            if (won) return i;
        }
    }
    return -1;
}

// =====================
//   MINIMAX (for Hard)
// =====================
function minimax(b, depth, isMaximizing) {
    const result = minimaxCheck(b);
    if (result !== null) {
        if (result === 'O') return 10 - depth;
        if (result === 'X') return depth - 10;
        return 0;
    }

    if (isMaximizing) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (b[i] === '') {
                b[i] = 'O';
                best = Math.max(best, minimax(b, depth + 1, false));
                b[i] = '';
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (b[i] === '') {
                b[i] = 'X';
                best = Math.min(best, minimax(b, depth + 1, true));
                b[i] = '';
            }
        }
        return best;
    }
}

function minimaxCheck(b) {
    for (const [a, bb, c] of WIN_COMBOS) {
        if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a];
    }
    if (b.every(c => c !== '')) return 'draw';
    return null;
}
