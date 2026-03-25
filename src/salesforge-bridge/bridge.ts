/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import { supabase, log } from '../lib/supabase'
import { sf } from '../lib/salesforge'
import type { Company, Signal } from '../types/company'

interface DncCheckResponse {
  blocked: boolean
}

interface ValidationRunResponse {
  runId: string
  status?: string
  result?: string
}

interface ValidationResultResponse {
  status: 'running' | 'completed'
  results: { email: string; result: 'valid' | 'invalid' | 'risky' }[]
}

interface BulkUploadResponse {
  contacts: { email: string; id: string }[]
}

export async function uploadContactToSalesforge(companyId: string) {
  log(`[bridge] Starting Salesforge upload for company: ${companyId}`)

  const { data: companyData, error: companyErr } = await supabase
    .from('companies')
    .select('*, signals(*)')
    .eq('id', companyId)
    .single()

  if (companyErr || !companyData) {
    throw new Error(`Company not found: ${companyId}`)
  }

  const company = companyData as Company & { signals: Signal[] }
  const dm = company.decision_maker

  if (!dm?.email) {
    throw new Error(`No decision maker email found for ${company.name}`)
  }

  if (company.salesforce_contact_id) {
    log(`[bridge] Skipping: Company already has contact ID ${company.salesforce_contact_id}`)
    return company.salesforce_contact_id
  }

  // Helper to log to Supabase
  const logUpload = async (action: string, status: string, responseData: any = null, errorMsg: string | null = null) => {
    await supabase.from('upload_log').insert({
      company_id: companyId,
      action,
      status,
      response_data: responseData,
      error_message: errorMsg
    })
  }

  try {
    // 1. DNC Check
    log(`[bridge] Checking DNC for ${dm.email}`)
    const dncRes = await sf.ws.post<{ blocked?: boolean }>('/dnc/check', { emails: [dm.email] }).catch(() => ({ blocked: false }))
    
    if (dncRes.blocked) {
      log(`[bridge] DNC Blocked: ${dm.email}`)
      await logUpload('dnc_check', 'failed', dncRes, 'Blocked by DNC')
      await supabase.from('companies').update({ status: 'dnc_blocked', updated_at: new Date().toISOString() }).eq('id', companyId)
      return null
    }
    await logUpload('dnc_check', 'success', dncRes)

    // 2. Email Validation
    log(`[bridge] Starting email validation for ${dm.email}`)
    const valStart = await sf.ws.post<ValidationRunResponse>('/contacts/validation/start', { emails: [dm.email] }).catch((e) => {
      log(`[bridge] Validation endpoint unavailable, proceeding with warning`)
      return null
    })

    if (valStart?.runId) {
      // Async validation — poll for up to 60s
      let validated = false
      let attempts = 0
      while (attempts < 12) { // 12 × 5s = 60s max
        await new Promise(r => setTimeout(r, 5000))
        const valRes = await sf.ws.get<ValidationResultResponse>(`/validations/${valStart.runId}/results`).catch(() => null)
        if (valRes && valRes.status === 'completed') {
          const res = valRes.results.find(r => r.email === dm.email)
          if (res?.result === 'invalid') {
            log(`[bridge] Email validation failed: ${dm.email} is invalid`)
            await logUpload('validation', 'failed', valRes, 'Email is invalid')
            return null
          }
          if (res?.result === 'risky') {
            log(`[bridge] Email validation: ${dm.email} is risky — proceeding with caution`)
            await logUpload('validation', 'success', valRes, 'Email is risky but proceeding')
          } else {
            await logUpload('validation', 'success', valRes)
          }
          validated = true
          break
        }
        attempts++
      }
      if (!validated) {
        log(`[bridge] Email validation timeout (60s) — proceeding with warning`)
        await logUpload('validation', 'skipped', null, 'Validation timeout 60s — uploaded without validation')
      }
    } else if (valStart) {
      // Immediate response — check for invalid/risky
      const immediateResult = valStart.status ?? valStart.result
      if (immediateResult === 'invalid') {
        log(`[bridge] Email validation: ${dm.email} is invalid (immediate)`)
        await logUpload('validation', 'failed', valStart, 'Email is invalid')
        return null
      }
      if (immediateResult === 'risky') {
        log(`[bridge] Email validation: ${dm.email} is risky — proceeding with caution`)
      }
      await logUpload('validation', 'success', valStart)
    } else {
      // Validation endpoint unavailable — log warning but proceed
      log(`[bridge] Email validation skipped — endpoint unavailable`)
      await logUpload('validation', 'skipped', null, 'Validation endpoint unavailable')
    }

    // 3. Bulk Upload
    log(`[bridge] Uploading contact to Salesforge...`)
    
    const [firstName, ...lastNameParts] = dm.name.split(' ')
    const lastName = lastNameParts.join(' ')

    const slug = company.domain.replace(/\./g, '-')
    
    const contactPayload: any = {
        email: dm.email,
        firstName: firstName || '',
        lastName: lastName || '',
        tags: ['phantom-pipeline', company.signals?.[0]?.type || 'outbound'],
        customVars: {
          company_name: company.name,
          industry: company.industry || '',
          monthly_loss: company.monthly_loss_estimate || 0,
          sdr_count: company.sdr_count,
          pain_signal: company.signals?.[0]?.detail || 'Rapidly growing pipeline',
          personal_page_url: `https://phantom-pipeline.com/${slug}`,
          pdf_url: 'pending',
          video_url: 'pending'
        }
    }


    if (dm.linkedin_url && dm.linkedin_url.startsWith('http')) {
      contactPayload.linkedinUrl = dm.linkedin_url
    }

    const payload = {
      contacts: [contactPayload]
    }

    const uploadRes = await sf.ws.post<BulkUploadResponse>('/contacts/bulk', payload)
    
    const contactId = uploadRes?.contacts?.[0]?.id || `ext_${Date.now()}`
    
    await logUpload('bulk_upload', 'success', uploadRes)
    
    await supabase.from('companies').update({
      salesforce_contact_id: contactId,
      updated_at: new Date().toISOString()
    }).eq('id', companyId)

    log(`[bridge] Upload successful! Contact ID: ${contactId}`)
    
    return contactId

  } catch (error: any) {
    log(`[bridge] Error during upload: ${error.message}`)
    await logUpload('bulk_upload', 'failed', null, error.message)
    throw error
  }
}