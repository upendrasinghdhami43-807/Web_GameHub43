const EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };
const OPTIONS = ['rock', 'paper', 'scissors'];

const modeSelect = document.getElementById('mode-select');
const computerMode = document.getElementById('computer-mode');
const humanMode = document.getElementById('human-mode');

let computerScore = { wins: 0, losses: 0, draws: 0 };
let humanPicks = { A: null, B: null };

document.querySelectorAll('.mode-card').forEach(button => {
	button.addEventListener('click', () => selectMode(button.dataset.mode));
});

document.getElementById('from-computer').addEventListener('click', backToModeSelect);
document.getElementById('from-human').addEventListener('click', () => {
	resetHuman();
	backToModeSelect();
});
document.getElementById('play-again').addEventListener('click', resetHuman);

document.querySelectorAll('#computer-choices .choice-btn').forEach(button => {
	button.addEventListener('click', () => playComputer(button.dataset.choice));
});

document.querySelectorAll('#human-mode .choice-btn[data-player]').forEach(button => {
	button.addEventListener('click', () => humanPick(button.dataset.player, button.dataset.choice));
});

function selectMode(mode) {
	modeSelect.classList.add('hidden');
	if (mode === 'computer') {
		computerMode.classList.remove('hidden');
		humanMode.classList.add('hidden');
		return;
	}
	humanMode.classList.remove('hidden');
	computerMode.classList.add('hidden');
	resetHuman();
}

function backToModeSelect() {
	modeSelect.classList.remove('hidden');
	computerMode.classList.add('hidden');
	humanMode.classList.add('hidden');
}

function getWinner(a, b) {
	if (a === b) return 'draw';
	if (
		(a === 'rock' && b === 'scissors') ||
		(a === 'paper' && b === 'rock') ||
		(a === 'scissors' && b === 'paper')
	) {
		return 'a';
	}
	return 'b';
}

function playComputer(playerChoice) {
	const computerChoice = OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
	const result = getWinner(playerChoice, computerChoice);

	document.getElementById('c-you-pick').textContent = EMOJI[playerChoice];
	document.getElementById('c-comp-pick').textContent = EMOJI[computerChoice];

	const resultBox = document.getElementById('c-result');
	const resultText = document.getElementById('c-result-text');
	resultBox.className = 'result-box';

	if (result === 'draw') {
		computerScore.draws += 1;
		resultBox.classList.add('draw');
		resultText.textContent = `Draw: both picked ${capitalize(playerChoice)}.`;
	} else if (result === 'a') {
		computerScore.wins += 1;
		resultBox.classList.add('win');
		resultText.textContent = `You win: ${capitalize(playerChoice)} beats ${capitalize(computerChoice)}.`;
	} else {
		computerScore.losses += 1;
		resultBox.classList.add('lose');
		resultText.textContent = `Computer wins: ${capitalize(computerChoice)} beats ${capitalize(playerChoice)}.`;
	}

	document.getElementById('c-wins').textContent = computerScore.wins;
	document.getElementById('c-losses').textContent = computerScore.losses;
	document.getElementById('c-draws').textContent = computerScore.draws;
}

function humanPick(player, choice) {
	if (humanPicks[player]) return;
	humanPicks[player] = choice;

	const status = document.getElementById(`status-${player.toLowerCase()}`);
	const side = document.getElementById(`side-${player.toLowerCase()}`);
	status.textContent = 'Ready';
	side.classList.add('locked');

	if (humanPicks.A && humanPicks.B) {
		showHumanResult();
	}
}

function showHumanResult() {
	const winner = getWinner(humanPicks.A, humanPicks.B);
	document.getElementById('h-a-pick').textContent = EMOJI[humanPicks.A];
	document.getElementById('h-b-pick').textContent = EMOJI[humanPicks.B];

	const resultBox = document.getElementById('h-result');
	const resultText = document.getElementById('h-result-text');
	resultBox.className = 'result-box';

	if (winner === 'draw') {
		resultBox.classList.add('draw');
		resultText.textContent = `Draw: both picked ${capitalize(humanPicks.A)}.`;
	} else if (winner === 'a') {
		resultBox.classList.add('win');
		resultText.textContent = `Group A wins: ${capitalize(humanPicks.A)} beats ${capitalize(humanPicks.B)}.`;
	} else {
		resultBox.classList.add('win');
		resultText.textContent = `Group B wins: ${capitalize(humanPicks.B)} beats ${capitalize(humanPicks.A)}.`;
	}

	document.getElementById('human-pick-phase').classList.add('hidden');
}

function resetHuman() {
	humanPicks = { A: null, B: null };

	['a', 'b'].forEach(id => {
		document.getElementById(`status-${id}`).textContent = 'Waiting for pick...';
		document.getElementById(`side-${id}`).classList.remove('locked');
	});

	document.getElementById('human-pick-phase').classList.remove('hidden');
	document.getElementById('h-result').className = 'result-box hidden';
}

function capitalize(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
