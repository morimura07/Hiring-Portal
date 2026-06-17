// Greenhouse & Lever are ATS boards keyed by a company "token". You discover jobs
// per company, so we keep a curated list (all confirmed to return jobs). Extend it
// here, or via env:
//   GREENHOUSE_BOARDS="stripe,ramp,vercel"   LEVER_BOARDS="leadiq,kandji"
// Invalid/empty tokens are skipped gracefully during ingest.

export type Board = { token: string; name: string }

const DEFAULT_GREENHOUSE: Board[] = [
  { token: "stripe", name: "Stripe" },
  { token: "databricks", name: "Databricks" },
  { token: "brex", name: "Brex" },
  { token: "samsara", name: "Samsara" },
  { token: "robinhood", name: "Robinhood" },
  { token: "coinbase", name: "Coinbase" },
  { token: "instacart", name: "Instacart" },
  { token: "discord", name: "Discord" },
  { token: "dropbox", name: "Dropbox" },
  { token: "cloudflare", name: "Cloudflare" },
  { token: "datadog", name: "Datadog" },
  { token: "gitlab", name: "GitLab" },
  { token: "airbnb", name: "Airbnb" },
  { token: "lyft", name: "Lyft" },
  { token: "pinterest", name: "Pinterest" },
  { token: "reddit", name: "Reddit" },
  { token: "twitch", name: "Twitch" },
  { token: "asana", name: "Asana" },
  { token: "figma", name: "Figma" },
  { token: "airtable", name: "Airtable" },
  { token: "gusto", name: "Gusto" },
  { token: "checkr", name: "Checkr" },
  { token: "flexport", name: "Flexport" },
  { token: "faire", name: "Faire" },
  { token: "sofi", name: "SoFi" },
  { token: "affirm", name: "Affirm" },
  { token: "chime", name: "Chime" },
  { token: "marqeta", name: "Marqeta" },
  { token: "betterment", name: "Betterment" },
  { token: "calm", name: "Calm" },
  { token: "peloton", name: "Peloton" },
  { token: "scaleai", name: "Scale AI" },
  { token: "anthropic", name: "Anthropic" },
  { token: "planetscale", name: "PlanetScale" },
  { token: "clickhouse", name: "ClickHouse" },
  { token: "cockroachlabs", name: "Cockroach Labs" },
  { token: "elastic", name: "Elastic" },
  { token: "launchdarkly", name: "LaunchDarkly" },
  { token: "postman", name: "Postman" },
  { token: "calendly", name: "Calendly" },
  { token: "fivetran", name: "Fivetran" },
  { token: "hightouch", name: "Hightouch" },
  { token: "temporaltechnologies", name: "Temporal" },
  { token: "webflow", name: "Webflow" },
  { token: "squarespace", name: "Squarespace" },
  { token: "gocardless", name: "GoCardless" },
  { token: "adyen", name: "Adyen" },
  { token: "mongodb", name: "MongoDB" },
  { token: "vercel", name: "Vercel" },
  { token: "mixpanel", name: "Mixpanel" },
  { token: "amplitude", name: "Amplitude" },
  { token: "twilio", name: "Twilio" },
  { token: "okta", name: "Okta" },
  { token: "dashlane", name: "Dashlane" },
  { token: "block", name: "Block" },
  { token: "monzo", name: "Monzo" },
  { token: "justworks", name: "Justworks" },
  { token: "remote", name: "Remote.com" },
  { token: "mercury", name: "Mercury" },
  { token: "highnote", name: "Highnote" },
  { token: "lithic", name: "Lithic" },
]

const DEFAULT_LEVER: Board[] = [
  { token: "highspot", name: "Highspot" },
  { token: "spotify", name: "Spotify" },
  { token: "palantir", name: "Palantir" },
  { token: "ro", name: "Ro" },
  { token: "gopuff", name: "Gopuff" },
  { token: "matchgroup", name: "Match Group" },
]

function fromEnv(envVar: string): Board[] {
  const raw = process.env[envVar]
  if (!raw) return []
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token) => ({ token, name: token.charAt(0).toUpperCase() + token.slice(1) }))
}

export function greenhouseBoards(): Board[] {
  return dedupe([...DEFAULT_GREENHOUSE, ...fromEnv("GREENHOUSE_BOARDS")])
}

export function leverBoards(): Board[] {
  return dedupe([...DEFAULT_LEVER, ...fromEnv("LEVER_BOARDS")])
}

function dedupe(boards: Board[]): Board[] {
  const seen = new Set<string>()
  return boards.filter((b) => (seen.has(b.token) ? false : (seen.add(b.token), true)))
}
