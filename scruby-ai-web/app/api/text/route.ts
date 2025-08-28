import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs"; // must use node runtime

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message ?? "";
    const labels = body.labels; // Optional array of labels to redact

    console.log("Received message:", message);
    console.log("Labels to redact:", labels);

    const result = await runPython(message, labels);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Pick correct Python executable depending on OS
function pythonExe() {
  if (process.platform === "win32") {
    return path.join("app", "api", "text", ".venv", "Scripts", "python.exe"); // Windows
  } else {
    return path.join("app", "api", "text", ".venv", "bin", "python"); // Mac/Linux
  }
}

// helper to run python
function runPython(message: string, labels?: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // Prepare arguments for Python script
    const args = ["./app/api/text/script.py", message];

    // Add labels as a JSON string if provided
    if (labels && labels.length > 0) {
      args.push(JSON.stringify(labels));
    }

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
