import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storageDir = searchParams.get("storageDir") || "uploads";

    const projectRoot = process.cwd();
    const storagePath = join(projectRoot, storageDir);

    if (!existsSync(storagePath)) {
      return NextResponse.json([]);
    }

    const files: {
      filename: string;
      filepath: string;
      type: string;
      size: number;
      createdAt: Date;
      modifiedAt: Date;
    }[] = [];

    const types = ["audio", "image"];

    for (const type of types) {
      const typePath = join(storagePath, type);

      if (existsSync(typePath)) {
        const typeFiles = await readdir(typePath);

        for (const filename of typeFiles) {
          const filepath = join(typePath, filename);
          const fileStats = await stat(filepath);

          files.push({
            filename,
            filepath: filepath.replace(projectRoot, ""),
            type,
            size: fileStats.size,
            createdAt: fileStats.birthtime,
            modifiedAt: fileStats.mtime,
          });
        }
      }
    }

    files.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
