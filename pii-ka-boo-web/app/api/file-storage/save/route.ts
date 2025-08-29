import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const filename = formData.get("filename") as string;
    const type = formData.get("type") as string;
    const storageDir = formData.get("storageDir") as string;

    if (!file || !filename || !type || !storageDir) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const projectRoot = process.cwd();
    const storagePath = join(projectRoot, storageDir);

    if (!existsSync(storagePath)) {
      await mkdir(storagePath, { recursive: true });
    }

    const typePath = join(storagePath, type);
    if (!existsSync(typePath)) {
      await mkdir(typePath, { recursive: true });
    }

    const filepath = join(typePath, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      filepath: filepath.replace(projectRoot, ""),
      type,
      size: buffer.length,
    });
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
