import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

function getMimeType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, imageName } = await req.json();
    const apiKey = process.env.NEXT_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing NEXT_GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: message + " ignore any [BLURRED] text" }];

    if (imageName && typeof imageName === "string") {
      try {
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "images",
          imageName
        );

        const imageBuffer = await fs.readFile(filePath);

        const base64Image = imageBuffer.toString("base64");

        parts.push({
          inlineData: {
            mimeType: getMimeType(imageName),
            data: base64Image,
          },
        });
      } catch (fileError) {
        console.error("Error reading image file:", fileError);
        return NextResponse.json(
          { error: `File not found or could not be read: ${imageName}` },
          { status: 400 }
        );
      }
    }

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: parts }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini API call failed:", err);
      return NextResponse.json(
        { error: "Gemini call failed", details: err },
        { status: 500 }
      );
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ response: text });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("API Route Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
