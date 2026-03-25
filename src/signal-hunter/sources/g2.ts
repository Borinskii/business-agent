/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import puppeteer from 'puppeteer'
import { supabase, log } from '../../lib/supabase'

export async function scanG2Reviews(productSlug: string) {
  log(`[g2-scraper] Scanning negative reviews for ${productSlug}...`)
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    // Bypass simple bot detections
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // G2 URL for 1, 2, 3 star reviews, sorted by recent
    const url = `https://www.g2.com/products/${productSlug}/reviews?utf8=%E2%9C%93&filters%5Bstar_rating%5D%5B%5D=1&filters%5Bstar_rating%5D%5B%5D=2&filters%5Bstar_rating%5D%5B%5D=3&order=recent`
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Wait for reviews to load, ignore if Cloudflare blocks or timeout
    await page.waitForSelector('.paper', { timeout: 10000 }).catch(() => null)
    
    const reviews = await page.evaluate(() => {
      // @ts-ignore
      const items = Array.from(document.querySelectorAll('.paper:-webkit-any(.box, .c-midnight-80)')) as any[]
      return items.map((el: any) => {
        const reviewerText = el.querySelector('.tw-text-body-x-small:not(.c-midnight-80)')?.textContent?.trim() || ''
        const title = el.querySelector('h3')?.textContent?.trim() || ''
        const dateStr = el.querySelector('time')?.getAttribute('datetime') || new Date().toISOString()
        
        let reviewer_company_name = null
        if (reviewerText.includes(' at ')) {
          reviewer_company_name = reviewerText.split(' at ')[1]?.replace(/ *\([^)]*\) */g, '').trim()
        }

        return {
          reviewer_company_name,
          title,
          rating: 1, 
          date: dateStr
        }
      }).filter(r => r.reviewer_company_name && !r.reviewer_company_name.toLowerCase().includes('enterprise'))
    })

    log(`[g2-scraper] Found ${reviews.length} actionable negative reviews for ${productSlug}.`)
    
    for (const review of reviews) {
      if (!review.reviewer_company_name) continue
      
      const domainMock = review.reviewer_company_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
      
      // Upsert logic
      const { data: co } = await supabase.from('companies').select('id').eq('domain', domainMock).single()
      
      let companyId = co?.id
      if (!companyId) {
        const { data: newCo } = await supabase.from('companies').insert({
          name: review.reviewer_company_name,
          domain: domainMock,
          status: 'detected',
          sdr_count: 1,
          pain_score: 0
        }).select('id').single()
        companyId = newCo?.id
      }
      
      if (companyId) {
        // Prevent dupes for the exact same review title
        const { count } = await supabase.from('signals').select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('type', 'g2_negative_review')
        
        if (count === 0) {
          await supabase.from('signals').insert({
            company_id: companyId,
            type: 'g2_negative_review',
            detail: `Unhappy with ${productSlug}: "${review.title.slice(0, 100)}"`,
            source: 'g2',
            source_url: url,
            raw_data: review,
            pain_points: 40
          })
          log(`[g2-scraper] Added G2 signal for ${domainMock} (-40 points).`)
        }
      }
    }
    
  } catch (error: any) {
    log(`[g2-scraper] Error: ${error.message}`)
  } finally {
    await browser.close()
  }
}