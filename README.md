# Web Game Hub

A modular, web-based gaming hub that brings together classic parlor games and traditional strategy board games into a single, cohesive interface. 

## 🎮 Included Games

1. **Rock Paper Scissors:** A quick game of chance and psychology.
2. **Tic-Tac-Toe:** The classic 3x3 grid strategy game.
3. **Tiger Goat (Bagh Chal):** A traditional asymmetric strategy game originating from the Himalayas. Play as 4 Tigers trying to capture goats, or 20 Goats trying to trap the tigers. Features both Human vs. Human and Human vs. Computer modes.

## 🏗️ Project Architecture

This project is built using vanilla HTML, CSS, and JavaScript. It demonstrates the software engineering principle of "Separation of Concerns." 

Instead of a single massive codebase, the project is divided into isolated modules. The main hub simply handles navigation and layout, while each game manages its own isolated logic, styling, and DOM structure.

```text
GAME_HUB43/
├── original main/
│   ├── index.html       # The main hub directory page
│   ├── script.js        # Hub-specific interactions (if any)
│   └── style.css        # Hub layout and scrollable UI styling
├── rockpaper/
│   ├── rockpaper.html   
│   ├── rockpaper.css
│   └── rokepaper.js     # Isolated Rock-Paper-Scissors logic
├── tictoegem/
│   ├── tictactoe.html
│   ├── tictactoe.css
│   └── tictactoe.js     # Isolated Tic-Tac-Toe logic
├── tigergoat/
│   ├── tiger.html
│   ├── tiger.css
│   └── tiger.js         # Bagh Chal logic and AI algorithms
├── README.md            # Project documentation
└── LICENSE              # MIT License