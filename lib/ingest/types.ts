export type NormalizedJob = {
  source: string
  sourceId: string
  companyName: string
  companyDomain?: string
  companyWebsite?: string
  title: string
  description?: string
  stack?: string[]
  employmentType?: string
  remote?: boolean
  location?: string
  salaryText?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  url?: string
  applyUrl?: string
  contactEmail?: string
  postedAt?: Date
}

export type SourceResult = {
  source: string
  jobs: NormalizedJob[]
  error?: string
}

export type IngestSummary = {
  bySource: { source: string; fetched: number; error?: string }[]
  companies: number
  jobsCreated: number
  jobsUpdated: number
  jobsSkipped: number
  duplicatesRemoved: number
  contacts: number
  withEmail: number
  withSalary: number
}
