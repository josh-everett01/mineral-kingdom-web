const AUTH_EXPIRED_EVENT = "mk:auth-expired"

declare global {
  interface WindowEventMap {
    "mk:auth-expired": CustomEvent<{ message?: string }>
  }
}

export function emitAuthExpired(message?: string) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { message },
    }),
  )
}

export function subscribeToAuthExpired(
  handler: (event: CustomEvent<{ message?: string }>) => void,
) {
  if (typeof window === "undefined") {
    return () => { }
  }

  const wrapped = (event: Event) => {
    handler(event as CustomEvent<{ message?: string }>)
  }

  window.addEventListener(AUTH_EXPIRED_EVENT, wrapped)

  return () => {
    window.removeEventListener(AUTH_EXPIRED_EVENT, wrapped)
  }
}