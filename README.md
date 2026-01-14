# Ghost Writer (Dead Internet Protocol)

**Ghost Writer** is a multiplayer, browser-based social deduction game where players answer prompts and try to fool others into thinking they are AI (or thinking the AI is human).

![Screenshot](https://via.placeholder.com/800x450?text=Ghost+Writer+Gameplay)

## 🚀 Tech Stack

- **Framework:** Vue 3 (Composition API)
- **Styling:** Tailwind CSS (Theme Engine)
- **Networking:** PeerJS (Serverless P2P WebRTC)
- **Build Tool:** Vite
- **AI Integration:** Google Gemini (Free) / OpenAI / Custom
- **Documentation:** See `docs/` folder for Architecture and Design specs.

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone <repository-url>
cd ghost-writer
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Linting & Testing
```bash
# Run Linter
npm run lint

# Run Tests
npx vitest run tests
```

## 📦 Deployment

The project is optimized for **Netlify**.

1. Connect your repo to Netlify.
2. Set Build Command: `npm run build`
3. Set Publish Directory: `dist`
4. (Optional) Set Environment Variables for AI Proxies if using the official server mode.

## ✨ Key Features

- **Multiplayer:** Real-time P2P connection via `peerjs`.
- **No-Backend:** The **Host** acts as the game server.
- **Theme Engine:** Switch between "Viral", "Classic", "Academia", and "Cyberpunk" aesthetics.
- **AI Personas:** 5 distinct AI personalities per theme + Custom Agent Creator.
- **Responsive:** Mobile-first design for playing on phones while the game is hosted on a desktop.
