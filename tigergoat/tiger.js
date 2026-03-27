const SIZE = 5;
const NODES = SIZE * SIZE;
const EMPTY = 0;
const TIGER = 1;
const GOAT = 2;

const DIRECTIONS = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1]
];

const sideSelect = document.getElementById('side-select');
const opponentSelect = document.getElementById('opponent-select');
const difficultySelect = document.getElementById('difficulty-select');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');

const statusText = document.getElementById('status-text');
const goatsLeftText = document.getElementById('goats-left-text');
const capturedText = document.getElementById('captured-text');
const linesSvg = document.getElementById('board-lines');
const nodesContainer = document.getElementById('board-nodes');

const adjacency = buildAdjacency();
const edges = buildEdges(adjacency);

let state = createInitialState();
let selectedNode = null;
let highlightedTargets = new Set();
let aiTimeout = null;

init();

function init() {
	drawBoardLines();
	createBoardNodes();
	bindControls();
	render();
}

function bindControls() {
	startButton.addEventListener('click', startMatch);
	resetButton.addEventListener('click', () => {
		clearAiTurn();
		state = createInitialState();
		selectedNode = null;
		highlightedTargets.clear();
		render();
	});

	opponentSelect.addEventListener('change', () => {
		difficultySelect.disabled = opponentSelect.value !== 'computer';
	});

	difficultySelect.disabled = opponentSelect.value !== 'computer';
}

function startMatch() {
	clearAiTurn();
	state = createInitialState();
	state.settings = {
		side: sideSelect.value,
		opponent: opponentSelect.value,
		difficulty: difficultySelect.value
	};
	selectedNode = null;
	highlightedTargets.clear();
	render();
	maybeTakeComputerTurn();
}

function createInitialState() {
	const board = Array(NODES).fill(EMPTY);
	[0, 4, 20, 24].forEach(index => {
		board[index] = TIGER;
	});

	return {
		board,
		turn: 'goat',
		goatsPlaced: 0,
		goatsCaptured: 0,
		winner: null,
		settings: {
			side: 'goat',
			opponent: 'human',
			difficulty: 'basic'
		}
	};
}

function createBoardNodes() {
	nodesContainer.innerHTML = '';
	for (let i = 0; i < NODES; i += 1) {
		const [row, col] = rc(i);
		const node = document.createElement('button');
		node.className = 'node empty';
		node.dataset.index = String(i);
		node.style.left = `${(col / (SIZE - 1)) * 100}%`;
		node.style.top = `${(row / (SIZE - 1)) * 100}%`;
		node.addEventListener('click', () => handleNodeClick(i));
		nodesContainer.appendChild(node);
	}
}

function drawBoardLines() {
	linesSvg.innerHTML = '';
	edges.forEach(([from, to]) => {
		const [r1, c1] = rc(from);
		const [r2, c2] = rc(to);
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', String((c1 / (SIZE - 1)) * 100));
		line.setAttribute('y1', String((r1 / (SIZE - 1)) * 100));
		line.setAttribute('x2', String((c2 / (SIZE - 1)) * 100));
		line.setAttribute('y2', String((r2 / (SIZE - 1)) * 100));
		linesSvg.appendChild(line);
	});
}

function handleNodeClick(index) {
	if (state.winner || isComputerTurn()) return;

	if (state.turn === 'goat') {
		handleGoatTurn(index);
	} else {
		handleTigerTurn(index);
	}

	render();
	maybeTakeComputerTurn();
}

function handleGoatTurn(index) {
	const inPlacement = state.goatsPlaced < 20;

	if (inPlacement) {
		if (state.board[index] !== EMPTY) return;
		state.board[index] = GOAT;
		state.goatsPlaced += 1;
		endTurnAndCheckWin();
		return;
	}

	if (selectedNode === null) {
		if (state.board[index] !== GOAT) return;
		selectedNode = index;
		highlightedTargets = new Set(getGoatMoves(index, state.board).map(move => move.to));
		return;
	}

	if (selectedNode === index) {
		clearSelection();
		return;
	}

	const moves = getGoatMoves(selectedNode, state.board);
	const move = moves.find(candidate => candidate.to === index);
	if (!move) {
		if (state.board[index] === GOAT) {
			selectedNode = index;
			highlightedTargets = new Set(getGoatMoves(index, state.board).map(candidate => candidate.to));
		}
		return;
	}

	applyMove(state, move, 'goat');
	endTurnAndCheckWin();
	clearSelection();
}

function handleTigerTurn(index) {
	if (selectedNode === null) {
		if (state.board[index] !== TIGER) return;
		selectedNode = index;
		highlightedTargets = new Set(getTigerMoves(index, state.board).map(move => move.to));
		return;
	}

	if (selectedNode === index) {
		clearSelection();
		return;
	}

	const moves = getTigerMoves(selectedNode, state.board);
	const move = moves.find(candidate => candidate.to === index);
	if (!move) {
		if (state.board[index] === TIGER) {
			selectedNode = index;
			highlightedTargets = new Set(getTigerMoves(index, state.board).map(candidate => candidate.to));
		}
		return;
	}

	applyMove(state, move, 'tiger');
	endTurnAndCheckWin();
	clearSelection();
}

function clearSelection() {
	selectedNode = null;
	highlightedTargets.clear();
}

function endTurnAndCheckWin() {
	state.winner = checkWinner(state);
	if (!state.winner) {
		state.turn = state.turn === 'goat' ? 'tiger' : 'goat';
		state.winner = checkWinner(state);
	}
}

function maybeTakeComputerTurn() {
	if (!isComputerTurn() || state.winner) return;
	clearAiTurn();
	aiTimeout = setTimeout(() => {
		const aiSide = getComputerSide();
		const move = chooseComputerMove(state, aiSide, state.settings.difficulty);
		if (!move) {
			state.winner = aiSide === 'goat' ? 'tiger' : 'goat';
			render();
			return;
		}
		applyMove(state, move, aiSide);
		endTurnAndCheckWin();
		clearSelection();
		render();
		maybeTakeComputerTurn();
	}, 360);
}

function clearAiTurn() {
	if (aiTimeout) {
		clearTimeout(aiTimeout);
		aiTimeout = null;
	}
}

function isComputerTurn() {
	if (state.settings.opponent !== 'computer') return false;
	return state.turn === getComputerSide();
}

function getComputerSide() {
	return state.settings.side === 'goat' ? 'tiger' : 'goat';
}

function chooseComputerMove(currentState, side, difficulty) {
	if (difficulty === 'basic') {
		const legalMoves = generateAllMoves(currentState, side);
		return pickRandom(legalMoves);
	}

	if (difficulty === 'medium') {
		return chooseMediumMove(currentState, side);
	}

	return chooseHardMove(currentState, side);
}

function chooseMediumMove(currentState, side) {
	const moves = generateAllMoves(currentState, side);
	if (!moves.length) return null;

	if (side === 'tiger') {
		const captures = moves.filter(move => move.capture !== null);
		return captures.length ? pickRandom(captures) : pickRandom(moves);
	}

	const dangerSpots = getTigerCaptureLandingSpots(currentState.board);
	if (dangerSpots.length) {
		if (currentState.goatsPlaced < 20) {
			const blocker = moves.find(move => move.from === null && dangerSpots.includes(move.to));
			if (blocker) return blocker;
		} else {
			const blocker = moves.find(move => dangerSpots.includes(move.to));
			if (blocker) return blocker;
		}
	}

	return pickRandom(moves);
}

function chooseHardMove(currentState, aiSide) {
	const depth = chooseDepth(currentState);
	const { move } = minimaxRoot(currentState, aiSide, depth);
	return move;
}

function chooseDepth(currentState) {
	if (currentState.goatsPlaced < 8) return 2;
	if (currentState.goatsPlaced < 20) return 3;
	return 4;
}

function minimaxRoot(currentState, aiSide, depth) {
	const moves = generateAllMoves(currentState, aiSide);
	if (!moves.length) return { score: -99999, move: null };

	let bestScore = -Infinity;
	let bestMove = moves[0];
	let alpha = -Infinity;
	const beta = Infinity;

	const orderedMoves = orderMoves(moves, aiSide);
	for (const move of orderedMoves) {
		const nextState = cloneState(currentState);
		applyMove(nextState, move, aiSide);
		nextState.winner = checkWinner(nextState);
		if (!nextState.winner) nextState.turn = aiSide === 'goat' ? 'tiger' : 'goat';

		const score = minimax(nextState, aiSide, depth - 1, alpha, beta, false);
		if (score > bestScore) {
			bestScore = score;
			bestMove = move;
		}
		alpha = Math.max(alpha, bestScore);
	}

	return { score: bestScore, move: bestMove };
}

function minimax(currentState, aiSide, depth, alpha, beta, maximizing) {
	const winner = checkWinner(currentState);
	if (winner || depth === 0) {
		return evaluateBoard(currentState, aiSide, winner);
	}

	const sideToPlay = maximizing ? aiSide : aiSide === 'goat' ? 'tiger' : 'goat';
	const moves = generateAllMoves(currentState, sideToPlay);
	if (!moves.length) {
		return evaluateBoard(currentState, aiSide, sideToPlay === 'goat' ? 'tiger' : 'goat');
	}

	const orderedMoves = orderMoves(moves, sideToPlay).slice(0, 26);

	if (maximizing) {
		let value = -Infinity;
		for (const move of orderedMoves) {
			const nextState = cloneState(currentState);
			applyMove(nextState, move, sideToPlay);
			nextState.turn = sideToPlay === 'goat' ? 'tiger' : 'goat';
			value = Math.max(value, minimax(nextState, aiSide, depth - 1, alpha, beta, false));
			alpha = Math.max(alpha, value);
			if (alpha >= beta) break;
		}
		return value;
	}

	let value = Infinity;
	for (const move of orderedMoves) {
		const nextState = cloneState(currentState);
		applyMove(nextState, move, sideToPlay);
		nextState.turn = sideToPlay === 'goat' ? 'tiger' : 'goat';
		value = Math.min(value, minimax(nextState, aiSide, depth - 1, alpha, beta, true));
		beta = Math.min(beta, value);
		if (beta <= alpha) break;
	}
	return value;
}

function orderMoves(moves, side) {
	return [...moves].sort((a, b) => {
		const aCapture = a.capture !== null ? 1 : 0;
		const bCapture = b.capture !== null ? 1 : 0;
		if (aCapture !== bCapture) return bCapture - aCapture;
		if (side === 'goat') return a.from === null ? -1 : 1;
		return 0;
	});
}

function evaluateBoard(currentState, aiSide, winner) {
	if (winner === 'tiger') {
		return aiSide === 'tiger' ? 100000 : -100000;
	}
	if (winner === 'goat') {
		return aiSide === 'goat' ? 100000 : -100000;
	}

	const tigerMoves = generateAllMoves(currentState, 'tiger').length;
	const goatMoves = generateAllMoves(currentState, 'goat').length;
	const trapped = countTrappedTigers(currentState.board);

	const tigerScore =
		currentState.goatsCaptured * 140 +
		tigerMoves * 3 +
		trapped * -20 +
		(20 - currentState.goatsPlaced) * 2;

	const goatScore =
		trapped * 40 +
		goatMoves * 2 +
		(20 - currentState.goatsCaptured) * 2;

	const netScore = tigerScore - goatScore;
	return aiSide === 'tiger' ? netScore : -netScore;
}

function getTigerCaptureLandingSpots(board) {
	const spots = [];
	board.forEach((piece, index) => {
		if (piece !== TIGER) return;
		getTigerMoves(index, board)
			.filter(move => move.capture !== null)
			.forEach(move => {
				if (!spots.includes(move.to)) spots.push(move.to);
			});
	});
	return spots;
}

function generateAllMoves(currentState, side) {
	const moves = [];
	if (side === 'goat') {
		if (currentState.goatsPlaced < 20) {
			currentState.board.forEach((piece, index) => {
				if (piece === EMPTY) {
					moves.push({ from: null, to: index, capture: null });
				}
			});
			return moves;
		}

		currentState.board.forEach((piece, index) => {
			if (piece !== GOAT) return;
			moves.push(...getGoatMoves(index, currentState.board));
		});
		return moves;
	}

	currentState.board.forEach((piece, index) => {
		if (piece !== TIGER) return;
		moves.push(...getTigerMoves(index, currentState.board));
	});
	return moves;
}

function getGoatMoves(from, board) {
	return adjacency[from]
		.filter(to => board[to] === EMPTY)
		.map(to => ({ from, to, capture: null }));
}

function getTigerMoves(from, board) {
	const [row, col] = rc(from);
	const moves = [];

	adjacency[from].forEach(to => {
		if (board[to] === EMPTY) {
			moves.push({ from, to, capture: null });
		}
	});

	DIRECTIONS.forEach(([dr, dc]) => {
		const midRow = row + dr;
		const midCol = col + dc;
		const landRow = row + dr * 2;
		const landCol = col + dc * 2;

		if (!inBounds(midRow, midCol) || !inBounds(landRow, landCol)) return;

		const mid = idx(midRow, midCol);
		const land = idx(landRow, landCol);

		if (!adjacency[from].includes(mid)) return;
		if (!adjacency[mid].includes(land)) return;
		if (board[mid] !== GOAT || board[land] !== EMPTY) return;

		moves.push({ from, to: land, capture: mid });
	});

	return moves;
}

function applyMove(targetState, move, side) {
	if (side === 'goat' && move.from === null) {
		targetState.board[move.to] = GOAT;
		targetState.goatsPlaced += 1;
		return;
	}

	if (move.from !== null) {
		targetState.board[move.from] = EMPTY;
	}

	targetState.board[move.to] = side === 'goat' ? GOAT : TIGER;

	if (side === 'tiger' && move.capture !== null) {
		targetState.board[move.capture] = EMPTY;
		targetState.goatsCaptured += 1;
	}
}

function checkWinner(currentState) {
	if (currentState.goatsCaptured >= 5) return 'tiger';

	const allTigerMoves = generateAllMoves(currentState, 'tiger');
	if (allTigerMoves.length === 0) return 'goat';

	return null;
}

function countTrappedTigers(board) {
	let trapped = 0;
	board.forEach((piece, index) => {
		if (piece !== TIGER) return;
		if (getTigerMoves(index, board).length === 0) trapped += 1;
	});
	return trapped;
}

function buildAdjacency() {
	const map = Array.from({ length: NODES }, () => []);

	for (let row = 0; row < SIZE; row += 1) {
		for (let col = 0; col < SIZE; col += 1) {
			DIRECTIONS.forEach(([dr, dc]) => {
				const nr = row + dr;
				const nc = col + dc;
				if (!inBounds(nr, nc)) return;

				const orthogonal = Math.abs(dr) + Math.abs(dc) === 1;
				const diagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
				if (orthogonal || (diagonal && (row + col) % 2 === 0)) {
					map[idx(row, col)].push(idx(nr, nc));
				}
			});
		}
	}

	return map;
}

function buildEdges(map) {
	const all = [];
	map.forEach((neighbors, from) => {
		neighbors.forEach(to => {
			if (from < to) all.push([from, to]);
		});
	});
	return all;
}

function render() {
	const nodes = nodesContainer.querySelectorAll('.node');
	nodes.forEach(node => {
		const index = Number(node.dataset.index);
		const piece = state.board[index];
		node.className = 'node';

		if (piece === TIGER) {
			node.classList.add('tiger');
			node.textContent = '🐯';
		} else if (piece === GOAT) {
			node.classList.add('goat');
			node.textContent = '🐐';
		} else {
			node.classList.add('empty');
			node.textContent = '•';
		}

		if (selectedNode === index) {
			node.classList.add('selected');
		}

		if (highlightedTargets.has(index)) {
			node.classList.add('target');
		}
	});

	const phase = state.goatsPlaced < 20 ? 'Placement' : 'Movement';
	const baseStatus = `Turn: ${capitalize(state.turn)} (${phase} phase)`;

	if (state.winner) {
		statusText.textContent = `Winner: ${capitalize(state.winner)}.`;
	} else if (isComputerTurn()) {
		statusText.textContent = `${baseStatus} - Computer is thinking...`;
	} else {
		statusText.textContent = baseStatus;
	}

	goatsLeftText.textContent = `Goats left to place: ${Math.max(0, 20 - state.goatsPlaced)}`;
	capturedText.textContent = `Goats captured: ${state.goatsCaptured} / 5`;
}

function idx(row, col) {
	return row * SIZE + col;
}

function rc(index) {
	return [Math.floor(index / SIZE), index % SIZE];
}

function inBounds(row, col) {
	return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function cloneState(source) {
	return {
		board: [...source.board],
		turn: source.turn,
		goatsPlaced: source.goatsPlaced,
		goatsCaptured: source.goatsCaptured,
		winner: source.winner,
		settings: { ...source.settings }
	};
}

function pickRandom(list) {
	if (!list.length) return null;
	return list[Math.floor(Math.random() * list.length)];
}

function capitalize(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
