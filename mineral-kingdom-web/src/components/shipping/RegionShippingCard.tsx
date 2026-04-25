"use client"

import { useMemo, useState } from "react"
import {
  type ShippingRegionCode,
  SHIPPING_REGION_OPTIONS,
} from "@/components/shipping/shippingRegions"

export type RegionShippingRate = {
  regionCode: "US" | "CA" | "EU" | "AU" | "ROW"
  regionLabel: string
  amountCents?: number | null
  currencyCode: string
  displayLabel: string
}

type Props = {
  title?: string
  rates: RegionShippingRate[]
  shippingMessage?: string | null
  fallbackQuotedShippingCents?: number | null
  emptyMessage: string
  helperText?: string
  testIdPrefix: string
}

function formatMoney(cents?: number | null): string | null {
  if (typeof cents !== "number") return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function RegionShippingCard({
  title = "Shipping",
  rates,
  shippingMessage,
  fallbackQuotedShippingCents,
  emptyMessage,
  helperText = "Select your region to see shipping cost. Full shipping address will be collected before final checkout.",
  testIdPrefix,
}: Props) {
  const [selectedRegionCode, setSelectedRegionCode] = useState<ShippingRegionCode>("US")

  const selectedShippingRate = useMemo(() => {
    return rates.find((rate) => rate.regionCode === selectedRegionCode) ?? null
  }, [rates, selectedRegionCode])

  const selectedShippingLabel = useMemo(() => {
    if (selectedShippingRate) {
      return selectedShippingRate.displayLabel
    }

    if (rates.length === 0 && typeof fallbackQuotedShippingCents === "number") {
      return selectedRegionCode === "US"
        ? (formatMoney(fallbackQuotedShippingCents) ?? "—")
        : "Shipping quote available on request"
    }

    return "Shipping quote available on request"
  }, [fallbackQuotedShippingCents, rates.length, selectedRegionCode, selectedShippingRate])

  const selectedRegionLabel =
    SHIPPING_REGION_OPTIONS.find((option) => option.code === selectedRegionCode)?.label ?? "US"

  return (
    <section
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid={`${testIdPrefix}-card`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <p
            className="mt-2 text-sm leading-6 text-stone-600"
            data-testid={`${testIdPrefix}-helper`}
          >
            {helperText}
          </p>
        </div>

        <div className="sm:w-56">
          <label
            htmlFor={`${testIdPrefix}-region-select`}
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Region
          </label>
          <select
            id={`${testIdPrefix}-region-select`}
            data-testid={`${testIdPrefix}-region-select`}
            value={selectedRegionCode}
            onChange={(e) => setSelectedRegionCode(e.target.value as ShippingRegionCode)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
          >
            {SHIPPING_REGION_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
        data-testid={`${testIdPrefix}-selected-region-summary`}
      >
        <p className="text-sm text-stone-700">
          <span className="font-medium text-stone-900">{selectedRegionLabel}:</span>{" "}
          <span data-testid={`${testIdPrefix}-selected-shipping`}>{selectedShippingLabel}</span>
        </p>
      </div>

      {rates.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Region</th>
                <th className="px-4 py-3 text-left font-medium text-stone-600">Shipping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {rates.map((rate) => (
                <tr
                  key={rate.regionCode}
                  data-testid={`${testIdPrefix}-row-${rate.regionCode}`}
                >
                  <td className="px-4 py-3 text-stone-800">{rate.regionLabel}</td>
                  <td className="px-4 py-3 text-stone-700">{rate.displayLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {shippingMessage ? (
        <p
          className="mt-4 text-sm leading-6 text-stone-600"
          data-testid={`${testIdPrefix}-message`}
        >
          {shippingMessage}
        </p>
      ) : null}

      {!shippingMessage && rates.length === 0 ? (
        <p
          className="mt-4 text-sm leading-6 text-stone-600"
          data-testid={`${testIdPrefix}-message`}
        >
          {emptyMessage}
        </p>
      ) : null}
    </section>
  )
}