import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Pattern API received body:", JSON.stringify(body, null, 2));

    const { text, pattern_sequence, replace_by = "[BLURRED]" } = body;

    if (!text || !pattern_sequence) {
      console.log("Pattern API missing required fields");
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

    return new Promise<NextResponse>((resolve) => {
      const pythonProcess = spawn("python", [pythonScriptPath], {
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
          // The Python script outputs the processed text directly
          // We need to handle both error cases (JSON) and success cases (plain text)
          const trimmedResult = result.trim();
          
          // First, try to parse as JSON (for error cases)
          try {
            const jsonResponse = JSON.parse(trimmedResult);
            if (jsonResponse.error) {
              resolve(
                NextResponse.json(
                  { error: jsonResponse.error },
                  { status: 400 }
                )
              );
              return;
            }
          } catch (jsonError) {
            // Not JSON, so it's the processed text
            console.log("Python output is not JSON, treating as processed text");
          }

          // If we get here, the output is the processed text
          const processedText = trimmedResult;

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
