import { put } from "@vercel/blob";
import { containers } from "@/lib/cosmosdb";
import { FileMetadata, FileMetadataSchema } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

export async function uploadFile(
  file: File,
  category: "document" | "ticket" | "picture" | "other",
  userId: string,
  relatedId?: string
): Promise<FileMetadata> {
  try {
    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Create metadata record in Cosmos DB
    const fileMetadata: FileMetadata = {
      id: uuidv4(),
      filename: file.name,
      blobUrl: blob.url,
      fileType: file.type,
      fileSize: file.size,
      category,
      relatedId,
      uploadedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await containers.files.items.create(fileMetadata);

    return fileMetadata;
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error("Failed to upload file");
  }
}

export async function getFilesByCategory(
  category: "document" | "ticket" | "picture" | "other"
): Promise<FileMetadata[]> {
  try {
    const query = `SELECT * FROM c WHERE c.category = @category`;
    const { resources } = await containers.files.items
      .query(query, { parameters: [{ name: "@category", value: category }] })
      .fetchAll();

    return resources.map((r) => FileMetadataSchema.parse(r));
  } catch (error) {
    console.error("Error fetching files:", error);
    return [];
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await containers.files.item(fileId).delete();
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}
