export const CMS_PAGE_CATEGORIES = ["MARKETING", "POLICY"] as const
export const CMS_REVISION_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const

export type CmsPageCategory = typeof CMS_PAGE_CATEGORIES[number]
export type CmsRevisionStatus = typeof CMS_REVISION_STATUSES[number]

export type CmsRevision = {
  id: string
  status: string
  contentMarkdown: string
  contentHtml: string | null
  editorUserId: string
  publishedByUserId: string | null
  changeSummary: string | null
  createdAt: string
  publishedAt: string | null
  effectiveAt: string | null
}

export type AdminCmsPageListItem = {
  id: string
  slug: string
  title: string
  category: string
  isActive: boolean
  updatedAt: string
  publishedAt: string | null
  publishedRevisionId: string | null
}

export type AdminCmsPageDetail = {
  id: string
  slug: string
  title: string
  category: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  revisions: CmsRevision[]
}

export type UpsertDraftRequest = {
  contentMarkdown: string
  changeSummary?: string | null
}

export type UpsertDraftResponse = {
  revisionId: string
}

export type PublishRevisionRequest = {
  revisionId: string
  effectiveAt?: string | null
}