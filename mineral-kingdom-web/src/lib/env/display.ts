function normalizeEnvironment(raw: string | undefined): string {
  const value = raw?.trim().toLowerCase()

  switch (value) {
    case "local":
      return "Local"
    case "development":
    case "dev":
      return "Development"
    case "test":
    case "testing":
      return "Test"
    case "stage":
    case "staging":
      return "Staging"
    case "prod":
    case "production":
      return "Production"
    default:
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown"
  }
}

export function getEnvironmentLabel() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV
  const nodeEnv = process.env.NODE_ENV

  if (appEnv) {
    return normalizeEnvironment(appEnv)
  }

  if (nodeEnv === "development") {
    return "Local"
  }

  return normalizeEnvironment(nodeEnv)
}