"use client"

import { useInquiryList } from "@/components/inquiries/inquiry-list-provider"
import type { SupportedLocale } from "@/modules/localization/config"
import { getDictionary } from "@/modules/localization/dictionary"

export function InquiryListSummary({ locale }: { locale: SupportedLocale }) {
  const { items, updateItem, removeItem } = useInquiryList()
  const dictionary = getDictionary(locale)
  const copy = dictionary.inquiry.drawer

  if (items.length === 0) {
    return <p className="inquiry-list-empty">{dictionary.inquiry.empty}</p>
  }

  return (
    <ol className="inquiry-list-summary">
      {items.map((item, index) => (
        <li key={item.productId} className="inquiry-list-item">
          <div className="inquiry-list-item__heading">
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.code}</strong>
          </div>
          <div className="inquiry-list-item__fields">
            <label>
              <span>{copy.quantity}</span>
              <input
                key={item.quantity ?? "empty"}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                defaultValue={item.quantity ?? ""}
                onBlur={(event) => {
                  const value = event.currentTarget.value
                  updateItem(item.productId, {
                    quantity: value ? Number(value) : undefined,
                  })
                }}
              />
            </label>
            <label>
              <span>{copy.note}</span>
              <textarea
                key={item.note ?? "empty"}
                rows={2}
                maxLength={500}
                placeholder={copy.notePlaceholder}
                defaultValue={item.note ?? ""}
                onBlur={(event) => updateItem(item.productId, {
                  note: event.currentTarget.value,
                })}
              />
            </label>
          </div>
          <button
            className="inquiry-list-item__remove"
            type="button"
            onClick={() => removeItem(item.productId)}
          >
            {copy.remove}
          </button>
        </li>
      ))}
    </ol>
  )
}
