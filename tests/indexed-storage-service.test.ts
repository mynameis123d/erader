import { describe, it, expect, beforeEach } from "vitest";
import { IndexedStorageService } from "../src/services/indexed-storage-service";
import type { BookFile, ContentManifest } from "../src/types";

describe("IndexedStorageService", () => {
  let service: IndexedStorageService;

  beforeEach(() => {
    service = new IndexedStorageService("test-db");
  });

  it("should save and retrieve a file", async () => {
    const manifest: ContentManifest = {
      format: "epub",
      spine: [],
      tableOfContents: [],
    };

    const file: BookFile = {
      id: "file-1",
      fileName: "test.epub",
      fileType: "application/epub+zip",
      fileSize: 1024,
      blob: new Blob(["test content"], { type: "application/epub+zip" }),
      addedDate: new Date(),
      manifest,
    };

    await service.saveFile(file);
    const retrieved = await service.getFile("file-1");

    expect(retrieved).toBeTruthy();
    expect(retrieved?.fileName).toBe("test.epub");
    expect(retrieved?.fileType).toBe("application/epub+zip");
    expect(retrieved?.fileSize).toBe(1024);
    expect(retrieved?.manifest?.format).toBe("epub");
  });

  it("should return undefined for non-existent file", async () => {
    const retrieved = await service.getFile("non-existent");
    expect(retrieved).toBeUndefined();
  });

  it("should delete a file", async () => {
    const file: BookFile = {
      id: "file-1",
      fileName: "test.epub",
      fileType: "application/epub+zip",
      fileSize: 1024,
      blob: new Blob(["test content"]),
      addedDate: new Date(),
    };

    await service.saveFile(file);
    await service.deleteFile("file-1");

    const retrieved = await service.getFile("file-1");
    expect(retrieved).toBeUndefined();
  });

  it("should list all files", async () => {
    const file1: BookFile = {
      id: "file-1",
      fileName: "test1.epub",
      fileType: "application/epub+zip",
      fileSize: 1024,
      blob: new Blob(["test content 1"]),
      addedDate: new Date(),
    };

    const file2: BookFile = {
      id: "file-2",
      fileName: "test2.epub",
      fileType: "application/epub+zip",
      fileSize: 2048,
      blob: new Blob(["test content 2"]),
      addedDate: new Date(),
    };

    await service.saveFile(file1);
    await service.saveFile(file2);

    const files = await service.listFiles();
    expect(files).toHaveLength(2);
  });

  it("should update file if saved again", async () => {
    const file: BookFile = {
      id: "file-1",
      fileName: "test.epub",
      fileType: "application/epub+zip",
      fileSize: 1024,
      blob: new Blob(["test content"]),
      addedDate: new Date(),
    };

    await service.saveFile(file);

    const updatedFile: BookFile = {
      ...file,
      fileName: "updated.epub",
      fileSize: 2048,
    };

    await service.saveFile(updatedFile);

    const retrieved = await service.getFile("file-1");
    expect(retrieved?.fileName).toBe("updated.epub");
    expect(retrieved?.fileSize).toBe(2048);
  });
});
