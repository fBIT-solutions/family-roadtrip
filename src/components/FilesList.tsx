import React from "react";
import { FileMetadata } from "@/types/schema";

interface FilesListProps {
  files: FileMetadata[];
  onDelete?: (fileId: string) => void;
  isLoading?: boolean;
}

export function FilesList({ files, onDelete, isLoading }: FilesListProps) {
  // Filter out images and videos
  const nonMediaFiles = files.filter(
    (file) => !file.fileType.startsWith("image/") && !file.fileType.startsWith("video/")
  );

  if (nonMediaFiles.length === 0) {
    return (
      <div className="text-sm text-gray-600 italic">
        No documents uploaded yet
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ticket":
        return "🎫";
      case "document":
        return "📄";
      case "picture":
        return "🖼️";
      case "other":
        return "📎";
      default:
        return "📄";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-2">
      {nonMediaFiles.map((file) => (
        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl">{getCategoryIcon(file.category)}</span>
            <div className="flex-1 min-w-0">
              <a
                href={file.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium truncate block"
              >
                {file.filename}
              </a>
              <div className="text-xs text-gray-500">
                {file.category.charAt(0).toUpperCase() + file.category.slice(1)} • {formatFileSize(file.fileSize)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-2">
            <a
              href={file.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              View
            </a>
            {onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
