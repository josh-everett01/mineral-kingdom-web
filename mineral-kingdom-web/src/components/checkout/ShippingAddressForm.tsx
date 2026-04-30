"use client"

import { useState } from "react"

export type ShippingAddressDto = {
  fullName: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  stateOrProvince: string
  postalCode: string
  countryCode: string
}

type Props = {
  initialValues?: ShippingAddressDto | null
  onSave: (addr: ShippingAddressDto) => Promise<void>
  isSaving: boolean
  error: string | null
}

type FormState = {
  fullName: string
  addressLine1: string
  addressLine2: string
  city: string
  stateOrProvince: string
  postalCode: string
  countryCode: string
}

type ValidationErrors = Partial<Record<keyof FormState, string>>

function validate(fields: FormState): ValidationErrors {
  const errs: ValidationErrors = {}

  if (!fields.fullName.trim()) errs.fullName = "Full name is required."
  if (!fields.addressLine1.trim()) errs.addressLine1 = "Address line 1 is required."
  if (!fields.city.trim()) errs.city = "City is required."
  if (!fields.stateOrProvince.trim()) errs.stateOrProvince = "State / province is required."
  if (!fields.postalCode.trim()) errs.postalCode = "Postal code is required."
  if (!fields.countryCode.trim()) errs.countryCode = "Country is required."

  return errs
}

const labelClass = "mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
const optionalClass = "font-normal mk-muted-text"
const errorTextClass = "mt-1 text-xs text-[color:var(--mk-danger)]"

export function ShippingAddressForm({ initialValues, onSave, isSaving, error }: Props) {
  const [fields, setFields] = useState<FormState>({
    fullName: initialValues?.fullName ?? "",
    addressLine1: initialValues?.addressLine1 ?? "",
    addressLine2: initialValues?.addressLine2 ?? "",
    city: initialValues?.city ?? "",
    stateOrProvince: initialValues?.stateOrProvince ?? "",
    postalCode: initialValues?.postalCode ?? "",
    countryCode: initialValues?.countryCode ?? "US",
  })

  const [, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const validationErrors = validate(fields)
  const showErrors = submitted

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
      setTouched((prev) => ({ ...prev, [key]: true }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)

    if (Object.keys(validate(fields)).length > 0) return

    await onSave({
      fullName: fields.fullName.trim(),
      addressLine1: fields.addressLine1.trim(),
      addressLine2: fields.addressLine2.trim() || null,
      city: fields.city.trim(),
      stateOrProvince: fields.stateOrProvince.trim(),
      postalCode: fields.postalCode.trim(),
      countryCode: fields.countryCode.trim().toUpperCase(),
    })
  }

  function fieldClass(key: keyof FormState) {
    const hasError = showErrors && validationErrors[key]

    return [
      "w-full rounded-2xl border px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition disabled:cursor-not-allowed disabled:opacity-60",
      hasError
        ? "border-[color:var(--mk-danger)] bg-[color:var(--mk-panel-muted)] focus:ring-2 focus:ring-[color:var(--mk-danger)]/20"
        : "border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20",
    ].join(" ")
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="space-y-4"
      data-testid="shipping-address-form"
    >
      <div>
        <label htmlFor="ship-full-name" className={labelClass}>
          Full name <span className="text-[color:var(--mk-danger)]">*</span>
        </label>
        <input
          id="ship-full-name"
          type="text"
          autoComplete="name"
          value={fields.fullName}
          onChange={set("fullName")}
          disabled={isSaving}
          className={fieldClass("fullName")}
          data-testid="ship-full-name"
        />
        {showErrors && validationErrors.fullName ? (
          <p className={errorTextClass} role="alert" data-testid="ship-full-name-error">
            {validationErrors.fullName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="ship-address-line1" className={labelClass}>
          Address line 1 <span className="text-[color:var(--mk-danger)]">*</span>
        </label>
        <input
          id="ship-address-line1"
          type="text"
          autoComplete="address-line1"
          value={fields.addressLine1}
          onChange={set("addressLine1")}
          disabled={isSaving}
          className={fieldClass("addressLine1")}
          data-testid="ship-address-line1"
        />
        {showErrors && validationErrors.addressLine1 ? (
          <p className={errorTextClass} role="alert" data-testid="ship-address-line1-error">
            {validationErrors.addressLine1}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="ship-address-line2" className={labelClass}>
          Address line 2 <span className={optionalClass}>(optional)</span>
        </label>
        <input
          id="ship-address-line2"
          type="text"
          autoComplete="address-line2"
          value={fields.addressLine2}
          onChange={set("addressLine2")}
          disabled={isSaving}
          className={fieldClass("addressLine2")}
          data-testid="ship-address-line2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ship-city" className={labelClass}>
            City <span className="text-[color:var(--mk-danger)]">*</span>
          </label>
          <input
            id="ship-city"
            type="text"
            autoComplete="address-level2"
            value={fields.city}
            onChange={set("city")}
            disabled={isSaving}
            className={fieldClass("city")}
            data-testid="ship-city"
          />
          {showErrors && validationErrors.city ? (
            <p className={errorTextClass} role="alert" data-testid="ship-city-error">
              {validationErrors.city}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ship-state" className={labelClass}>
            State / province <span className="text-[color:var(--mk-danger)]">*</span>
          </label>
          <input
            id="ship-state"
            type="text"
            autoComplete="address-level1"
            value={fields.stateOrProvince}
            onChange={set("stateOrProvince")}
            disabled={isSaving}
            className={fieldClass("stateOrProvince")}
            data-testid="ship-state"
          />
          {showErrors && validationErrors.stateOrProvince ? (
            <p className={errorTextClass} role="alert" data-testid="ship-state-error">
              {validationErrors.stateOrProvince}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ship-postal" className={labelClass}>
            Postal code <span className="text-[color:var(--mk-danger)]">*</span>
          </label>
          <input
            id="ship-postal"
            type="text"
            autoComplete="postal-code"
            value={fields.postalCode}
            onChange={set("postalCode")}
            disabled={isSaving}
            className={fieldClass("postalCode")}
            data-testid="ship-postal"
          />
          {showErrors && validationErrors.postalCode ? (
            <p className={errorTextClass} role="alert" data-testid="ship-postal-error">
              {validationErrors.postalCode}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ship-country" className={labelClass}>
            Country <span className="text-[color:var(--mk-danger)]">*</span>
          </label>
          <select
            id="ship-country"
            autoComplete="country"
            value={fields.countryCode}
            onChange={set("countryCode")}
            disabled={isSaving}
            className={fieldClass("countryCode")}
            data-testid="ship-country"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="JP">Japan</option>
            <option value="NL">Netherlands</option>
            <option value="NZ">New Zealand</option>
            <option value="SE">Sweden</option>
            <option value="CH">Switzerland</option>
          </select>
          {showErrors && validationErrors.countryCode ? (
            <p className={errorTextClass} role="alert" data-testid="ship-country-error">
              {validationErrors.countryCode}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-3 text-sm text-[color:var(--mk-danger)]"
          role="alert"
          data-testid="shipping-address-form-error"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="mk-cta inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="ship-save-btn"
      >
        {isSaving ? "Saving…" : "Save shipping address"}
      </button>
    </form>
  )
}