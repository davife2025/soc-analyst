# SOC Analyst — Demo Video Script
**Target length: 3–4 minutes**

---

## [0:00–0:20] Hook

**Visuals:** Dashboard loading, alert cards appearing live

**Narration:**
> "Every second, your Splunk instance fires hundreds of alerts. Most security teams manually triage each one — copy-pasting IPs into VirusTotal, running SPL queries, writing incident notes. That takes 20–40 minutes per alert.
> SOC Analyst does it in under 30 seconds, autonomously."

---

## [0:20–0:45] The Problem

**Visuals:** Static slide — alert fatigue stats

**Narration:**
> "Security teams are drowning in alert fatigue. 70% of alerts go uninvestigated. The ones that do get investigated take an average of 197 days to detect a breach.
> We built an autonomous agent that handles the entire investigation loop — from raw Splunk event to actionable finding — with a human in the loop only for destructive actions."

---

## [0:45–1:30] Live Demo — Alert Arrives

**Visuals:** Seed demo data, watch alerts appear on dashboard in real time

**Narration:**
> "We're connected to Splunk via a secure webhook. When an alert fires, it appears here instantly via Supabase Realtime."
>
> "Here — a critical alert: Mass File Encryption on a finance workstation. Entropy score 7.9. The agent picks it up immediately."
>
> "Watch the status change from 'new' to 'investigating' — the agent is running."

---

## [1:30–2:15] The Investigation

**Visuals:** Click into investigation detail page — show reasoning chain expanding

**Narration:**
> "This is the agent's reasoning chain. Every step logged, fully transparent."
>
> *Expand step 1:* "It analyzed the raw event — entropy 7.9, svchost.exe spawning from explorer, thousands of files modified."
>
> *Expand step 3:* "It searched Splunk for correlated events — found an authentication failure 8 minutes before encryption started."
>
> *Expand step 5:* "It correlated with a separate lateral movement alert on the same host — and connected the two incidents into one attack chain."
>
> "94% confidence. It mapped 7 MITRE ATT&CK stages — Initial Access through Impact — in one autonomous run."

---

## [2:15–2:40] Actions & Playbooks

**Visuals:** Action panel — show pending/approved/executed. Switch to playbooks page.

**Narration:**
> "The agent recommended 5 specific actions. Safe ones — ticket creation, team notification — were auto-executed by the playbook engine."
>
> "Destructive ones — host isolation, IP blocking — wait for human approval. One click approves."
>
> *Approve isolate_host:* "Done. That host is now isolated."
>
> "Playbooks define exactly what the agent can and can't do autonomously. Full control, no surprises."

---

## [2:40–3:00] Audit Trail & Security

**Visuals:** Audit log page, token management page

**Narration:**
> "Every agent decision, every analyst action — logged immutably. This is your compliance trail."
>
> "Webhook tokens are SHA-256 hashed. Role-based access control. Rate limiting on every endpoint. Production-ready security from day one."

---

## [3:00–3:20] Architecture

**Visuals:** Architecture diagram from README

**Narration:**
> "The stack: Kimi K2 via Hugging Face Inference API for the reasoning loop. Supabase for real-time state. Next.js on Vercel, agent worker on Render. Everything in a pnpm monorepo with shared types end-to-end."
>
> "Kimi K2's native tool-use capabilities are what make this possible — multi-step investigation with parallel threat intel lookups and Splunk correlation."

---

## [3:20–3:40] Close

**Visuals:** Dashboard with all 8 alerts — stats showing critical/new/investigating counts

**Narration:**
> "SOC Analyst doesn't replace your security team. It gives them superpowers — letting them focus on decisions, not data gathering."
>
> "Every alert investigated. Every attack chain mapped. Every action logged. Automatically."
>
> "This is what autonomous security operations looks like."

---

## Recording Notes
- Record at 1080p minimum
- Use the seeded demo data (8 pre-built alerts)
- Show the ransomware investigation — it has the richest reasoning chain
- Approve the `isolate_host` action live for maximum impact
- Keep browser zoom at 100% — UI is designed for that
- Total runtime: aim for 3:30
