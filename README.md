# Arena Brawler 🎮

A fast-paced local multiplayer brawler game where players compete to knock each other out of the arena!

## 🚀 Running Locally

This is a static HTML/JS project. To run it locally, use any simple HTTP server:

### Using Python
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

### Using Node.js
```bash
# Install serve globally (once)
npm install -g serve

# Run the server
serve .
```

### Using VS Code
Install the "Live Server" extension and click "Go Live" in the status bar.

Then open your browser to `http://localhost:8080` (or the port shown).

## 🎮 Controls

### Player 1 (Red)
- **Move:** `W` `A` `S` `D`
- **Dash:** `Shift`

### Player 2 (Cyan)
- **Move:** `↑` `←` `↓` `→` (Arrow Keys)
- **Dash:** `Ctrl`

### Player 3 (Yellow)
- **Move:** `I` `J` `K` `L`
- **Dash:** `H`

### Player 4 (Green)
- **Gamepad Only**
- **Move:** Left Stick
- **Dash:** `B` / `◯`

### Gamepad Support
All players can use gamepads:
- **Move:** Left Stick
- **Dash:** `B` (Xbox) / `◯` (PlayStation)
- **Start Game:** `A` (Xbox) / `✕` (PlayStation)

## 🏆 Win Condition

- Knock other players out of the arena by pushing them off the edge
- Use your **dash** ability to deliver powerful hits
- The last player remaining in the arena wins the round
- Win the most rounds to become the champion!

## 🌐 Deployment

This project is configured for static deployment on Vercel. Simply connect your repository to Vercel and deploy!
