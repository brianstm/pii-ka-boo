// setup-python.js
const { spawnSync } = require("child_process");
const path = require("path");

const venvPath = path.join(__dirname, "..", "app", "api", "text", ".venv");

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

// Step 4: Install required packages
const packages = [
  "torch==2.3.1",
  "transformers>=4.38",
  "tokenizers>=0.15.2",
  "huggingface-hub>=0.23",
  "safetensors>=0.4.2",
];

console.log("📥 Installing packages:", packages.join(", "));

spawnSync(
  pipPath,
  [
    "install",
    "torch==2.3.1",
    "--index-url",
    "https://download.pytorch.org/whl/cpu",
    "--extra-index-url",
    "https://pypi.org/simple",
    "transformers>=4.38",
    "tokenizers>=0.15.2",
    "huggingface-hub>=0.23",
    "safetensors>=0.4.2",
  ],
  { stdio: "inherit" }
);

console.log("✅ Python environment setup complete!");
