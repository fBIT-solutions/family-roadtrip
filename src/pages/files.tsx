import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { FileMetadata } from "@/types/schema";

export default function Files() {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<"picture" | "video" | "document" | "ticket" | "reservation" | "other">(
    "picture"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFiles();
    }
  }, [status]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get("/api/files?category=picture");
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    try {
      for (const file of selectedFiles) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileData = (event.target?.result as string).split(",")[1];
          await axios.post("/api/files", {
            filename: file.name,
            fileData,
            fileType: file.type,
            category,
          });
          fetchFiles();
        };
        reader.readAsDataURL(file);
      }
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/files/${id}`);
      setFiles(files.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In to Access Files
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">📁 Files & Media</h1>

        {/* Upload Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upload Files</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Select Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="picture">Picture</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="ticket">Ticket</option>
                <option value="reservation">Reservation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <p className="text-gray-600">Drag files here or click to select</p>
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
              </label>
            </div>
            <button
              type="submit"
              disabled={selectedFiles.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Files
            </button>
          </form>
        </div>

        {/* Files Grid */}
        {loading ? (
          <p className="text-center text-gray-600">Loading files...</p>
        ) : (
          <div>
            {files.length === 0 ? (
              <p className="text-center text-gray-600">No files yet. Upload some memories!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition"
                  >
                    {file.fileType.startsWith("image/") ? (
                      <img
                        src={file.blobUrl}
                        alt={file.filename}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <span className="text-gray-500">📄</span>
                      </div>
                    )}
                    <h3 className="font-bold text-gray-800 truncate">{file.filename}</h3>
                    <p className="text-sm text-gray-500">
                      {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {file.category}
                    </span>
                    <div className="flex gap-2 mt-4">
                      <a
                        href={file.blobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 text-center"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
