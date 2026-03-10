import { existsSync, mkdirSync } from "fs";
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";

/**
 * Simple local file storage.
 * Uses /tmp/clippy-storage on Railway (ephemeral) or a configured S3 bucket.
 *
 * For production, replace with S3 using the existing upload-url pattern.
 * This module provides a unified interface either way.
 */

const STORAGE_ROOT = process.env.STORAGE_PATH || "/tmp/clippy-storage";

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Save a buffer to local storage. Returns the relative path. */
export async function saveFile(
  subdir: string,
  filename: string,
  data: Buffer
): Promise<string> {
  const dir = path.join(STORAGE_ROOT, subdir);
  ensureDir(dir);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, data);
  return path.join(subdir, filename);
}

/** Get the absolute path for a stored file. */
export function getAbsolutePath(relativePath: string): string {
  return path.join(STORAGE_ROOT, relativePath);
}

/** Read a stored file. */
export async function readStoredFile(relativePath: string): Promise<Buffer> {
  return readFile(path.join(STORAGE_ROOT, relativePath));
}

/** Delete a stored file. */
export async function deleteFile(relativePath: string): Promise<void> {
  try {
    await unlink(path.join(STORAGE_ROOT, relativePath));
  } catch {
    // File may already be deleted
  }
}

/** Check if a stored file exists. */
export function fileExists(relativePath: string): boolean {
  return existsSync(path.join(STORAGE_ROOT, relativePath));
}
