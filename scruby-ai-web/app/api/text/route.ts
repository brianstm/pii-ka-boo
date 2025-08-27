import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs"; // must use node runtime

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body.message ?? "world";

  const result = await runPython(message);
  return NextResponse.json(result);
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
function runPython(name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn(pythonExe(), ["./app/api/text/script.py", name]);

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
          resolve(JSON.parse(output.trim().split("\n").pop()!));
        } catch (e) {
          reject(new Error(`Invalid JSON from Python: ${output}`));
        }
      }
    });
  });
}
