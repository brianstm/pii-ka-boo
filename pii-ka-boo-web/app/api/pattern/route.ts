import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      pattern_sequence,
      replace_by = "[BLURRED]",
    } = await request.json();

    if (!text || !pattern_sequence) {
      return NextResponse.json(
        { error: "Missing required fields: text and pattern_sequence" },
        { status: 400 }
      );
    }

    const pythonScriptPath = join(
      process.cwd(),
      "app",
      "api",
      "pattern",
      "code.py"
    );

    return new Promise((resolve) => {
      const pythonProcess = spawn("python3", [pythonScriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let result = "";
      let error = "";

      pythonProcess.stdout.on("data", (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        error += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("Python script error:", error);
          resolve(
            NextResponse.json(
              { error: "Pattern processing failed" },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const lines = result.trim().split("\n");
          const processedText = lines[lines.length - 1];

          resolve(
            NextResponse.json({
              success: true,
              original: text,
              processed: processedText,
              pattern_sequence,
            })
          );
        } catch (parseError) {
          console.error("Error parsing Python output:", parseError);
          resolve(
            NextResponse.json(
              { error: "Failed to parse pattern processing result" },
              { status: 500 }
            )
          );
        }
      });

      const input = JSON.stringify({
        text,
        pattern_sequence,
        replace_by,
      });
      pythonProcess.stdin.write(input + "\n");
      pythonProcess.stdin.end();
    });
  } catch (error) {
    console.error("Pattern API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
