import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs"; // must use node runtime

export async function POST(req: NextRequest) {
  // parse JSON body
  const body = await req.json();
  const message = body.message ?? "world";

  const result = await runPython(message);
  return NextResponse.json(result);
}
// helper to run python
function runPython(name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn("./app/api/text/.venv/Scripts/python.exe", [
      "./app/api/text/script.py",
      name,
    ]);

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
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error(`Invalid JSON from Python: ${output}`));
        }
      }
    });
  });
}
