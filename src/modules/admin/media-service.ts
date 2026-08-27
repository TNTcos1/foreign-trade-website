import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { AdminServiceError, validateEntityId } from "@/modules/admin/validation"
import {
  completeUploadedImage,
  publishCompletedImage,
} from "@/modules/media/service"
import type { ObjectStorage } from "@/modules/media/storage"
import type { UploadDeclaration } from "@/modules/media/validation"

export async function completeAndAttachProductImage(input: {
  productId: string
  key: string
  declaration: UploadDeclaration
  altText: string | null
  sortOrder: number
  isPrimary: boolean
  actorId: string
  storage: ObjectStorage
}) {
  const productId = validateEntityId(input.productId)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, archivedAt: true },
  })
  if (!product) {
    throw new AdminServiceError("PRODUCT_NOT_FOUND")
  }
  if (product.archivedAt) {
    throw new AdminServiceError("PRODUCT_ARCHIVED")
  }

  const completed = await completeUploadedImage({
    key: input.key,
    declaration: input.declaration,
    storage: input.storage,
  })
  let published: Awaited<ReturnType<typeof publishCompletedImage>> | undefined

  try {
    const promoted = await publishCompletedImage({
      metadata: completed.metadata,
      storage: input.storage,
    })
    published = promoted
    return await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.productMedia.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        })
      }
      const media = await tx.productMedia.create({
        data: {
          productId,
          mediaType: "IMAGE",
          url: promoted.primaryUrl,
          altText: input.altText,
          metadata: promoted.metadata as unknown as Prisma.InputJsonValue,
          sortOrder: input.sortOrder,
          isPrimary: input.isPrimary,
        },
      })
      await tx.product.update({
        where: { id: productId },
        data: { updatedById: input.actorId },
      })
      return media
    })
  } catch (error) {
    await published?.cleanup()
    throw error
  } finally {
    await Promise.allSettled([
      input.storage.deleteObject(completed.metadata.original.key),
      ...Object.values(completed.metadata.variants).map(({ key }) =>
        input.storage.deleteObject(key)
      ),
    ])
  }
}
