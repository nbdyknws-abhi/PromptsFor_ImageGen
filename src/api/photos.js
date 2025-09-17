// src/api/photos.js
import {
  storage,
  databases,
  ID_HELPER, // or just import { ID } directly from "appwrite"
  APPWRITE_ENDPOINT,
  BUCKET_ID,
  DATABASE_ID,
  COLLECTION_ID,
} from "../appwrite";
import { Query } from "appwrite";

// Upload a photo + prompt
export async function uploadPhoto(file, prompt, ownerId = null) {
  if (!file) throw new Error("No file selected");
  if (!file.type.startsWith("image/"))
    throw new Error("Only image files allowed");

  // 1. Upload file to storage
  const fileRes = await storage.createFile(BUCKET_ID, ID_HELPER.unique(), file);

  // Clean whitespace
  const cleanedPrompt = prompt.replace(/\s+/g, " ").trim();

  // 2. Save metadata in DB
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTION_ID,
    ID_HELPER.unique(),
    {
      fileId: fileRes.$id,
      prompt: cleanedPrompt,
      ownerId,
      createdAt: new Date().toISOString(),
    }
  );

  return { fileRes, doc };
}

// Fetch photos with pagination
export async function fetchPhotos(limit = 25, offset = 0) {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.limit(limit), Query.offset(offset), Query.orderDesc("createdAt")]
    );

    return res.documents.map((doc) => ({
      id: doc.$id,
      prompt: doc.prompt,
      fileId: doc.fileId,
      url: `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${doc.fileId}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`,
      createdAt: doc.createdAt,
    }));
  } catch (err) {
    console.error("Error fetching photos:", err);
    return [];
  }
}
