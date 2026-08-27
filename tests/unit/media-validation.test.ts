// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  createObjectStorage,
  LocalObjectStorage,
  readS3StorageConfig,
  StorageConfigurationError,
} from "@/modules/media/storage"
import {
  DEFAULT_UPLOAD_LIMITS,
  validateUploadBatch,
} from "@/modules/media/validation"

describe("media upload validation", () => {
  it("normalizes an allowed image declaration", () => {
    const result = validateUploadBatch([
      { fileName: "warehouse.JPG", contentType: "image/jpeg", size: 2_048 },
    ])

    expect(result).toEqual({
      success: true,
      files: [
        {
          fileName: "warehouse.JPG",
          extension: "jpg",
          contentType: "image/jpeg",
          size: 2_048,
        },
      ],
    })
  })

  it.each([
    ["proof.svg", "image/svg+xml", "UNSUPPORTED_FILE_TYPE"],
    ["proof.html", "text/html", "UNSUPPORTED_FILE_TYPE"],
    ["proof.mp4", "video/mp4", "UNSUPPORTED_FILE_TYPE"],
    ["proof.png", "image/jpeg", "MIME_EXTENSION_MISMATCH"],
    ["../proof.jpg", "image/jpeg", "INVALID_FILE_NAME"],
  ])("rejects unsafe declaration %s", (fileName, contentType, code) => {
    const result = validateUploadBatch([{ fileName, contentType, size: 1_024 }])

    expect(result).toMatchObject({ success: false, code, index: 0 })
  })

  it("enforces file count and byte limits", () => {
    const tooMany = Array.from({ length: DEFAULT_UPLOAD_LIMITS.maxFiles + 1 }, (_, index) => ({
      fileName: `proof-${index}.jpg`,
      contentType: "image/jpeg",
      size: 1_024,
    }))

    expect(validateUploadBatch(tooMany)).toMatchObject({
      success: false,
      code: "TOO_MANY_FILES",
    })
    expect(validateUploadBatch([
      {
        fileName: "proof.jpg",
        contentType: "image/jpeg",
        size: DEFAULT_UPLOAD_LIMITS.maxBytesPerFile + 1,
      },
    ])).toMatchObject({ success: false, code: "FILE_TOO_LARGE", index: 0 })
    expect(validateUploadBatch([
      { fileName: "proof.jpg", contentType: "image/jpeg", size: 0 },
    ])).toMatchObject({ success: false, code: "INVALID_FILE_SIZE", index: 0 })
  })
})

describe("object storage configuration", () => {
  const s3Environment: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    STORAGE_ENDPOINT: "https://storage.example.test",
    STORAGE_REGION: "auto",
    STORAGE_BUCKET: "private-media",
    STORAGE_ACCESS_KEY_ID: "test-access-key",
    STORAGE_SECRET_ACCESS_KEY: "test-secret-key",
    STORAGE_PUBLIC_URL: "https://media.example.test/assets/",
  }

  it("accepts a complete S3-compatible configuration", () => {
    expect(readS3StorageConfig(s3Environment)).toEqual({
      endpoint: "https://storage.example.test/",
      region: "auto",
      bucket: "private-media",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      publicUrl: "https://media.example.test/assets/",
    })
  })

  const invalidConfigurations: Array<[NodeJS.ProcessEnv, string]> = [
    [{ ...s3Environment, STORAGE_ENDPOINT: "not-a-url" }, "STORAGE_ENDPOINT must be a valid URL"],
    [{ ...s3Environment, STORAGE_ENDPOINT: "https://user:secret@storage.example.test" }, "STORAGE_ENDPOINT is not allowed"],
    [{ ...s3Environment, STORAGE_BUCKET: " " }, "STORAGE_BUCKET is required"],
    [{ ...s3Environment, NODE_ENV: "production", STORAGE_ENDPOINT: "http://storage.example.test" }, "STORAGE_ENDPOINT is not allowed"],
  ]

  it.each(invalidConfigurations)("rejects unsafe or incomplete S3 configuration", (environment, message) => {
    expect(() => readS3StorageConfig(environment)).toThrow(message)
  })

  it("keeps local storage development-only and does not invent an upload route", async () => {
    expect(() => createObjectStorage({
      NODE_ENV: "production",
      STORAGE_DRIVER: "local",
    })).toThrow("Local storage is disabled in production")

    const storage = createObjectStorage({
      NODE_ENV: "test",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_ROOT: ".test-local-media",
    })
    expect(storage).toBeInstanceOf(LocalObjectStorage)
    await expect(storage.createPresignedPost({
      key: "staging/media/00000000-0000-4000-8000-000000000000",
      contentType: "image/jpeg",
      maxBytes: 1_024,
      expiresInSeconds: 300,
    })).rejects.toBeInstanceOf(StorageConfigurationError)
    for (const key of [
      "../outside.jpg",
      "C:/outside.jpg",
      "staging/media/object:stream",
      "staging//media/proof.jpg",
    ]) {
      await expect(storage.createPresignedPost({
        key,
        contentType: "image/jpeg",
        maxBytes: 1_024,
        expiresInSeconds: 300,
      })).rejects.toThrow("Object key is not safe")
    }
  })
})
