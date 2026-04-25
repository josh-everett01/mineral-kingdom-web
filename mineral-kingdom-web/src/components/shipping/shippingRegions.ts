export type ShippingRegionCode = "US" | "CA" | "EU" | "AU" | "ROW"

export const SHIPPING_REGION_OPTIONS: ReadonlyArray<{
  code: ShippingRegionCode
  label: string
}> = [
    { code: "US", label: "US" },
    { code: "CA", label: "Canada" },
    { code: "EU", label: "Europe" },
    { code: "AU", label: "Australia" },
    { code: "ROW", label: "Rest of World" },
  ]

export function isShippingRegionCode(value: string | null | undefined): value is ShippingRegionCode {
  return value === "US" || value === "CA" || value === "EU" || value === "AU" || value === "ROW"
}

export function formatShippingRegionLabel(value?: string | null) {
  if (!value) return "—"
  return SHIPPING_REGION_OPTIONS.find((option) => option.code === value)?.label ?? value
}