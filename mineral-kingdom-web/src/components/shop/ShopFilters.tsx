"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ListingBrowseAvailableFiltersDto } from "@/lib/shop/getListings"

type Props = {
  availableFilters: ListingBrowseAvailableFiltersDto
}

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
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      data-testid="shop-filters"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
          Filters
        </h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
          data-testid="shop-filters-clear"
        >
          Clear all
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Listing type</span>
          <select
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
            value={searchParams.get("listingType") ?? ""}
            onChange={(e) => updateParam("listingType", e.target.value)}
            data-testid="shop-filter-listing-type"
          >
            <option value="">All</option>
            <option value="STORE">Store</option>
            <option value="AUCTION">Auction</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Mineral type</span>
          <select
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
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

        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Size class</span>
          <select
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
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

        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Sort</span>
          <select
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
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
        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Min price</span>
          <input
            type="number"
            min="0"
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
            defaultValue={searchParams.get("minPrice") ?? ""}
            onBlur={(e) => updateParam("minPrice", e.target.value)}
            data-testid="shop-filter-min-price"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-stone-700">Max price</span>
          <input
            type="number"
            min="0"
            className="w-full rounded-xl border border-stone-300 px-3 py-2"
            defaultValue={searchParams.get("maxPrice") ?? ""}
            onBlur={(e) => updateParam("maxPrice", e.target.value)}
            data-testid="shop-filter-max-price"
          />
        </label>

        <label className="flex items-end gap-3 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700">
          <input
            type="checkbox"
            className="h-4 w-4"
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