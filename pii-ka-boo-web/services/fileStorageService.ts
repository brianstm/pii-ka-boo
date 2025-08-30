export interface StoredFile {
  filename: string;
  filepath: string;
  type: "audio" | "image";
  originalName: string;
  timestamp: Date;
}

class FileStorageService {
  private storageDir: string = "uploads";

  constructor() {
    this.ensureStorageDirectory();
  }

  setStorageDirectory(dirName: string) {
    this.storageDir = dirName;
    this.ensureStorageDirectory();
  }

  getStorageDirectory(): string {
    return this.storageDir;
  }

  private ensureStorageDirectory() {
    console.log(`Storage directory: ${this.storageDir}`);
  }

  private generateFilename(
    originalName: string,
    type: "audio" | "image"
  ): string {
    const isGenericName = /^(recording|audio|image|file|upload)\.[a-z]+$/i.test(
      originalName
    );

    if (isGenericName) {
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .replace("Z", "");

      const extension =
        originalName.split(".").pop() || (type === "audio" ? "wav" : "jpg");
      return `${timestamp}.${extension}`;
    }

    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .replace("Z", "");

    const nameWithoutExt = originalName.split(".").slice(0, -1).join(".");
    const extension =
      originalName.split(".").pop() || (type === "audio" ? "wav" : "jpg");

    return `${nameWithoutExt}_${timestamp}.${extension}`;
  }

  async saveFile(file: File, type: "audio" | "image"): Promise<StoredFile> {
    const filename = this.generateFilename(file.name, type);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filename", filename);
    formData.append("type", type);
    formData.append("storageDir", this.storageDir);

    const response = await fetch("/api/file-storage/save", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to save file: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      filename: result.filename,
      filepath: result.filepath,
      type: type,
      originalName: file.name,
      timestamp: new Date(),
    };
  }

  getFileUrl(filename: string): string {
    return `/api/file-storage/get/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const response = await fetch(`/api/file-storage/delete/${filename}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  async listFiles(): Promise<StoredFile[]> {
    const response = await fetch("/api/file-storage/list");

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const fileStorageService = new FileStorageService();
