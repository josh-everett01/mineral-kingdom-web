"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { Gem, Play } from "lucide-react"

type ListingGalleryItem = {
  id: string
  url: string
  mediaType: string
  caption?: string | null
  isPrimary: boolean
  sortOrder: number
}

type ListingImageGalleryProps = {
  images: ListingGalleryItem[]
  title: string
}

function getAltText(title: string, item: ListingGalleryItem, index: number) {
  const caption = item.caption?.trim()
  if (caption) return caption
  return `${title} ${item.mediaType === "VIDEO" ? "video" : "image"} ${index + 1}`
}

function clampIndex(index: number, max: number) {
  if (max < 0) return 0
  if (index < 0) return 0
  if (index > max) return max
  return index
}

export function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const orderedItems = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.sortOrder - b.sortOrder
    })
  }, [images])

  const [selectedIndex, setSelectedIndex] = useState(0)

  const hasItems = orderedItems.length > 0

  if (!hasItems) {
    return (
      <section
        data-testid="listing-gallery"
        className="space-y-4"
        aria-label={`${title} image gallery`}
      >
        <div className="mk-glass-strong relative aspect-square overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]">
          <div className="flex h-full items-center justify-center text-sm mk-muted-text">
            <Gem className="mr-2 h-5 w-5 text-[color:var(--mk-gold)]" />
            No image available
          </div>
        </div>
      </section>
    )
  }

  const hasMultiple = orderedItems.length > 1
  const maxIndex = orderedItems.length - 1
  const safeSelectedIndex = clampIndex(selectedIndex, maxIndex)
  const selectedItem = orderedItems[safeSelectedIndex]
  const isVideo = selectedItem.mediaType === "VIDEO"

  function handlePrevious() {
    setSelectedIndex((current) => clampIndex(current - 1, maxIndex))
  }

  function handleNext() {
    setSelectedIndex((current) => clampIndex(current + 1, maxIndex))
  }

  return (
    <section
      data-testid="listing-gallery"
      className="space-y-4"
      aria-label={`${title} image gallery`}
    >
      <div className="mk-glass-strong relative aspect-square overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-2">
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-[color:var(--mk-panel)] p-2">
          {isVideo ? (
            <video
              key={selectedItem.id}
              data-testid="listing-gallery-main-video"
              src={selectedItem.url}
              controls
              playsInline
              className="max-h-full w-full rounded-[1.25rem] object-contain shadow-sm"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={selectedItem.id}
              data-testid="listing-gallery-main-image"
              src={selectedItem.url}
              alt={getAltText(title, selectedItem, safeSelectedIndex)}
              className="max-h-full max-w-full rounded-[1.25rem] object-contain shadow-sm"
            />
          )}

          {hasMultiple ? (
            <>
              <button
                type="button"
                data-testid="listing-gallery-prev"
                aria-label="Previous image"
                onClick={handlePrevious}
                disabled={safeSelectedIndex === 0}
                className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.88)] text-lg font-semibold text-[color:var(--mk-ink)] shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>

              <button
                type="button"
                data-testid="listing-gallery-next"
                aria-label="Next image"
                onClick={handleNext}
                disabled={safeSelectedIndex === maxIndex}
                className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.88)] text-lg font-semibold text-[color:var(--mk-ink)] shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      </div>

      {hasMultiple ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {orderedItems.map((item, index) => {
            const isSelected = index === safeSelectedIndex
            const itemIsVideo = item.mediaType === "VIDEO"

            return (
              <button
                key={item.id}
                type="button"
                data-testid="listing-gallery-thumbnail"
                data-selected={isSelected ? "true" : "false"}
                aria-label={`View ${itemIsVideo ? "video" : "image"} ${index + 1}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedIndex(index)}
                className={[
                  "relative aspect-square overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] transition",
                  isSelected
                    ? "ring-2 ring-[color:var(--mk-gold)] ring-offset-2 ring-offset-[color:var(--mk-page)]"
                    : "opacity-85 hover:opacity-100",
                ].join(" ")}
              >
                {itemIsVideo ? (
                  <div className="flex h-full w-full items-center justify-center bg-[color:var(--mk-panel)]">
                    <Play className="h-6 w-6 text-[color:var(--mk-gold)]" fill="currentColor" />
                  </div>
                ) : (
                  <Image
                    src={item.url}
                    alt={getAltText(title, item, index)}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}