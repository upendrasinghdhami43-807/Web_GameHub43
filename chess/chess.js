document.addEventListener('DOMContentLoaded', () => {
    const boardEl = document.getElementById('chessboard');
    const startBtn = document.getElementById('start-btn');
    const endBtn = document.getElementById('end-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const winModal = document.getElementById('win-modal');
    const sessionsEl = document.getElementById('game-sessions');

    let showMoves = true;
    let gameActive = false;
    let isPaused = false;
    let playerColor = 'white';
    let aiMode = 'medium';
    let currentTurn = 'white';
    let selectedSquare = null;
    let validMovesForSelected = [];
    let currentGameName = 'Game 1';
    let gameNameCounter = 1;

    let timerWhite = 600;
    let timerBlack = 600;
    let timerInterval = null;
    let gameHistory = JSON.parse(localStorage.getItem('chessHistory')) || [];
    let gameSessions = [{ id: Date.now(), name: currentGameName }];

    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    const initialBoard = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    let board = JSON.parse(JSON.stringify(initialBoard));

    function getOpponentText() {
        const select = document.getElementById('opponent-select');
        return select.options[select.selectedIndex].text;
    }

    function getSideNames() {
        if (aiMode === 'local') {
            return { white: 'Player White', black: 'Player Black' };
        }
        if (playerColor === 'white') {
            return { white: currentGameName, black: getOpponentText() };
        }
        return { white: getOpponentText(), black: currentGameName };
    }

    function renderGameSessions() {
        sessionsEl.innerHTML = '';
        gameSessions.forEach((session) => {
            const chip = document.createElement('div');
            chip.className = `session-chip ${session.name === currentGameName ? 'active' : ''}`;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = session.name;
            nameSpan.addEventListener('click', () => {
                currentGameName = session.name;
                renderGameSessions();
                initGame();
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '×';
            delBtn.title = 'Delete game';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                gameSessions = gameSessions.filter((g) => g.id !== session.id);
                if (gameSessions.length === 0) {
                    gameNameCounter += 1;
                    currentGameName = `Game ${gameNameCounter}`;
                    gameSessions.push({ id: Date.now(), name: currentGameName });
                }
                if (!gameSessions.some((g) => g.name === currentGameName)) {
                    currentGameName = gameSessions[0].name;
                }
                renderGameSessions();
            });

            chip.appendChild(nameSpan);
            chip.appendChild(delBtn);
            sessionsEl.appendChild(chip);
        });
    }

    function createNamedGame() {
        const inputName = window.prompt('Enter new game name:', `Game ${gameNameCounter + 1}`);
        if (inputName === null) return;
        const trimmed = inputName.trim();
        const nextName = trimmed || `Game ${gameNameCounter + 1}`;
        const uniqueName = gameSessions.some((g) => g.name.toLowerCase() === nextName.toLowerCase())
            ? `${nextName} ${Date.now().toString().slice(-3)}`
            : nextName;
        gameNameCounter += 1;
        currentGameName = uniqueName;
        gameSessions.push({ id: Date.now() + gameNameCounter, name: uniqueName });
        renderGameSessions();
        initGame();
    }

    function applyPauseState() {
        pauseBtn.textContent = isPaused ? 'Play' : 'Pause';
        pauseBtn.disabled = !gameActive;
    }

    function restartSetup() {
        clearInterval(timerInterval);
        gameActive = false;
        isPaused = false;
        selectedSquare = null;
        validMovesForSelected = [];
        board = JSON.parse(JSON.stringify(initialBoard));
        currentTurn = 'white';

        document.getElementById('time-select').value = '10';
        document.getElementById('opponent-select').value = 'medium';
        document.getElementById('color-select').value = 'white';
        playerColor = 'white';
        aiMode = 'medium';

        timerWhite = 600;
        timerBlack = 600;
        winModal.classList.add('hidden');
        startBtn.classList.remove('hidden');
        endBtn.classList.add('hidden');
        document.getElementById('opponent-name').innerText = 'Computer - Medium (40%)';
        applyPauseState();
        renderBoard();
    }

    function swapPlayerPosition() {
        const currentColor = document.getElementById('color-select').value;
        const nextColor = currentColor === 'white' ? 'black' : 'white';
        document.getElementById('color-select').value = nextColor;
        playerColor = nextColor;
        selectedSquare = null;
        validMovesForSelected = [];
        renderBoard();

        if (gameActive && !isPaused && aiMode !== 'local' && currentTurn !== playerColor) {
            setTimeout(makeAIMove, 350);
        }
    }

    function initGame() {
        board = JSON.parse(JSON.stringify(initialBoard));
        currentTurn = 'white';
        selectedSquare = null;
        validMovesForSelected = [];
        gameActive = true;
        isPaused = false;
        winModal.classList.add('hidden');

        playerColor = document.getElementById('color-select').value;
        aiMode = document.getElementById('opponent-select').value;
        showMoves = document.getElementById('show-moves-toggle').checked;
        document.getElementById('opponent-name').innerText = getOpponentText();

        startBtn.classList.add('hidden');
        endBtn.classList.remove('hidden');
        applyPauseState();

        const tVal = document.getElementById('time-select').value;
        timerWhite = timerBlack = tVal === 'unlimited' ? Infinity : parseInt(tVal, 10) * 60;
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimers, 1000);

        renderBoard();
        if (aiMode !== 'local' && playerColor === 'black') setTimeout(makeAIMove, 500);
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        const isFlipped = playerColor === 'black';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const vR = isFlipped ? 7 - r : r;
                const vC = isFlipped ? 7 - c : c;

                const sq = document.createElement('div');
                sq.className = `square ${(vR + vC) % 2 === 0 ? 'light' : 'dark'}`;

                const piece = board[vR][vC];
                if (piece) {
                    const pSpan = document.createElement('span');
                    pSpan.innerText = pieces[piece];
                    pSpan.className = `piece ${isWhite(piece) ? 'white' : 'black'}`;
                    sq.appendChild(pSpan);
                }

                if (selectedSquare && selectedSquare.r === vR && selectedSquare.c === vC) sq.classList.add('selected');

                const isTarget = validMovesForSelected.some((m) => m.r === vR && m.c === vC);
                if (isTarget && showMoves) {
                    sq.classList.add('valid-move');
                    if (piece) sq.classList.add('has-piece');
                }

                sq.addEventListener('click', () => handleSquareClick(vR, vC));
                boardEl.appendChild(sq);
            }
        }
        updateTimerDisplay();
    }

    function handleSquareClick(r, c) {
        if (!gameActive || isPaused || (aiMode !== 'local' && currentTurn !== playerColor)) return;

        const piece = board[r][c];
        const isOwnPiece = piece && (currentTurn === 'white' ? isWhite(piece) : isBlack(piece));

        if (selectedSquare && validMovesForSelected.some((m) => m.r === r && m.c === c)) {
            executeMove(selectedSquare.r, selectedSquare.c, r, c);
            return;
        }

        if (isOwnPiece) {
            selectedSquare = { r, c };
            validMovesForSelected = getLegalMoves(r, c, board, currentTurn);
        } else {
            selectedSquare = null;
            validMovesForSelected = [];
        }
        renderBoard();
    }

    function executeMove(fromR, fromC, toR, toC) {
        const piece = board[fromR][fromC];
        const target = board[toR][toC];

        board[toR][toC] = piece;
        board[fromR][fromC] = '';
        selectedSquare = null;
        validMovesForSelected = [];

        const sideNames = getSideNames();
        if (target === 'k') return triggerEndGame({ side: 'white', message: `${sideNames.white} wins by king capture!` });
        if (target === 'K') return triggerEndGame({ side: 'black', message: `${sideNames.black} wins by king capture!` });

        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        renderBoard();

        if (gameActive && !isPaused && aiMode !== 'local' && currentTurn !== playerColor) {
            setTimeout(makeAIMove, 600);
        }
    }

    function isWhite(p) { return p && p === p.toUpperCase(); }
    function isBlack(p) { return p && p === p.toLowerCase() && p !== ''; }
    function isEnemy(p, color) { return color === 'white' ? isBlack(p) : isWhite(p); }

    function getLegalMoves(r, c, brd, turn) {
        return getPseudoMoves(r, c, brd, turn).filter((move) => {
            const tBrd = brd.map((row) => [...row]);
            tBrd[move.r][move.c] = tBrd[r][c];
            tBrd[r][c] = '';
            return !isKingInCheck(tBrd, turn);
        });
    }

    function getPseudoMoves(r, c, brd, turn) {
        const p = brd[r][c];
        const type = p.toLowerCase();
        const moves = [];
        const dirs = {
            r: [[0, 1], [0, -1], [1, 0], [-1, 0]],
            b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            q: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        };

        if (['r', 'b', 'q'].includes(type)) {
            for (const d of dirs[type]) {
                let nr = r + d[0];
                let nc = c + d[1];
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (brd[nr][nc] === '') moves.push({ r: nr, c: nc });
                    else {
                        if (isEnemy(brd[nr][nc], turn)) moves.push({ r: nr, c: nc });
                        break;
                    }
                    nr += d[0];
                    nc += d[1];
                }
            }
        }
        if (type === 'n') {
            [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach((j) => {
                const nr = r + j[0];
                const nc = c + j[1];
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && (!brd[nr][nc] || isEnemy(brd[nr][nc], turn))) {
                    moves.push({ r: nr, c: nc });
                }
            });
        }
        if (type === 'k') {
            dirs.q.forEach((d) => {
                const nr = r + d[0];
                const nc = c + d[1];
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && (!brd[nr][nc] || isEnemy(brd[nr][nc], turn))) {
                    moves.push({ r: nr, c: nc });
                }
            });
        }
        if (type === 'p') {
            const dir = turn === 'white' ? -1 : 1;
            const startRow = turn === 'white' ? 6 : 1;
            if (brd[r + dir] && brd[r + dir][c] === '') {
                moves.push({ r: r + dir, c });
                if (r === startRow && brd[r + 2 * dir][c] === '') moves.push({ r: r + 2 * dir, c });
            }
            if (brd[r + dir] && brd[r + dir][c - 1] && isEnemy(brd[r + dir][c - 1], turn)) moves.push({ r: r + dir, c: c - 1 });
            if (brd[r + dir] && brd[r + dir][c + 1] && isEnemy(brd[r + dir][c + 1], turn)) moves.push({ r: r + dir, c: c + 1 });
        }
        return moves;
    }

    function isKingInCheck(tBrd, color) {
        const kChar = color === 'white' ? 'K' : 'k';
        let kr = -1;
        let kc = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (tBrd[r][c] === kChar) {
                    kr = r;
                    kc = c;
                }
            }
        }
        const opp = color === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((opp === 'white' && isWhite(tBrd[r][c])) || (opp === 'black' && isBlack(tBrd[r][c]))) {
                    if (getPseudoMoves(r, c, tBrd, opp).some((m) => m.r === kr && m.c === kc)) return true;
                }
            }
        }
        return false;
    }

    function makeAIMove() {
        if (!gameActive || isPaused) return;
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((currentTurn === 'white' && isWhite(board[r][c])) || (currentTurn === 'black' && isBlack(board[r][c]))) {
                    getLegalMoves(r, c, board, currentTurn).forEach((m) => allMoves.push({ from: { r, c }, to: m }));
                }
            }
        }

        if (allMoves.length === 0) {
            const sideNames = getSideNames();
            const winnerSide = currentTurn === 'white' ? 'black' : 'white';
            const winnerName = winnerSide === 'white' ? sideNames.white : sideNames.black;
            return triggerEndGame({ side: winnerSide, message: `${winnerName} wins!` });
        }

        const randMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        let bestScore = -Infinity;
        let bestMoves = [];
        const vals = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

        allMoves.forEach((m) => {
            const score = board[m.to.r][m.to.c] ? vals[board[m.to.r][m.to.c].toLowerCase()] : 0;
            if (score > bestScore) {
                bestScore = score;
                bestMoves = [m];
            } else if (score === bestScore) {
                bestMoves.push(m);
            }
        });

        const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        const chance = Math.random();
        let chosen;

        if (aiMode === 'basic') chosen = randMove;
        else if (aiMode === 'medium') chosen = chance < 0.4 ? bestMove : randMove;
        else if (aiMode === 'friendly') chosen = chance < 0.7 ? bestMove : randMove;
        else chosen = bestMove;

        executeMove(chosen.from.r, chosen.from.c, chosen.to.r, chosen.to.c);
    }

    function updateTimers() {
        if (!gameActive || isPaused || timerWhite === Infinity) return;
        if (currentTurn === 'white') timerWhite -= 1;
        else timerBlack -= 1;
        updateTimerDisplay();
        if (timerWhite <= 0) {
            const sideNames = getSideNames();
            triggerEndGame({ side: 'black', message: `${sideNames.black} wins on time!` });
        }
        if (timerBlack <= 0) {
            const sideNames = getSideNames();
            triggerEndGame({ side: 'white', message: `${sideNames.white} wins on time!` });
        }
    }

    function updateTimerDisplay() {
        const isFlipped = playerColor === 'black';
        document.getElementById('timer-bottom').innerText = formatTime(isFlipped ? timerBlack : timerWhite);
        document.getElementById('timer-top').innerText = formatTime(isFlipped ? timerWhite : timerBlack);
    }

    function formatTime(sec) {
        if (sec === Infinity) return '∞';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function triggerEndGame(outcome) {
        gameActive = false;
        isPaused = false;
        clearInterval(timerInterval);
        applyPauseState();

        let message = outcome.message;
        if (!message && outcome.side) {
            const sideNames = getSideNames();
            message = outcome.side === 'white' ? `${sideNames.white} wins!` : `${sideNames.black} wins!`;
        }
        if (!message) message = 'Game over';

        document.getElementById('win-message').innerText = message;
        winModal.classList.remove('hidden');
        startBtn.classList.remove('hidden');
        endBtn.classList.add('hidden');

        saveGameToHistory(message);
    }

    function saveGameToHistory(resultText) {
        const timeControl = document.getElementById('time-select').value;
        const gameRecord = {
            date: new Date().toLocaleString(),
            gameName: currentGameName,
            opponent: getOpponentText(),
            result: resultText,
            playerColor,
            timeControl: timeControl === 'unlimited' ? 'Unlimited' : `${timeControl} min`
        };
        gameHistory.push(gameRecord);
        if (gameHistory.length > 20) gameHistory.shift();
        localStorage.setItem('chessHistory', JSON.stringify(gameHistory));
        displayGameHistory();
    }

    function displayGameHistory() {
        const historyDiv = document.getElementById('game-history');
        if (gameHistory.length === 0) {
            historyDiv.innerHTML = '<p class="no-history">No games played yet</p>';
            return;
        }
        historyDiv.innerHTML = gameHistory.slice().reverse().map((game) => `
            <div class="history-item">
                <div class="history-result">${game.result}</div>
                <div class="history-details">
                    <span>${game.gameName}</span>
                    <span>${game.opponent}</span>
                    <span>${game.playerColor}</span>
                    <span>${game.timeControl}</span>
                </div>
                <div class="history-date">${game.date}</div>
            </div>
        `).join('');
    }

    function clearGameHistory() {
        gameHistory = [];
        localStorage.removeItem('chessHistory');
        displayGameHistory();
    }

    function togglePauseGame() {
        if (!gameActive) return;
        isPaused = !isPaused;
        applyPauseState();
        if (isPaused) {
            clearInterval(timerInterval);
        } else {
            clearInterval(timerInterval);
            timerInterval = setInterval(updateTimers, 1000);
            if (aiMode !== 'local' && currentTurn !== playerColor) {
                setTimeout(makeAIMove, 350);
            }
        }
    }

    startBtn.addEventListener('click', initGame);
    endBtn.addEventListener('click', () => {
        const sideNames = getSideNames();
        const resignWinner = currentTurn === 'white' ? sideNames.black : sideNames.white;
        triggerEndGame({ message: `${resignWinner} wins by resignation!` });
    });
    document.getElementById('rematch-btn').addEventListener('click', initGame);
    document.getElementById('new-game-btn-setup').addEventListener('click', createNamedGame);
    document.getElementById('restart-setup-btn').addEventListener('click', restartSetup);
    document.getElementById('swap-btn').addEventListener('click', swapPlayerPosition);
    document.getElementById('pause-btn').addEventListener('click', togglePauseGame);
    document.getElementById('clear-history-btn').addEventListener('click', clearGameHistory);

    document.getElementById('theme-select').addEventListener('change', (e) => { boardEl.dataset.board = e.target.value; });
    document.getElementById('piece-select').addEventListener('change', (e) => { boardEl.dataset.piece = e.target.value; });
    document.getElementById('show-moves-toggle').addEventListener('change', (e) => {
        showMoves = e.target.checked;
        renderBoard();
    });

    document.getElementById('fullscreen-btn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.body.classList.add('fullscreen-mode');
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
            document.body.classList.remove('fullscreen-mode');
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) document.body.classList.remove('fullscreen-mode');
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.remove('hidden');
        });
    });

    renderBoard();
    renderGameSessions();
    displayGameHistory();
    applyPauseState();
});