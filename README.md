# 🚀 Space Typing Wars

A 3D typing game built with **Three.js** + **Vite**. Master the keyboard to conquer the galaxy.

## Modes

| Mode | Description |
|------|-------------|
| **Typing Race** | Race your ship against a CPU opponent. Your WPM directly maps to ship speed. Type 30 words to finish the track. |
| **Battle Mode** | Z-Type style 3D battle. Enemies fly toward you — type their word to destroy them before they reach your ship. |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
# Clone or copy the project
cd space-typing-wars

# Install dependencies
npm install

# Start dev server (opens at http://localhost:5173)
npm run dev
```

### Build for Production

```bash
npm run build
# Output → ./dist/
```

### Preview Production Build

```bash
npm run preview
```

---

## Deploy

### Vercel

```bash
npm install -g vercel
vercel --prod
```

Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).  
No extra config needed — Vite's `base: './'` handles asset paths.

### Netlify

```bash
npm run build
# Drag & drop the ./dist folder at app.netlify.com/drop
```

Or connect your repo and set:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

---

## Architecture

```
src/
├── main.js                  # Entry point
├── styles.css               # All UI styles
├── core/
│   ├── Game.js              # State machine, main controller
│   └── Loop.js              # requestAnimationFrame loop
├── rendering/
│   ├── Renderer.js          # Three.js WebGLRenderer wrapper
│   └── SceneManager.js      # Scene, camera, starfield, FX
├── entities/
│   ├── Player.js            # Player ship mesh + movement
│   └── Enemy.js             # Enemy ship mesh + word state
├── systems/
│   ├── TypingSystem.js      # Input handling, WPM, word matching
│   ├── SpawnSystem.js       # Enemy wave spawning
│   └── words.js             # Word bank (race + battle)
└── ui/
    └── HUD.js               # HTML overlay HUD
```

## Controls

- **Type** words shown on screen
- **Space** confirms a word in Race mode
- **Escape** clears current target in Battle mode
- No mouse required

---

## Tech Stack

- [Three.js](https://threejs.org/) r165 — 3D rendering
- [Vite](https://vitejs.dev/) 5 — Dev server & bundler
- Vanilla JavaScript (ES Modules)
- Pure HTML/CSS overlay UI
