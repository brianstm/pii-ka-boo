"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FolderOpen, Save, RefreshCw } from "lucide-react";
import { fileStorageService } from "@/services/fileStorageService";

interface StorageSettingsProps {
  onClose: () => void;
}

export function StorageSettings({ onClose }: StorageSettingsProps) {
  const [storageDir, setStorageDir] = useState("uploads");
  const [isLoading, setIsLoading] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    setStorageDir(fileStorageService.getStorageDirectory());
    loadFileCount();
  }, []);

  const loadFileCount = async () => {
    try {
      const files = await fileStorageService.listFiles();
      setFileCount(files.length);
    } catch (error) {
      console.error("Error loading file count:", error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      fileStorageService.setStorageDirectory(storageDir);
      await loadFileCount();
      onClose();
    } catch (error) {
      console.error("Error saving storage directory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadFileCount();
    } catch (error) {
      console.error("Error refreshing file count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Storage Settings</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storage-dir">Storage Directory Name</Label>
        <Input
          id="storage-dir"
          value={storageDir}
          onChange={(e) => setStorageDir(e.target.value)}
          placeholder="Enter directory name"
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Files will be stored in: <code>scruby-ai-web/{storageDir}/</code>
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Stored files: {fileCount}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isLoading || !storageDir.trim()}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
