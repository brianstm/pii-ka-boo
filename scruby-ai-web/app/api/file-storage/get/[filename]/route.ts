import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "audio";
    const storageDir = searchParams.get("storageDir") || "uploads";

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    const projectRoot = process.cwd();
    const filepath = join(projectRoot, storageDir, type, filename);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = await readFile(filepath);
    const fileStats = await stat(filepath);

    const extension = filename.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";

    if (type === "audio") {
      switch (extension) {
        case "wav":
          contentType = "audio/wav";
          break;
        case "mp3":
          contentType = "audio/mpeg";
          break;
        case "ogg":
          contentType = "audio/ogg";
          break;
        default:
          contentType = "audio/wav";
      }
    } else if (type === "image") {
      switch (extension) {
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        case "gif":
          contentType = "image/gif";
          break;
        case "webp":
          contentType = "image/webp";
          break;
        default:
          contentType = "image/jpeg";
      }
    }

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
