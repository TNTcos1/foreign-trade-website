"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

import { useInquiryList } from "@/components/inquiries/inquiry-list-provider"
import { InquiryListSummary } from "@/components/inquiries/inquiry-list-summary"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export function InquiryListDrawer({ locale }: { locale: SupportedLocale }) {
  const { drawerOpen, closeDrawer, count, clear } = useInquiryList()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dictionary = getDictionary(locale)
  const copy = dictionary.inquiry.drawer

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (drawerOpen && !dialog.open) {
      dialog.showModal()
    } else if (!drawerOpen && dialog.open) {
      dialog.close()
    }
  }, [drawerOpen])

  return (
    <dialog
      ref={dialogRef}
      className="inquiry-drawer"
      aria-labelledby="inquiry-drawer-title"
      onCancel={(event) => {
        event.preventDefault()
        closeDrawer()
      }}
      onClose={() => {
        if (drawerOpen) {
          closeDrawer()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeDrawer()
        }
      }}
    >
      <div className="inquiry-drawer__panel">
        <header className="inquiry-drawer__header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="inquiry-drawer-title">{copy.title}</h2>
            <p>{copy.description}</p>
          </div>
          <button
            className="inquiry-drawer__close"
            type="button"
            aria-label={copy.close}
            onClick={closeDrawer}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="inquiry-drawer__body">
          <InquiryListSummary locale={locale} />
        </div>

        <footer className="inquiry-drawer__footer">
          {count > 0 ? (
            <button className="inquiry-drawer__clear" type="button" onClick={clear}>
              {copy.clear}
            </button>
          ) : <span />}
          <div>
            <button className="button button--secondary" type="button" onClick={closeDrawer}>
              {copy.continueBrowsing}
            </button>
            <Link
              className="button button--primary"
              href={`/${locale}/inquiry`}
              onClick={closeDrawer}
            >
              {copy.submit}
            </Link>
          </div>
        </footer>
      </div>
    </dialog>
  )
}
