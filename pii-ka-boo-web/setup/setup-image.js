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

// Step 2: Get paths for venv executables
const venvPythonPath =
  process.platform === "win32"
    ? path.join(venvPath, "Scripts", "python.exe")
    : path.join(venvPath, "bin", "python");

const venvPipPath =
  process.platform === "win32"
    ? path.join(venvPath, "Scripts", "pip")
    : path.join(venvPath, "bin", "pip");

// Step 3: Upgrade pip inside venv
console.log("⬆️  Upgrading pip in virtual environment...");
spawnSync(venvPythonPath, ["-m", "pip", "install", "--upgrade", "pip"], {
  stdio: "inherit",
});

// Step 4: Install the required packages using venv pip
const packages = [
  "transformers==4.52.2",
  "torch==2.7.0",
  "opencv-python==4.12.0.88",
  "easyocr==1.7.2",
  "presidio-analyzer==2.2.359",
];

console.log(
  "📥 Installing packages in virtual environment:",
  packages.join(", ")
);

// Install each package using the venv python
packages.forEach((package) => {
  console.log(`Installing ${package}...`);
  const result = spawnSync(venvPythonPath, ["-m", "pip", "install", package], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`❌ Failed to install ${package}`);
    process.exit(1);
  }
});

console.log("✅ Image Python environment setup complete!");
console.log(`🐍 Virtual environment created at: ${venvPath}`);
console.log(`🐍 Python executable: ${venvPythonPath}`);
console.log(`📦 Pip executable: ${venvPipPath}`);
