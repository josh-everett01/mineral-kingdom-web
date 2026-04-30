"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ListingBrowseAvailableFiltersDto } from "@/lib/shop/getListings"

type Props = {
  availableFilters: ListingBrowseAvailableFiltersDto
}

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] shadow-sm outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const labelClass = "space-y-1 text-sm"
const labelTextClass = "font-medium mk-muted-text"

export function ShopFilters({ availableFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString())

    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }

    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  return (
    <div
      className="mk-glass-strong space-y-4 rounded-[2rem] p-4 sm:p-5"
      data-testid="shop-filters"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Filters
        </h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-semibold mk-muted-text transition hover:text-[color:var(--mk-ink)]"
          data-testid="shop-filters-clear"
        >
          Clear all
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          <span className={labelTextClass}>Listing type</span>
          <select
            className={inputClass}
            value={searchParams.get("listingType") ?? ""}
            onChange={(e) => updateParam("listingType", e.target.value)}
            data-testid="shop-filter-listing-type"
          >
            <option value="">All</option>
            <option value="STORE">Store</option>
            <option value="AUCTION">Auction</option>
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Mineral type</span>
          <select
            className={inputClass}
            value={searchParams.get("mineralType") ?? ""}
            onChange={(e) => updateParam("mineralType", e.target.value)}
            data-testid="shop-filter-mineral-type"
          >
            <option value="">All</option>
            {availableFilters.mineralTypes.map((mineral) => (
              <option key={mineral} value={mineral}>
                {mineral}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Size class</span>
          <select
            className={inputClass}
            value={searchParams.get("sizeClass") ?? ""}
            onChange={(e) => updateParam("sizeClass", e.target.value)}
            data-testid="shop-filter-size-class"
          >
            <option value="">All</option>
            {availableFilters.sizeClasses.map((sizeClass) => (
              <option key={sizeClass} value={sizeClass}>
                {sizeClass}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Sort</span>
          <select
            className={inputClass}
            value={searchParams.get("sort") ?? "newest"}
            onChange={(e) => updateParam("sort", e.target.value)}
            data-testid="shop-filter-sort"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="ending_soon">Ending soon</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          <span className={labelTextClass}>Min price</span>
          <input
            type="number"
            min="0"
            className={inputClass}
            defaultValue={searchParams.get("minPrice") ?? ""}
            onBlur={(e) => updateParam("minPrice", e.target.value)}
            data-testid="shop-filter-min-price"
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>Max price</span>
          <input
            type="number"
            min="0"
            className={inputClass}
            defaultValue={searchParams.get("maxPrice") ?? ""}
            onBlur={(e) => updateParam("maxPrice", e.target.value)}
            data-testid="shop-filter-max-price"
          />
        </label>

        <label className="flex items-end gap-3 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm font-medium mk-muted-text shadow-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[color:var(--mk-amethyst)]"
            checked={searchParams.get("fluorescent") === "true"}
            onChange={(e) => updateParam("fluorescent", e.target.checked ? "true" : "")}
            data-testid="shop-filter-fluorescent"
          />
          Fluorescent only
        </label>
      </div>
    </div>
  )
}