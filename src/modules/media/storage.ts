import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"

export type PresignedPost = {
  uploadUrl: string
  fields: Record<string, string>
  expiresAt: Date
}

export type StoredObject = {
  body: Uint8Array
  contentLength: number
  contentType: string
}

export interface ObjectStorage {
  createPresignedPost(input: {
    key: string
    contentType: string
    maxBytes: number
    expiresInSeconds: number
  }): Promise<PresignedPost>
  getObject(key: string, maxBytes: number): Promise<StoredObject>
  putObject(input: StoredObject & { key: string }): Promise<void>
  deleteObject(key: string): Promise<void>
  getPublicUrl(key: string): string
}

type S3StorageConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorageConfigurationError"
  }
}

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim()
  if (!value) {
    throw new StorageConfigurationError(`${name} is required`)
  }
  return value
}

function parseStorageUrl(value: string, name: string, production: boolean): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new StorageConfigurationError(`${name} must be a valid URL`)
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    (production && url.protocol !== "https:")
  ) {
    throw new StorageConfigurationError(`${name} is not allowed`)
  }
  return url.toString()
}

export function readS3StorageConfig(
  environment: NodeJS.ProcessEnv = process.env,
): S3StorageConfig {
  const production = environment.NODE_ENV === "production"
  return {
    endpoint: parseStorageUrl(
      required(environment, "STORAGE_ENDPOINT"),
      "STORAGE_ENDPOINT",
      production,
    ),
    region: required(environment, "STORAGE_REGION"),
    bucket: required(environment, "STORAGE_BUCKET"),
    accessKeyId: required(environment, "STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: required(environment, "STORAGE_SECRET_ACCESS_KEY"),
    publicUrl: parseStorageUrl(
      required(environment, "STORAGE_PUBLIC_URL"),
      "STORAGE_PUBLIC_URL",
      production,
    ),
  }
}

function assertSafeKey(key: string): void {
  if (
    !key ||
    !key.split("/").every((segment) => /^[A-Za-z0-9._-]+$/.test(segment)) ||
    key.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new StorageConfigurationError("Object key is not safe")
  }
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    })
  }

  async createPresignedPost(input: {
    key: string
    contentType: string
    maxBytes: number
    expiresInSeconds: number
  }): Promise<PresignedPost> {
    assertSafeKey(input.key)
    const result = await createPresignedPost(this.client, {
      Bucket: this.config.bucket,
      Key: input.key,
      Expires: input.expiresInSeconds,
      Fields: { "Content-Type": input.contentType },
      Conditions: [
        ["content-length-range", 1, input.maxBytes],
        ["eq", "$Content-Type", input.contentType],
        ["eq", "$key", input.key],
      ],
    })
    return {
      uploadUrl: result.url,
      fields: result.fields,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1_000),
    }
  }

  async getObject(key: string, maxBytes: number): Promise<StoredObject> {
    assertSafeKey(key)
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    }))
    if (
      !result.Body ||
      result.ContentLength === undefined ||
      !result.ContentType
    ) {
      throw new Error("Stored object metadata is incomplete")
    }
    const stream = result.Body.transformToWebStream()
    if (result.ContentLength <= 0 || result.ContentLength > maxBytes) {
      await stream.cancel()
      throw new Error("Stored object size is outside the allowed range")
    }

    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        bytes += value.byteLength
        if (bytes > maxBytes) {
          throw new Error("Stored object exceeds the allowed range")
        }
        chunks.push(value)
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined)
      throw error
    } finally {
      reader.releaseLock()
    }
    if (bytes !== result.ContentLength) {
      throw new Error("Stored object length does not match its metadata")
    }

    const body = new Uint8Array(bytes)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    return {
      body,
      contentLength: bytes,
      contentType: result.ContentType,
    }
  }

  async putObject(input: StoredObject & { key: string }): Promise<void> {
    assertSafeKey(input.key)
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: input.key,
      Body: input.body,
      ContentLength: input.contentLength,
      ContentType: input.contentType,
    }))
  }

  async deleteObject(key: string): Promise<void> {
    assertSafeKey(key)
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    }))
  }

  getPublicUrl(key: string): string {
    assertSafeKey(key)
    if (!key.startsWith("public/media/")) {
      throw new StorageConfigurationError("Only public media keys can have public URLs")
    }
    const base = this.config.publicUrl.endsWith("/")
      ? this.config.publicUrl
      : `${this.config.publicUrl}/`
    return new URL(key.slice("public/media/".length), base).toString()
  }
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly root: string) {}

  async createPresignedPost(input: {
    key: string
    contentType: string
    maxBytes: number
    expiresInSeconds: number
  }): Promise<PresignedPost> {
    assertSafeKey(input.key)
    throw new StorageConfigurationError(
      "Local presigned uploads require the authenticated admin upload route",
    )
  }

  async getObject(key: string, maxBytes: number): Promise<StoredObject> {
    assertSafeKey(key)
    const filePath = path.resolve(this.root, key)
    const fileInfo = await stat(filePath)
    if (fileInfo.size <= 0 || fileInfo.size > maxBytes) {
      throw new Error("Stored object size is outside the allowed range")
    }
    const body = await readFile(filePath)
    if (body.byteLength !== fileInfo.size) {
      throw new Error("Stored object changed while being read")
    }
    const contentTypePath = `${filePath}.content-type`
    const contentType = (await readFile(contentTypePath, "utf8")).trim()
    if (!contentType) {
      throw new Error("Stored object content type is missing")
    }
    return { body, contentLength: body.byteLength, contentType }
  }

  async putObject(input: StoredObject & { key: string }): Promise<void> {
    assertSafeKey(input.key)
    const filePath = path.resolve(this.root, input.key)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, input.body, { flag: "wx" })
    try {
      await writeFile(`${filePath}.content-type`, input.contentType, { flag: "wx" })
    } catch (error) {
      await rm(filePath, { force: true })
      throw error
    }
  }

  async deleteObject(key: string): Promise<void> {
    assertSafeKey(key)
    const filePath = path.resolve(this.root, key)
    await Promise.all([
      rm(filePath, { force: true }),
      rm(`${filePath}.content-type`, { force: true }),
    ])
  }

  getPublicUrl(key: string): string {
    assertSafeKey(key)
    throw new StorageConfigurationError(
      "Local storage does not expose public media URLs",
    )
  }
}

export function createObjectStorage(
  environment: NodeJS.ProcessEnv = process.env,
): ObjectStorage {
  const driver = environment.STORAGE_DRIVER?.trim().toLowerCase() || "s3"
  if (driver === "local") {
    if (environment.NODE_ENV === "production") {
      throw new StorageConfigurationError("Local storage is disabled in production")
    }
    return new LocalObjectStorage(
      environment.STORAGE_LOCAL_ROOT?.trim() || path.join(process.cwd(), ".local-media"),
    )
  }
  if (driver !== "s3") {
    throw new StorageConfigurationError("Unknown storage driver")
  }
  return new S3ObjectStorage(readS3StorageConfig(environment))
}
