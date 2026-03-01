import React, { useState, useRef } from "react";
import { FileMetadata } from "@/types/schema";

interface MediaGalleryProps {
  files: FileMetadata[];
  onDelete?: (fileId: string) => void;
  isLoading?: boolean;
  onUploadClick?: () => void;
}

// Helper to extract first frame from video and return as image blob
async function extractVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    
    // Set a timeout to prevent hanging if video never loads
    const timeoutId = setTimeout(() => {
      reject(new Error("Video loading timed out"));
    }, 5000);
    
    const cleanup = () => clearTimeout(timeoutId);
    
    video.onloadedmetadata = () => {
      try {
        video.currentTime = Math.min(1, video.duration * 0.1); // Get early frame
      } catch (err) {
        cleanup();
        reject(new Error("Could not seek video"));
      }
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          cleanup();
          resolve(canvas.toDataURL("image/jpeg"));
        } else {
          cleanup();
          reject(new Error("Could not get canvas context"));
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    
    video.onerror = () => {
      cleanup();
      const errorMsg = video.error?.message || "unknown error";
      reject(new Error(`Could not load video: ${errorMsg}`));
    };
  });
}

export function MediaGallery({ files, onDelete, isLoading, onUploadClick }: MediaGalleryProps) {
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  
  // Filter for picture and video files by category
  const mediaFiles = files.filter(
    (file) => file.category === "picture" || file.category === "video"
  );

  // Extract thumbnails for videos on mount
  React.useEffect(() => {
    mediaFiles.forEach((file) => {
      if (file.category === "video" && !videoThumbnails[file.id]) {
        extractVideoThumbnail(file.blobUrl)
          .then((thumbnail) => {
            setVideoThumbnails((prev) => ({ ...prev, [file.id]: thumbnail }));
          })
          .catch((err) => {
            console.error(`Failed to extract thumbnail for ${file.filename}:`, err);
          });
      }
    });
  }, [mediaFiles]);

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-4">📸</div>
        <p className="text-gray-600 mb-4">No photos or videos yet</p>
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload Media
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaFiles.map((file) => (
          <div key={file.id} className="relative group">
            {file.category === "picture" ? (
              <img
                src={file.blobUrl}
                alt={file.filename}
                className="w-full h-48 object-cover rounded border border-gray-200 group-hover:opacity-80 transition"
              />
            ) : file.category === "video" && videoThumbnails[file.id] ? (
              <>
                <img
                  src={videoThumbnails[file.id]}
                  alt={file.filename}
                  className="w-full h-48 object-cover rounded border border-gray-200 group-hover:opacity-80 transition"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded">
                  <div className="text-white text-4xl opacity-80 group-hover:opacity-100 transition">
                    ▶
                  </div>
                </div>
              </>
            ) : file.category === "video" ? (
              <div className="w-full h-48 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                <div className="text-gray-400 text-4xl">🎬</div>
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-200 rounded border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-xs text-gray-600">File</p>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
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

            <p className="text-xs text-gray-600 mt-2 truncate">{file.filename}</p>
          </div>
        ))}
      </div>

      {onUploadClick && (
        <div className="mt-6">
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add More Photos/Videos
          </button>
        </div>
      )}
    </div>
  );
}
