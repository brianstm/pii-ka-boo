const { spawnSync } = require("child_process");
const path = require("path");

// Path to new image venv
const venvPath = path.join(
  __dirname,
  "..",
  "app",
  "api",
  "images",
  "image_detection",
  ".venv"
);

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
spawnSync(pythonCmd, ["-m", "pip", "install", "--upgrade", "pip"], {
  stdio: "inherit",
});

// Step 4: Install the required packages using `python -m pip install`
const packages = [
  "transformers==4.52.2",
  "torch==2.7.0",
  "opencv-python==4.12.0.88",
  "easyocr==1.7.2",
  "presidio-analyzer==2.2.359",
];
console.log("📥 Installing packages:", packages.join(", "));

// Install each package using python -m pip
packages.forEach((package) => {
  spawnSync(pythonCmd, ["-m", "pip", "install", package], { stdio: "inherit" });
});

console.log("✅ Image Python environment setup complete!");
