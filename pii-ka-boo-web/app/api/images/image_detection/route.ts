import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs"; // must use node runtime

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = body.input ?? "";
    const output = body.output ?? "";
    const config = body.config ?? "config.json"; // Default config if not provided

    // Validate input and output paths
    if (!input || !output) {
      return NextResponse.json(
        { error: "Input and output paths must be provided" },
        { status: 400 }
      );
    }

    // Run Python script with updated arguments
    const result = await runPython(input, output, config);
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
    return path.join(
      "app",
      "api",
      "images",
      "image_detection",
      ".venv",
      "Scripts",
      "python.exe"
    ); // Windows
  } else {
    return path.join(
      "app",
      "api",
      "images",
      "image_detection",
      ".venv",
      "bin",
      "python"
    ); // Mac/Linux
  }
}

// helper to run python
// helper to run python
function runPython(
  input: string,
  output: string,
  config: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Prepare arguments for the Python script
    const args = [
      "./app/api/images/image_detection/src/main.py",
      "--input",
      input, // input path
      "--output",
      output, // output path
      "--config",
      config, // config file
    ];

    const process = spawn(pythonExe(), args);

    let outputData = "";
    let errorData = "";

    process.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorData}`));
      } else {
        // The Python script will print "Success" upon completion
        console.log("Final OUTPUT DATA:", outputData);
        if (outputData.includes("Success")) {
          resolve({ message: "Success" });
        } else {
          reject(new Error("Python script did not return 'Success'"));
        }
      }
    });

    // Handle process errors
    process.on("error", (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}
