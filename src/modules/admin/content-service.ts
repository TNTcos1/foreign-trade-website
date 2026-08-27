import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  AdminServiceError,
  type ContentTranslationInput,
  validateContentSlug,
  validateContentTranslation,
  validateLocale,
} from "@/modules/admin/validation"

function contentTranslationJson(data: ContentTranslationInput): Prisma.InputJsonObject {
  return data as unknown as Prisma.InputJsonObject
}

function translationDraft(value: Prisma.JsonValue | null): ContentTranslationInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return validateContentTranslation(value)
}

export async function saveContentTranslation(
  slug: string,
  localeValue: unknown,
  input: unknown,
  actorId: string,
) {
  slug = validateContentSlug(slug)
  const locale = validateLocale(localeValue)
  const translation = validateContentTranslation(input)
  return prisma.$transaction(async (tx) => {
    const page = await tx.contentPage.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!page) {
      throw new AdminServiceError("CONTENT_NOT_FOUND")
    }
    const existing = await tx.contentTranslation.findUnique({
      where: { contentPageId_locale: { contentPageId: page.id, locale } },
      select: { id: true, publishedAt: true },
    })
    const saved = existing?.publishedAt
      ? await tx.contentTranslation.update({
          where: { id: existing.id },
          data: { draftData: contentTranslationJson(translation) },
        })
      : await tx.contentTranslation.upsert({
          where: { contentPageId_locale: { contentPageId: page.id, locale } },
          update: { ...translation, draftData: Prisma.DbNull },
          create: { contentPageId: page.id, locale, ...translation },
        })
    await tx.contentPage.update({
      where: { id: page.id },
      data: { updatedById: actorId },
    })
    return {
      ...saved,
      ...translation,
      ...(existing?.publishedAt ? { publishedAt: existing.publishedAt, draftData: contentTranslationJson(translation) } : {}),
      hasDraftChanges: Boolean(existing?.publishedAt),
    }
  })
}

export async function publishContentLocale(
  slug: string,
  localeValue: unknown,
  actorId: string,
) {
  slug = validateContentSlug(slug)
  const locale = validateLocale(localeValue)
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const page = await tx.contentPage.findUnique({
      where: { slug },
      select: {
        id: true,
        publishedAt: true,
        translations: {
          where: { locale: { in: locale === "ar" ? ["en", "ar"] : ["en"] } },
          select: { id: true, locale: true, publishedAt: true, draftData: true },
        },
      },
    })
    if (!page) {
      throw new AdminServiceError("CONTENT_NOT_FOUND")
    }
    const requested = page.translations.find(({ locale: candidate }) => candidate === locale)
    if (!requested) {
      throw new AdminServiceError("TRANSLATION_NOT_FOUND")
    }
    if (locale === "ar") {
      const english = page.translations.find(({ locale: candidate }) => candidate === "en")
      if (!english?.publishedAt || english.publishedAt > now) {
        throw new AdminServiceError("ENGLISH_PUBLICATION_REQUIRED")
      }
    }
    const draftTranslation = translationDraft(requested.draftData)
    const translation = await tx.contentTranslation.update({
      where: { id: requested.id },
      data: {
        ...(draftTranslation ?? {}),
        publishedAt: now,
        draftData: Prisma.DbNull,
      },
    })
    await tx.contentPage.update({
      where: { id: page.id },
      data: { publishedAt: page.publishedAt ?? now, updatedById: actorId },
    })
    return translation
  })
}

export async function unpublishContentLocale(
  slug: string,
  localeValue: unknown,
  actorId: string,
) {
  slug = validateContentSlug(slug)
  const locale = validateLocale(localeValue)
  return prisma.$transaction(async (tx) => {
    const page = await tx.contentPage.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!page) {
      throw new AdminServiceError("CONTENT_NOT_FOUND")
    }
    if (locale === "en") {
      await tx.contentTranslation.updateMany({
        where: { contentPageId: page.id },
        data: { publishedAt: null },
      })
      await tx.contentPage.update({
        where: { id: page.id },
        data: { publishedAt: null, updatedById: actorId },
      })
      return
    }
    await tx.contentTranslation.updateMany({
      where: { contentPageId: page.id, locale },
      data: { publishedAt: null },
    })
    await tx.contentPage.update({
      where: { id: page.id },
      data: { updatedById: actorId },
    })
  })
}
