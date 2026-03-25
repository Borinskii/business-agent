/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import React from 'react';
import './logo-ticker.css';
import { 
  Cloud, Box, Database, Hexagon, Triangle, Circle, 
  Layers, Package, Globe, Shield, Zap, Sparkles 
} from 'lucide-react';

const foregroundLogos = [
  { name: 'Salesforce', icon: Cloud },
  { name: 'HubSpot', icon: Circle },
  { name: 'Apollo.io', icon: Triangle },
  { name: 'ZoomInfo', icon: Database },
  { name: 'Outreach', icon: Box },
  { name: 'Gong', icon: Hexagon },
  { name: 'Stripe', icon: Layers },
  { name: 'Notion', icon: Box },
  { name: 'Webflow', icon: Triangle },
  { name: 'Zapier', icon: Zap },
  { name: 'Airtable', icon: Package },
  { name: 'OpenAI', icon: Sparkles },
];

const backgroundLogos = [
  { name: 'Anthropic', icon: Sparkles },
  { name: 'Perplexity', icon: Globe },
  { name: 'Scale AI', icon: Triangle },
  { name: 'Ramp', icon: Shield },
  { name: 'Brex', icon: Box },
  { name: 'Rippling', icon: Layers },
  { name: 'Deel', icon: Globe },
  { name: 'AWS', icon: Cloud },
  { name: 'Google Cloud', icon: Cloud },
  { name: 'Twilio', icon: Hexagon },
  { name: 'Snowflake', icon: Hexagon },
];

export function LogoTicker() {
  return (
    <section className="logo-ticker-section">
      <div className="logo-ticker-container">
        <h2 className="logo-ticker-headline">Built for modern sales & growth teams</h2>
        <p className="logo-ticker-subtitle">Used by teams at leading SaaS and AI companies</p>
      </div>

      <div className="ticker-mask">
        {/* Background Track (Slower, reversed, blurred, smaller) */}
        <div className="ticker-track track-background">
          {[...backgroundLogos, ...backgroundLogos, ...backgroundLogos].map((logo, index) => {
            const Icon = logo.icon;
            return (
              <div key={`bg-${index}`} className="logo-item">
                <Icon strokeWidth={1.5} />
                <span>{logo.name}</span>
              </div>
            );
          })}
        </div>

        {/* Foreground Track (Faster, larger, brighter) */}
        <div className="ticker-track track-foreground">
          {[...foregroundLogos, ...foregroundLogos, ...foregroundLogos].map((logo, index) => {
            const Icon = logo.icon;
            return (
              <div key={`fg-${index}`} className="logo-item">
                <Icon strokeWidth={1.5} />
                <span>{logo.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LogoTicker;