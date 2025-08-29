import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs"; // must use node runtime

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audioFile = body.message ?? "";
    console.log("Received audio file:", audioFile);

    const result = await runPython(audioFile);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function pythonExe() {
  if (process.platform === "win32") {
    return path.join("app", "api", "audio", ".venv", "Scripts", "python.exe"); // Windows
  } else {
    return path.join("app", "api", "audio", ".venv", "bin", "python"); // Mac/Linux
  }
}

// helper to run python
function runPython(message: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Prepare arguments for Python script
    const args = ["./app/api/audio/transcribe.py", message];
    const process = spawn(pythonExe(), args);

    let output = "";
    let error = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      error += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${error}`));
      } else {
        try {
          // Handle multiple lines of output and parse the last JSON response
          const lines = output.trim().split("\n");
          const lastLine = lines[lines.length - 1];
          resolve(JSON.parse(lastLine));
        } catch (e) {
          console.error("Raw Python output:", output);
          reject(new Error(`Invalid JSON from Python: ${output}`));
        }
      }
    });

    // Handle process errors
    process.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}
