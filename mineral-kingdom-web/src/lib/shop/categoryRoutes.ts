export const VALID_SIZE_CLASSES = [
  "THUMBNAIL",
  "MINIATURE",
  "CABINET",
  "SMALL_CABINET",
  "LARGE_CABINET",
  "MUSEUM",
] as const

export type ValidSizeClass = (typeof VALID_SIZE_CLASSES)[number]

export function normalizeMineralRouteName(name: string): string {
  return decodeURIComponent(name).trim()
}

export function normalizeSizeClassRoute(sizeClass: string): string {
  return decodeURIComponent(sizeClass).trim().toUpperCase()
}

export function isValidSizeClass(value: string): value is ValidSizeClass {
  return VALID_SIZE_CLASSES.includes(value as ValidSizeClass)
}

export function formatSizeClassLabel(sizeClass: string): string {
  return sizeClass
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}