// setup-audio-python.js
const { spawnSync } = require("child_process");
const path = require("path");

// Path to new audio venv
const venvPath = path.join(__dirname, "..", "app", "api", "audio", ".venv");

// Pick correct python command
const pythonCmd = process.platform === "win32" ? "python" : "python3";

// Step 1: Create venv
console.log("📦 Creating virtual environment at", venvPath);
spawnSync(pythonCmd, ["-m", "venv", venvPath], { stdio: "inherit" });

// Step 2: Pick pip inside venv
const pipPath =
  process.platform === "win32"
    ? path.join(venvPath, "Scripts", "pip.exe")
    : path.join(venvPath, "bin", "pip");

// Step 3: Upgrade pip
console.log("⬆️  Upgrading pip...");
spawnSync(pipPath, ["install", "--upgrade", "pip"], { stdio: "inherit" });

// Step 4: Install faster-whisper and ffmpeg-python
const packages = ["faster-whisper", "ffmpeg-python"];
console.log("📥 Installing packages:", packages.join(", "));

spawnSync(pipPath, ["install", ...packages], { stdio: "inherit" });

console.log("✅ Audio Python environment setup complete!");
