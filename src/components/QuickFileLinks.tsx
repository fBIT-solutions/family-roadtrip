import React from "react";
import { FileMetadata } from "@/types/schema";

interface QuickFileLinksProps {
  files: FileMetadata[];
  maxDisplay?: number;
}

export function QuickFileLinks({ files, maxDisplay = 3 }: QuickFileLinksProps) {
  // Filter for tickets and reservations only
  const ticketFiles = files.filter(
    (file) => file.category === "ticket" || file.category === "reservation" || file.category === "other"
  );

  if (ticketFiles.length === 0) {
    return null;
  }

  const displayFiles = ticketFiles.slice(0, maxDisplay);
  const hasMore = ticketFiles.length > maxDisplay;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-semibold text-gray-600 mb-2">📋 Tickets/Files:</p>
      <div className="flex flex-wrap gap-2">
        {displayFiles.map((file) => (
          <a
            key={file.id}
            href={file.blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 hover:bg-yellow-100 transition"
            title={file.filename}
          >
            <span>🎫</span>
            <span className="truncate max-w-[80px]">{file.filename}</span>
          </a>
        ))}
        {hasMore && (
          <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500">
            +{ticketFiles.length - maxDisplay} more
          </span>
        )}
      </div>
    </div>
  );
}
