// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type CompanyStatus =
  | 'detected'
  | 'profiled'
  | 'content_generated'
  | 'outreach_sent'
  | 'page_opened'
  | 'responded'
  | 'pilot_running'
  | 'pilot_results_ready'
  | 'demo_booked'
  | 'dnc_blocked'

export type SignalType =
  | 'hiring_sdrs'
  | 'funding'
  | 'sdr_churn'
  | 'g2_negative_review'
  | 'competitor_ai_adoption'

export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed'

export type SequenceType   = 'outreach' | 'pilot'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'failed'

export type PilotStatus = 'pending' | 'running' | 'completed' | 'failed'

export type FrankIntent =
  | 'pricing_question'
  | 'demo_request'
  | 'positive_intent'
  | 'info_request'
  | 'pilot_request'
  | 'unsubscribe'
  | 'other'

export type FrankReplyStatus = 'draft' | 'sent' | 'failed'

// ─── CORE ENTITIES ────────────────────────────────────────────────────────────

export interface DecisionMaker {
  name: string
  title: string
  email: string
  linkedin_url: string | null
}

export interface Signal {
  id: string
  company_id: string
  type: SignalType
  detail: string
  source: string
  source_url: string | null
  raw_data: Record<string, unknown>
  pain_points: number
  detected_at: string
}

export interface Company {
  id: string
  name: string
  domain: string
  logo_url: string | null
  industry: string | null
  size: number | null
  location: string | null
  icp: string | null
  acv_estimate: number | null
  sdr_count: number
  pain_score: number
  decision_maker: DecisionMaker | null
  tech_stack: string[]
  competitor_using_ai: string | null
  monthly_loss_estimate: number | null
  salesforce_contact_id: string | null
  status: CompanyStatus
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  company_id: string
  pdf_url: string | null
  video_url: string | null
  personal_page_slug: string
  personal_page_url: string
  win_card_url: string | null
  status: ReportStatus
  failure_reason: string | null
  video_provider: 'sora' | 'heygen' | 'skipped' | null
  video_script: unknown | null
  generated_at: string | null
  created_at: string
}

export interface Sequence {
  id: string
  company_id: string
  workspace_id: string
  salesforge_sequence_id: string
  type: SequenceType
  status: SequenceStatus
  nodes_count: number
  created_at: string
  updated_at: string
}

export interface Pilot {
  id: string
  company_id: string
  workspace_id: string
  sequence_id: string
  icp_description: string
  contacts_count: number
  contacts_reached: number
  open_rate: number | null
  positive_replies: number
  reply_rate: number | null
  demos_booked: number
  live_conversations: LiveConversation[]
  status: PilotStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface LiveConversation {
  prospect_name: string
  company: string
  reply_preview: string
}

export interface FrankReply {
  id: string
  company_id: string | null
  thread_id: string
  mailbox_id: string
  email_id: string
  incoming_text: string
  intent: FrankIntent
  reply_text: string
  sent_at: string | null
  status: FrankReplyStatus
  created_at: string
}

// ─── API RESPONSES ────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  company: Company
  enrichment_score: number
  missing_fields: string[]
}

export interface PilotResults {
  contacts_reached: number
  open_rate: number
  positive_replies: number
  reply_rate: number
  demos_booked: number
  live_conversations: LiveConversation[]
}
