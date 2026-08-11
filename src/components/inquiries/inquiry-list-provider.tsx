"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { InquiryListDrawer } from "@/components/inquiries/inquiry-list-drawer"
import { trackPublicEvent, type PublicAnalyticsEvent } from "@/modules/analytics/events"
import { parseSourceContext } from "@/modules/analytics/source"
import {
  INQUIRY_LIST_STORAGE_KEY,
  createInquiryListStorage,
  createInquirySourceStorage,
  type InquiryListItem,
  type InquiryListItemPatch,
  type InquiryListStorage,
  type InquirySourceContext,
  type InquirySourceStorage,
} from "@/modules/inquiries/storage"
import type { SupportedLocale } from "@/modules/localization/config"

type Placement = NonNullable<PublicAnalyticsEvent["placement"]>

type InquiryListContextValue = {
  items: InquiryListItem[]
  count: number
  hydrated: boolean
  source: InquirySourceContext | null
  drawerOpen: boolean
  addItem(
    item: InquiryListItem,
    placement: Placement,
    trigger?: HTMLElement | null,
    openAfterAdd?: boolean,
  ): void
  updateItem(productId: string, patch: InquiryListItemPatch): void
  removeItem(productId: string): void
  clear(): void
  openDrawer(trigger?: HTMLElement | null): void
  closeDrawer(): void
}

const InquiryListContext = createContext<InquiryListContextValue | null>(null)

export function useInquiryList(): InquiryListContextValue {
  const context = useContext(InquiryListContext)
  if (!context) {
    throw new Error("useInquiryList must be used within InquiryListProvider")
  }
  return context
}

export function InquiryListProvider({
  locale,
  children,
}: {
  locale: SupportedLocale
  children: ReactNode
}) {
  const listStorage = useRef<InquiryListStorage | null>(null)
  const sourceStorage = useRef<InquirySourceStorage | null>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)
  const itemsRef = useRef<InquiryListItem[]>([])
  const sourceRef = useRef<InquirySourceContext | null>(null)
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [source, setSource] = useState<InquirySourceContext | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    listStorage.current = createInquiryListStorage({ storage: window.localStorage })
    sourceStorage.current = createInquirySourceStorage({ storage: window.localStorage })
    const restoredItems = listStorage.current.getItems()
    itemsRef.current = restoredItems
    setItems(restoredItems)

    const existingSource = sourceStorage.current.get()
    const capturedSource = existingSource ?? sourceStorage.current.saveFirstTouch(
      parseSourceContext(
        window.location.href,
        document.referrer,
        crypto.randomUUID(),
      ),
    )
    sourceRef.current = capturedSource
    setSource(capturedSource)
    setHydrated(true)

    function synchronize(event: StorageEvent) {
      if (event.key === INQUIRY_LIST_STORAGE_KEY) {
        const nextItems = listStorage.current?.getItems() ?? []
        itemsRef.current = nextItems
        setItems(nextItems)
      }
    }
    window.addEventListener("storage", synchronize)
    return () => window.removeEventListener("storage", synchronize)
  }, [])

  const openDrawer = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) {
      restoreFocusTo.current = trigger
    }
    setDrawerOpen(true)
    trackPublicEvent({
      name: "inquiry_opened",
      locale,
      itemCount: itemsRef.current.length,
      placement: "inquiry_drawer",
      channel: sourceRef.current?.channel,
    })
  }, [locale])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    window.setTimeout(() => restoreFocusTo.current?.focus(), 0)
  }, [])

  const value = useMemo<InquiryListContextValue>(() => ({
    items,
    count: items.length,
    hydrated,
    source,
    drawerOpen,
    addItem(item, placement, trigger, openAfterAdd = true) {
      const storage = listStorage.current
      if (!storage) {
        return
      }
      const alreadySelected = itemsRef.current.some(({ productId }) => productId === item.productId)
      const nextItems = storage.addItem(item)
      itemsRef.current = nextItems
      setItems(nextItems)
      const nextSource = sourceStorage.current?.setFirstProductCode(item.code) ?? sourceRef.current
      sourceRef.current = nextSource
      setSource(nextSource)
      if (!alreadySelected) {
        trackPublicEvent({
          name: "inquiry_item_added",
          locale,
          itemCount: nextItems.length,
          placement,
          productCode: item.code,
          channel: nextSource?.channel,
          campaign: nextSource?.campaign ?? undefined,
        })
      }
      if (openAfterAdd) {
        openDrawer(trigger)
      }
    },
    updateItem(productId, patch) {
      const nextItems = listStorage.current?.updateItem(productId, patch) ?? itemsRef.current
      itemsRef.current = nextItems
      setItems(nextItems)
    },
    removeItem(productId) {
      const nextItems = listStorage.current?.removeItem(productId) ?? itemsRef.current
      itemsRef.current = nextItems
      setItems(nextItems)
    },
    clear() {
      const nextItems = listStorage.current?.clear() ?? []
      itemsRef.current = nextItems
      setItems(nextItems)
    },
    openDrawer,
    closeDrawer,
  }), [closeDrawer, drawerOpen, hydrated, items, locale, openDrawer, source])

  return (
    <InquiryListContext.Provider value={value}>
      {children}
      <InquiryListDrawer locale={locale} />
    </InquiryListContext.Provider>
  )
}
