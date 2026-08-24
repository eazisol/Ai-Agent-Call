# AI Receptionist SaaS — Master Project Specification

**Status:** Approved architecture and development roadmap  
**Methodology:** Vertical Slice / Feature-Based Incremental Development  
**Primary Stack:** Next.js, React, TypeScript, NestJS, PostgreSQL, Redis, S3-Compatible Storage, Docker  
**Initial Voice Agent Provider:** ElevenLabs  
**Initial Telephony Provider:** Twilio  
**Automation:** n8n  
**Future Providers:** Retell AI, OpenAI Realtime, Telnyx  
**Source of Truth:** Our NestJS backend + PostgreSQL + controlled object storage

---

## 1. Project Vision

We are building a scalable **multi-tenant AI Receptionist SaaS**. Businesses from different industries will be able to create and manage AI phone receptionists without needing to understand AI infrastructure.

Target industries include restaurants, salons, clinics, dental practices, real estate, law firms, insurance companies, landscaping companies, professional services and other service businesses.

A customer should be able to:

1. Register and create an organization.
2. Add one or more businesses.
3. Create an AI receptionist.
4. Configure personality, language, greeting and behavior.
5. Upload business-specific knowledge.
6. Select a voice or clone an approved custom voice.
7. Connect or provision a phone number.
8. Test and activate the agent.
9. Receive and later make calls.
10. Let the agent answer questions and perform business actions.
11. View calls, transcripts, summaries and outcomes.
12. Configure automations and integrations.
13. View analytics and usage.
14. Manage subscription and billing.

The product must support multiple providers without making the SaaS dependent on one vendor.

---

## 2. Core Principles

### 2.1 Our SaaS Owns the Product

Our backend, database and controlled file storage remain the source of truth.

Third-party services are providers, not the product.

### 2.2 Provider Independence

Provider-specific IDs are stored only as mappings.

### 2.3 Multi-Tenancy First

Tenant isolation is mandatory from the beginning.

### 2.4 Vertical Slice Development

One module must be completed end-to-end before the next module starts.

### 2.5 Business Knowledge Is Not Model Training

Business customization should use:

```text
Base AI Intelligence
+
Industry Template
+
Agent Instructions
+
Business Knowledge / RAG
+
Live Tools / APIs
```

### 2.6 Dynamic Information Uses APIs

Use RAG for relatively static information and tools/APIs for live data.

### 2.7 Preserve Existing Work

Continue from the current codebase. Do not restart from zero.

---

## 3. High-Level Architecture

```text
                         AI RECEPTIONIST SAAS
                                  │
             ┌────────────────────┼─────────────────────┐
             │                    │                     │
             ▼                    ▼                     ▼
      Marketing Website     Customer Portal       Admin Portal
          Next.js              Next.js              Next.js
             │                    │                     │
             └────────────────────┼─────────────────────┘
                                  ▼
                            NestJS Backend
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
     PostgreSQL                  Redis               Object Storage
   Source of Truth          Cache / Jobs / State      S3-Compatible
          │
          ▼
                    Provider Abstraction Layer
          ┌───────────────────────┴───────────────────────┐
          │                                               │
          ▼                                               ▼
  TelephonyProvider                               VoiceAgentProvider
          │                                               │
   ┌──────┴──────┐                        ┌───────────────┼──────────────┐
   │             │                        │               │              │
 Twilio       Telnyx                  ElevenLabs        Retell       OpenAI Custom
 Initial      Future                   Initial          Future          Future
```

Supporting services:

- n8n
- Email provider
- SMS/WhatsApp provider
- Stripe or another billing provider
- CRM, calendar and booking integrations

---

## 4. Complete Product Platform Ecosystem

The complete SaaS should be planned as a **platform ecosystem**, not only as one dashboard.

The long-term product can contain the following user-facing and internal platforms. Not all of them need to be separate applications from day one.

### Platform Summary

| # | Platform | Primary Users | Priority | Initial Deployment |
|---:|---|---|---|---|
| P1 | Marketing Website | Prospects / visitors | Commercial Launch | Same Next.js codebase initially |
| P2 | Customer / Business Portal | Business owners / managers / staff | MVP | Core Next.js SaaS app |
| P3 | Internal Admin Portal | Our admin / support / finance | Commercial Launch | Same Next.js codebase with admin routes initially |
| P4 | AI Agent Testing Studio / Playground | Business owners / implementation team | MVP | Inside Customer Portal initially |
| P5 | Developer / Integration Portal | Technical customers / partners | Future Scale | Separate portal when API program matures |
| P6 | Documentation / Help Center | Customers / developers / support | Commercial → Future | Docs/help site |
| P7 | Operations / Support Console | Internal operations / support / DevOps | Future Scale | Admin Portal initially, separate later |
| P8 | Partner / Reseller / White-Label Portal | Agencies / resellers / partners | Future Growth | Separate partner experience later |
| P9 | Public Status Page | All customers | Production Scale | Separate public status site |
| P10 | Business Mobile App | Owners / managers | Future | iOS / Android |
| P11 | Embeddable Web Voice / Chat Widget | End customers | Future Product Expansion | JS/React embed |
| P12 | Public Demo / Trial Sandbox | Prospects | Commercial Growth | Marketing-connected experience |

The recommended rule is:

> **Start with one Next.js application for public, customer and admin experiences where practical. Split platforms into separate applications only when scale, security, deployment cadence or team ownership justifies it.**

---

### P1 — Marketing Website

**Audience:** Prospective customers, business owners, decision-makers, partners.

**Purpose:**

- Explain the AI receptionist product
- Generate leads
- Convert visitors into trials/demos
- Showcase supported industries
- Demonstrate voices and call experience
- Explain pricing and integrations
- Publish case studies and trust content

Suggested information architecture:

```text
Home
Features
AI Receptionist
How It Works
Industries
├── Restaurants
├── Salons
├── Clinics
├── Dental
├── Real Estate
├── Law Firms
├── Insurance
├── Landscaping
└── Other Businesses

Voice Demo
Integrations
Pricing
Case Studies
Security / Trust
FAQ
Blog / Resources
About
Contact
Book Demo
Start Free Trial
Login
```

Future marketing capabilities:

- SEO landing pages
- Industry-specific templates
- Interactive ROI calculator
- Voice demo
- Live product demo
- Webinar/demo booking
- Testimonials
- Comparison pages
- Referral tracking
- Affiliate tracking

**Suggested domain:** `www.product.com`

**Priority:** Commercial Launch.

---

### P2 — Customer / Business Portal

This is the primary SaaS application.

**Audience:**

- Business owners
- Managers
- Authorized staff
- Organization administrators

Suggested navigation:

```text
Dashboard

Organizations / Workspace

Businesses
├── Business List
├── Business Profile
├── Business Hours
├── Languages
└── Settings

AI Agents
├── Agent List
├── Create Agent
├── Agent Builder
├── Personality
├── Instructions
├── Greeting
├── Escalation Rules
├── Voice
├── Knowledge
├── Tools
└── Testing

Knowledge
├── Files
├── URLs
├── Text / FAQs
├── Sync Status
└── Knowledge Gaps

Voices
├── Voice Library
├── Preview
├── Voice Cloning
└── Consent

Phone Numbers
├── Search
├── Buy / Provision
├── Import
├── Assign
└── Release

Calls
├── All Calls
├── Call Details
├── Transcripts
├── Recordings
├── Summaries
└── Analysis

Customers / CRM
├── Customer Profiles
├── Leads
├── Notes
├── History
└── Follow-ups

Appointments / Reservations

Tools / Integrations

Automations

Analytics

Team & Roles

Usage

Subscription

Billing

Notifications

Settings
```

The portal should eventually support:

- Multi-business organizations
- Multi-agent management
- Role-based permissions
- Provider status
- Agent health
- Usage limits
- Billing state
- Trial state
- Feature entitlements

**Suggested domain:** `app.product.com`

**Priority:** MVP + Commercial Launch.

---

### P3 — Internal Admin Portal

**Audience:** Our internal administrators, support, finance, operations and product team.

This portal must be clearly separated by authorization from customer functionality.

Core areas:

```text
Executive Dashboard

Organizations
Businesses
Users
Team Members

Agents
Voices
Voice Clones
Knowledge Bases
Prompts
Provider Mappings

Phone Numbers

Calls
├── All Calls
├── Failed Calls
├── Escalations
├── Transcripts
└── Recordings

Providers
├── ElevenLabs
├── Twilio
├── Retell
├── OpenAI
└── Telnyx

Plans
Subscriptions
Invoices
Usage
Revenue
MRR / ARR
Provider Costs
Gross Margin

System
├── Webhook Failures
├── Queues
├── Jobs
├── Database Health
├── Redis Health
├── Provider Health
└── Feature Flags

Security
Audit Logs

Support Tools
```

Admin support actions may include:

- View tenant configuration
- Resync provider agent
- Resync knowledge
- Retry failed webhook
- Enable/disable agent
- Fix provider mapping
- Review billing issue
- Review call failure
- Controlled account impersonation only if explicitly implemented with strict audit logs

**Suggested domain:** `admin.product.com`

**Priority:** Commercial Launch.

---

### P4 — AI Agent Testing Studio / Playground

This is a critical product feature and should exist **inside the Customer Portal first**.

Purpose:

Allow customers and our implementation team to test an agent before sending real customer traffic.

Capabilities:

```text
Select Agent
↓
Text Test
Voice Test
Test Phone Call
Knowledge Test
Tool Test
Transfer Test
Escalation Test
```

Suggested interface:

```text
Agent: Sophia
Business: Bella Restaurant
Voice: Emma

[Start Voice Test]
[Place Test Call]

Knowledge Test:
"What is your most expensive steak?"

Result:
"Ribeye — $42"

Source:
Menu.pdf

Tool Test:
checkAvailability(...)
Result:
Success
```

Advanced future testing:

- Simulated conversations
- Scenario library
- Regression test cases
- Expected answer validation
- Tool-call validation
- Prompt comparison
- Voice comparison
- Latency measurement
- Pre-publish checklist
- Agent version testing

**Priority:** MVP.

---

### P5 — Developer / Integration Portal

**Audience:**

- Technical customers
- Enterprise customers
- Integration partners
- Customer developers

Future capabilities:

```text
API Keys
API Documentation
SDKs
Webhook Endpoints
Webhook Secrets
Webhook Logs
API Usage
Rate Limits
OAuth Apps
Service Accounts
Integration Credentials
Sandbox Environment
Changelog
```

Potential APIs:

```text
Create Customer
Create Call
Create Agent
Read Call
Read Transcript
Create Booking
Update Knowledge
Trigger Automation
```

Potential events:

```text
CALL_STARTED
CALL_COMPLETED
CALL_FAILED
CALL_ANALYZED
BOOKING_CREATED
LEAD_CREATED
AGENT_ESCALATED
```

**Suggested domain:** `developers.product.com`

**Priority:** Future Scale.

---

### P6 — Documentation / Help Center

**Audience:**

- Customers
- Admins
- Developers
- Partners
- Support team

Content:

```text
Getting Started
Create Your First Business
Create Your First Agent
Upload Knowledge
Configure Voice
Clone Voice
Connect Twilio
Buy a Phone Number
Test Agent
Activate Agent
Call History
Analytics
Appointments
Reservations
Automations
Integrations
Team & Roles
Billing
Troubleshooting
Security
FAQ
API Documentation
Release Notes
```

Can also include:

- Video guides
- Screenshots
- Onboarding checklists
- Troubleshooting trees
- Integration tutorials
- Known issues

**Suggested domains:**

```text
help.product.com
docs.product.com
```

**Priority:** Basic help for launch; full platform later.

---

### P7 — Operations / Support Console

This is an internal operational platform.

Initially these capabilities can live inside Admin Portal.

Split it into a dedicated console when call volume and support load become significant.

Capabilities:

```text
Live Calls
Active Calls
Call Failures
Provider Incidents
Webhook Failures
Queue Health
Worker Health
Agent Sync Failures
Knowledge Sync Failures
Tool Failures
Latency Alerts
Cost Alerts
Security Alerts
Escalations
Incident Timeline
```

Potential live call view:

```text
Call ID
Tenant
Business
Agent
Provider
Duration
Current State
Latency
Tool Activity
Escalation State
```

**Suggested domain:** `ops.product.com`

**Priority:** Future Scale.

---

### P8 — Partner / Reseller / White-Label Portal

This becomes important if agencies, consultants, franchise groups or resellers sell AI receptionists to their own customers.

**Audience:**

- Agencies
- Resellers
- Channel partners
- Franchise operators
- White-label partners

Capabilities:

```text
Partner Dashboard
Customer Accounts
Sub-Organizations
Business Provisioning
Agent Provisioning
Usage
Wholesale Pricing
Revenue Share
Commissions
Invoices
Branding
Custom Domain
White-Label Settings
Support
Partner API
```

Potential hierarchy:

```text
Our SaaS
  ↓
Partner / Agency
  ↓
Customer Organizations
  ↓
Businesses
  ↓
Agents
```

Future white-label controls:

- Logo
- Brand colors
- Custom domain
- Email branding
- Customer-facing terminology
- Plan configuration
- Custom markup
- Partner support contacts

**Suggested domain:** `partners.product.com`

**Priority:** Future Growth.

---

### P9 — Public Status Page

Customers need a simple public place to check service health.

Components:

```text
API
Customer Portal
Admin Portal
Twilio Integration
ElevenLabs Integration
Calls
Knowledge Sync
Automations
Billing
```

Features:

- Current service status
- Incident history
- Scheduled maintenance
- Provider degradation
- Subscribe to incident updates

**Suggested domain:** `status.product.com`

**Priority:** Production Scale.

---

### P10 — Business Mobile App

A native mobile app is not required for MVP, but it may become valuable for owners/managers.

Potential features:

```text
Dashboard
Live Call Notifications
Call History
Transcript
Summary
Leads
Appointments
Reservations
Escalations
Agent On/Off
Quick Knowledge Update
Notifications
Usage
```

Possible stack:

- React Native / Expo
- Shared TypeScript models where practical

Avoid duplicating every desktop administration feature in mobile.

Mobile should focus on **monitoring and quick actions**.

**Priority:** Future.

---

### P11 — Embeddable Web Voice / Chat Widget

The platform may later expand beyond phone calls.

A business could place a widget on its website:

```text
[ Talk to our AI Assistant ]
```

Modes:

- Voice
- Chat
- Voice + Chat

Architecture:

```text
Business Website
      ↓
Embedded Widget
      ↓
Our SaaS
      ↓
Same Agent Knowledge + Tools
```

Benefits:

- Reuse same AI agent across phone + web
- More customer touchpoints
- Lead generation
- Support
- Appointment booking

Potential distribution:

```html
<script src="https://cdn.product.com/widget.js"></script>
```

**Priority:** Future Product Expansion.

---

### P12 — Public Demo / Trial Sandbox

This is a conversion-focused experience connected to the marketing website.

Prospects can test the product before full onboarding.

Possible flow:

```text
Select Industry
↓
Choose Demo Agent
↓
Talk by Browser Voice
or
Call Demo Number
↓
Experience AI Receptionist
↓
Start Trial
```

Demo industries:

- Restaurant
- Salon
- Clinic
- Real Estate
- General Receptionist

This should use isolated demo data and rate limits.

**Priority:** Commercial Growth.

---

### Recommended Platform Rollout

#### MVP

```text
P2 Customer Portal
P4 Testing Studio (inside P2)
```

Support-only admin functionality may be minimal during development.

#### Commercial Launch

```text
P1 Marketing Website
P2 Customer Portal
P3 Admin Portal
P4 Testing Studio
P6 Basic Help Center
```

#### Production Scale

```text
P7 Operations Console capability
P9 Public Status Page
```

#### Growth / Enterprise

```text
P5 Developer Portal
P8 Partner / Reseller Portal
P12 Public Demo Sandbox
```

#### Product Expansion

```text
P10 Mobile App
P11 Web Voice / Chat Widget
```

---

### Domain / Application Map

Possible long-term domain structure:

```text
www.product.com          → Marketing Website
app.product.com          → Customer Portal
admin.product.com        → Admin Portal
developers.product.com   → Developer Portal
help.product.com         → Help Center
docs.product.com         → Technical Documentation
ops.product.com          → Operations Console
partners.product.com     → Partner Portal
status.product.com       → Status Page
demo.product.com         → Public Demo Sandbox
api.product.com          → Public API
```

The Testing Studio can remain inside `app.product.com`.

The mobile app uses the same API/backend.

The embeddable widget can be served from a dedicated CDN/static domain.

---

### Shared Platform Architecture

All product surfaces should rely on the same controlled backend/domain model.

```text
                         PRODUCT ECOSYSTEM
                                  │
    ┌────────────┬────────────┬──────────────┬───────────────┐
    │            │            │              │               │
Marketing    Customer      Admin         Developer        Partner
Website       Portal       Portal          Portal          Portal
    │            │            │              │               │
    └────────────┴────────────┴──────────────┴───────────────┘
                                  │
                                  ▼
                             NestJS APIs
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
        PostgreSQL               Redis                 S3
            │
            ▼
                     Provider Abstraction
            │                              │
      TelephonyProvider              VoiceAgentProvider
            │                              │
          Twilio                       ElevenLabs
```

This prevents each portal from becoming a separate business system.


## 5. Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS / existing project design system

### Backend
- NestJS
- TypeScript
- REST APIs initially
- Webhooks
- WebSockets only where required

### Data
- PostgreSQL
- TypeORM initially
- Redis
- S3-compatible object storage

### External Providers
- Twilio — initial telephony
- ElevenLabs — initial voice agent
- n8n — asynchronous automation
- Retell — future voice provider
- OpenAI Realtime — future custom voice provider
- Telnyx — future telephony provider
- Stripe — likely future billing provider

### Delivery
- Docker
- GitHub
- Cursor
- Lovable
- ChatGPT Project + Work

---

## 6. Provider Abstraction

### TelephonyProvider

```ts
interface TelephonyProvider {
  searchNumbers(...args: unknown[]): Promise<unknown>;
  purchaseNumber(...args: unknown[]): Promise<unknown>;
  configureNumber(...args: unknown[]): Promise<unknown>;
  releaseNumber(...args: unknown[]): Promise<void>;
  getNumber(...args: unknown[]): Promise<unknown>;
  transferCall(...args: unknown[]): Promise<unknown>;
}
```

Implementations:

```text
TelephonyProvider
├── TwilioProvider      ← Initial
└── TelnyxProvider      ← Future
```

### VoiceAgentProvider

```ts
interface VoiceAgentProvider {
  createAgent(...args: unknown[]): Promise<unknown>;
  updateAgent(...args: unknown[]): Promise<unknown>;
  deleteAgent(...args: unknown[]): Promise<void>;
  getAgent(...args: unknown[]): Promise<unknown>;
  syncKnowledge(...args: unknown[]): Promise<unknown>;
  assignVoice(...args: unknown[]): Promise<unknown>;
}
```

Implementations:

```text
VoiceAgentProvider
├── ElevenLabsProvider     ← Initial
├── RetellProvider         ← Future
└── OpenAIRealtimeProvider ← Future
```

---

## 7. Data Ownership

Our SaaS owns:

- Organizations
- Users
- Memberships
- Roles
- Businesses
- Business settings
- Agents
- Agent configuration
- Provider mappings
- Original knowledge documents
- Knowledge metadata
- Customer records
- Phone-number mappings
- Integrations
- Important call records
- Important transcripts
- Summaries
- Usage
- Billing
- Subscription state
- Permissions
- Audit logs

Provider systems may hold provider-specific operational copies, but they are not our only source of truth.

---

## 8. Multi-Tenant Model

```text
Organization / Tenant
        │
        ├── Members
        │
        └── Businesses
              │
              ├── Agents
              ├── Knowledge
              ├── Phone Numbers
              ├── Calls
              ├── Customers
              ├── Integrations
              └── Analytics
```

Critical rule:

> Tenant A must never access Tenant B data.

Every relevant query must be scoped by organization/business ownership.

---

## 9. AI Agent Model

An AI receptionist consists of:

```text
Base Receptionist Behavior
+
Industry Template
+
Business Configuration
+
Personality
+
System Instructions
+
Knowledge
+
Voice
+
Tools
+
Escalation Rules
+
Telephony Mapping
```

Example:

```text
Agent: Sophia
Business: Bella Restaurant
Role: AI Receptionist
Language: English
Tone: Friendly and Professional
Greeting: "Thank you for calling Bella Restaurant..."
Knowledge: Menu + Prices + Policies + FAQ
Tools: Check availability + Create reservation
Voice: ElevenLabs voice
Phone Number: Twilio number
```

---

## 10. Knowledge Base / RAG

Knowledge sources may include:

- PDF
- DOCX
- URLs
- Text
- FAQs
- Menus
- Prices
- Policies
- Product/service information
- Opening hours

Flow:

```text
Customer Upload
      ↓
NestJS Backend
      ↓
Original Stored in S3
      ↓
knowledge_sources
      ↓
Sync to Provider KB
      ↓
Agent Uses RAG
```

Use RAG for:

- Menus
- Services
- General pricing
- Policies
- FAQs
- Product descriptions
- Instructions

Use tools/APIs for:

- Live availability
- Appointment slots
- Inventory
- Order status
- Current bookings
- Payment state
- CRM data
- Other live business state

---

## 11. Voice Strategy

Support:

- Voice library
- Voice preview
- Language/accent filtering
- Voice assignment
- Custom voice cloning where supported
- Voice consent
- Provider mapping

Suggested data:

```text
voice_configs
voice_clones
voice_consents
voice_samples
```

Provider voice IDs are mappings, not our business identity.

---

## 12. Telephony Strategy

Twilio initially handles:

- Phone numbers
- Incoming calls
- Outgoing calls
- Routing
- Status callbacks
- Telephony integration
- Number provisioning
- Number release
- Transfer where implemented

All telephony logic should eventually sit behind `TelephonyProvider`.

---

## 13. Call Lifecycle

Normalize provider-specific events into internal events:

```text
CALL_STARTED
CALL_CONNECTED
CALL_COMPLETED
CALL_FAILED
CALL_TRANSFERRED
TRANSCRIPT_UPDATED
CALL_ANALYZED
```

Inbound flow:

```text
Caller
  ↓
Twilio
  ↓
Resolve Number
  ↓
Resolve Tenant / Business / Agent
  ↓
ElevenLabs
  ↓
Knowledge + Tools
  ↓
Conversation
  ↓
Call Ends
  ↓
Provider Webhook
  ↓
NestJS
  ↓
PostgreSQL
  ↓
n8n
  ↓
Notifications / CRM / Analytics
```

---

## 14. Business Tools / Function Calling

Generic tool framework:

```text
Agent Tool
├── REST API
├── Booking
├── Calendar
├── CRM
├── Reservation
├── Payment
├── Email
├── SMS
└── Custom Webhook
```

Example appointment functions:

```text
checkSlots()
bookAppointment()
rescheduleAppointment()
cancelAppointment()
```

Example restaurant functions:

```text
checkAvailability()
createReservation()
cancelReservation()
getReservation()
```

---

## 15. Customer / CRM Memory

Store customer-specific memory separately from business knowledge.

Potential data:

- Name
- Phone
- Email
- Previous calls
- Previous bookings
- Preferences
- Notes
- Lead status
- VIP status
- Previous outcomes
- Follow-up status

---

## 16. Transcript and Agent Improvement

Do not automatically retrain from every transcript.

Preferred loop:

```text
Call
 ↓
Transcript
 ↓
Analysis
 ↓
Knowledge Gap
 ↓
Suggested Update
 ↓
Human Approval
 ↓
Knowledge Base Update
```

Three memory types:

### Business Memory
Products, menus, services, prices, policies, FAQs.

### Customer Memory
Customer history, preferences, bookings, CRM state.

### Improvement Memory
Failed questions, low-confidence answers, escalations, tool failures, repeated questions.

---

## 17. Automation

Use n8n outside the realtime voice loop.

Possible triggers:

```text
CALL_COMPLETED
CALL_FAILED
BOOKING_CREATED
BOOKING_CANCELLED
LEAD_CREATED
HIGH_VALUE_LEAD
FOLLOW_UP_REQUIRED
AGENT_ESCALATED
PAYMENT_COMPLETED
PAYMENT_FAILED
```

Possible actions:

- Email
- SMS
- WhatsApp
- Slack
- CRM
- Calendar
- Google Sheets
- Webhook
- Follow-up task
- Future outbound call

Future UI:

```text
WHEN:
Call Completed

IF:
Outcome = New Lead

THEN:
1. Create CRM Lead
2. Send SMS
3. Notify Sales Manager
```

---

## 18. Analytics

### Call Analytics
- Total calls
- Incoming/outgoing
- Answered/failed
- Average duration
- Total call minutes
- Peak hours

### Agent Analytics
- Resolution rate
- Escalation rate
- Tool success
- Knowledge failures
- Agent performance

### Business Analytics
- Leads
- Appointments
- Reservations
- Conversions
- Outcomes

### Cost Analytics
- Twilio cost
- ElevenLabs cost
- LLM cost
- Storage cost
- Cost per call
- Cost per minute
- Revenue per tenant
- Gross margin

---

## 19. Subscription Plans

Potential plans:

- Starter
- Professional
- Business
- Enterprise

Possible entitlements:

- Businesses
- Agents
- Included minutes
- Phone numbers
- Knowledge storage
- Voice clones
- Team members
- Analytics
- Integrations
- API access

---

## 20. Usage Metering

Track:

- Call minutes
- Number of calls
- Twilio usage
- ElevenLabs usage
- LLM usage
- Storage
- Knowledge usage
- Voice cloning
- Phone numbers
- API usage

Possible data model:

```text
usage_records
usage_aggregates
provider_usage_records
```

Usage must be reliable before usage-based billing.

---

## 21. Billing

Likely initial billing provider: Stripe.

Scope:

- Monthly subscriptions
- Annual subscriptions
- Trials
- Upgrade/downgrade
- Payment methods
- Invoices
- Usage overage
- Coupons/credits
- Failed payments
- Grace periods
- Refunds
- Enterprise invoicing

---

## 22. Admin Portal

Internal admin features:

### Customer Management
- Organizations
- Businesses
- Users
- Team members

### AI Management
- Agents
- Voices
- Knowledge
- Prompts
- Provider mappings

### Calls
- All calls
- Failed calls
- Transcripts
- Recordings
- Escalations

### Commercial
- Plans
- Subscriptions
- Usage
- Invoices
- Revenue
- Provider costs
- Margin

### Operations
- Twilio status
- ElevenLabs status
- Webhook failures
- Queues/jobs
- Knowledge sync failures
- Tool failures

### Support
- View customer configuration
- Resync agent
- Resync knowledge
- Retry failed webhook
- Enable/disable agent
- Audited support actions

---

## 23. Security, Audit and Monitoring

Required:

- Strong tenant isolation
- RBAC
- Secure password hashing
- Session/token security
- Rate limiting
- DTO/input validation
- Provider webhook signature verification
- Encryption in transit
- Secret management
- Storage permissions
- Provider credential protection
- Audit logs
- Voice-cloning consent
- Retention rules
- Data deletion
- Backups
- Principle of least privilege

Audit examples:

```text
USER_INVITED
ROLE_CHANGED
AGENT_CREATED
AGENT_UPDATED
PHONE_NUMBER_ASSIGNED
KNOWLEDGE_SYNCED
VOICE_CLONED
SUBSCRIPTION_CHANGED
ADMIN_SUPPORT_ACTION
```

---

## 24. Scalability Strategy

Start with a modular monolith.

Do not introduce microservices early.

Scale when needed:

```text
Load Balancer
      ↓
Multiple NestJS Instances
      ↓
Redis
      ↓
PostgreSQL
      ↓
Background Workers
```

ElevenLabs initially carries most realtime voice-agent processing.

At high call volume, add a custom OpenAI Realtime provider if cost/control justify it.

---

## 25. Existing Codebase Strategy

Continue from the existing repository.

Current useful work includes:

- NestJS backend
- Next.js frontend
- PostgreSQL
- Businesses
- Calls
- Twilio
- OpenAI Realtime
- Voice-stream/WebSocket
- n8n
- Docker
- Dashboard
- Calls pages
- Settings

Action plan:

| Current Area | Action |
|---|---|
| NestJS | Keep |
| Next.js | Keep |
| PostgreSQL | Keep |
| Docker | Keep and improve |
| Businesses | Keep and make tenant-aware |
| Calls | Keep and extend |
| Twilio | Keep; move behind provider abstraction |
| n8n | Keep |
| OpenAI Realtime | Preserve for future provider |
| Voice Stream | Preserve for future provider |
| Dashboard | Keep and redesign incrementally |
| Settings | Keep and extend |

Strategy:

```text
Existing Code
↓
Audit
↓
Controlled Refactor
↓
SaaS Foundation
↓
Vertical Slice Development
```

---

## 26. Development Methodology

Use Vertical Slice / Feature-Based Incremental Development.

For every module:

```text
Requirements
↓
Database
↓
Backend
↓
API
↓
Frontend
↓
Integration
↓
Validation
↓
Testing
↓
Manual QA
↓
Complete ✅
```

Do not build multiple half-finished modules.

---

## 27. Master Module Registry

| ID | Module | Phase | Target |
|---:|---|---|---|
| M0 | Existing Project Audit & SaaS Foundation | Foundation | MVP |
| M1 | Authentication | SaaS Core | MVP |
| M2 | Organizations / Tenants | SaaS Core | MVP |
| M3 | Users, Team & Roles | SaaS Core | MVP |
| M4 | Business Management | SaaS Core | MVP |
| M5 | AI Agent Management | AI Core | MVP |
| M6 | ElevenLabs Provider | AI Core | MVP |
| M7 | Knowledge Base | Knowledge | MVP |
| M8 | Voice Library | Voice | MVP |
| M9 | Voice Cloning | Voice | MVP/Premium |
| M10 | Twilio Provider | Telephony | MVP |
| M11 | Phone Number Management | Telephony | MVP |
| M12 | Incoming AI Calls | Calling | MVP |
| M13 | Outbound Calls | Calling | Post-MVP |
| M14 | Call Management | Calling | MVP |
| M15 | Transcript Management | Intelligence | MVP |
| M16 | Call Summary & Analysis | Intelligence | MVP |
| M17 | Generic Tool Framework | Business Tools | MVP |
| M18 | Appointment Booking | Business Tools | Industry |
| M19 | Restaurant Reservations | Business Tools | Industry |
| M20 | Customer / CRM | CRM | Commercial |
| M21 | Knowledge Gap Detection | Intelligence | Commercial |
| M22 | n8n Automation | Automation | Commercial |
| M23 | Notifications | Automation | Commercial |
| M24 | Analytics | Commercial | Commercial |
| M25 | Subscription Plans | Commercial | Commercial |
| M26 | Usage Metering | Commercial | Commercial |
| M27 | Billing | Commercial | Commercial |
| M28 | Admin Portal | Operations | Commercial |
| M29 | Security, Audit & Monitoring | Operations | Commercial |
| M30 | Retell Provider | Expansion | Future |
| M31 | OpenAI Realtime Provider | Expansion | Future |
| M32 | Telnyx Provider | Expansion | Future |
| M33 | Developer Portal | Platform | Future |
| M34 | Help Center | Platform | Future |
| M35 | Operations Console | Platform | Future |
| M36 | Partner / Reseller / White-Label Portal | Platform | Future |
| M37 | Public Status Page | Platform | Future |
| M38 | Business Mobile App | Platform | Future |
| M39 | Embeddable Web Voice / Chat Widget | Platform | Future |
| M40 | Public Demo / Trial Sandbox | Platform | Future |

---

# 28. Development Phases

## Phase 0 — Foundation

### M0 — Existing Project Audit & SaaS Foundation

Tasks:

- Create Git checkpoint
- Audit frontend/backend
- Preserve working functionality
- Prepare multi-tenant architecture
- Prepare provider abstraction folders/interfaces
- Establish database migrations
- Remove unsafe production dependence on `synchronize: true`
- Validate Docker
- Validate PostgreSQL
- Validate Redis
- Define object storage
- Add health checks
- Improve logging/error handling
- Document environment strategy

Definition of Done:

```text
Existing code preserved ✅
Backend builds ✅
Frontend builds ✅
Docker works ✅
PostgreSQL connected ✅
Redis connected ✅
Migrations ready ✅
Provider architecture prepared ✅
OpenAI work preserved ✅
Twilio work preserved ✅
Health checks working ✅
```

---

## Phase 1 — SaaS Core

### M1 — Authentication

Frontend:
- Register
- Login
- Logout
- Forgot password
- Reset password
- Verify email
- Protected routes

Backend:
- Auth services
- JWT/session strategy
- password hashing
- rate limiting
- validation

Database:
- users
- sessions/refresh tokens
- verification tokens
- reset tokens

### M2 — Organizations / Tenants

- Create organization
- Organization settings
- Membership
- Tenant isolation
- Workspace switching

### M3 — Users, Team & Roles

- Owner/Admin/Manager/Viewer
- Invitations
- Role changes
- Member removal
- RBAC

### M4 — Business Management

- Business CRUD
- Industry
- Contact info
- Business hours
- Timezone
- Language
- Status/settings

---

## Phase 2 — AI Agent Core

### M5 — AI Agent Management

- Create/update/archive agent
- Role
- Personality
- Greeting
- Instructions
- Language
- Escalation rules
- Activate/deactivate

### M6 — ElevenLabs Provider

Implement ElevenLabs behind `VoiceAgentProvider`.

- Create provider agent
- Update provider agent
- Delete
- Sync configuration
- Store provider mapping
- Provider status
- Retry/error handling

---

## Phase 3 — Knowledge & Voice

### M7 — Knowledge Base

- File upload
- URL
- Text
- FAQ
- S3 storage
- Provider sync
- Sync status
- Delete/resync

### M8 — Voice Library

- Voice listing
- Search/filter
- Preview
- Assign

### M9 — Voice Cloning

- Consent
- Upload/record
- Clone
- Processing status
- Preview
- Assign
- Audit

---

## Phase 4 — Telephony

### M10 — Twilio Provider

Implement Twilio behind `TelephonyProvider`.

### M11 — Phone Number Management

- Search
- Purchase
- Import
- Assign to agent
- Unassign
- Release
- Status

---

## Phase 5 — AI Calling MVP

### M12 — Incoming Calls

Real call flow:

```text
Customer
↓
Twilio
↓
Correct Business/Agent
↓
ElevenLabs
↓
Knowledge + Tools
↓
Natural Conversation
↓
Call Event Sync
```

### M13 — Outbound Calls

Later:

- Manual call
- Callback
- Reminder
- Follow-up
- Campaign foundation

### M14 — Call Management

- History
- Status
- Duration
- Caller
- Agent
- Business
- Provider
- Filters/detail

### M15 — Transcripts

- Speaker separation
- Timeline
- Full transcript
- Search

### M16 — Summary & Analysis

- Summary
- Intent
- Outcome
- Sentiment
- Resolution
- Follow-up
- Lead status

---

## Phase 6 — Business Tools

### M17 — Generic Tool Framework

Tables:

```text
tools
agent_tools
tool_executions
```

Capabilities:

- Define tool
- Assign agent
- Execute securely
- Validate
- Log
- Timeout
- Error handling

### M18 — Appointment Booking

```text
checkSlots
bookAppointment
rescheduleAppointment
cancelAppointment
```

### M19 — Restaurant Reservations

```text
checkAvailability
createReservation
cancelReservation
getReservation
```

---

## Phase 7 — CRM & Intelligence

### M20 — Customer / CRM

- Customer profiles
- Previous calls
- Preferences
- Notes
- Leads
- Previous bookings
- Follow-up state

### M21 — Knowledge Gap Detection

```text
Transcript
↓
Missing / Weak Answer
↓
Suggestion
↓
Human Approval
↓
Knowledge Update
```

---

## Phase 8 — Automation

### M22 — n8n

Post-call and asynchronous workflows.

### M23 — Notifications

- In-app
- Email
- SMS
- Escalations
- Booking/lead alerts
- Failure alerts

---

## Phase 9 — Commercial SaaS

### M24 — Analytics
### M25 — Subscription Plans
### M26 — Usage Metering
### M27 — Billing

---

## Phase 10 — Admin & Production

### M28 — Admin Portal
### M29 — Security, Audit & Monitoring

---

## Phase 11 — Multi-Provider Future

### M30 — Retell Provider
### M31 — OpenAI Realtime Provider
### M32 — Telnyx Provider

---

## Phase 12 — Platform Expansion

### M33 — Developer Portal
### M34 — Help Center
### M35 — Operations Console
### M36 — Partner / Reseller / White-Label Portal
### M37 — Public Status Page
### M38 — Business Mobile App
### M39 — Embeddable Web Voice / Chat Widget
### M40 — Public Demo / Trial Sandbox

---

# 29. Commercial MVP Boundary

The product becomes market-testable when this journey works reliably:

```text
Register
↓
Login
↓
Create Organization
↓
Create Business
↓
Create AI Agent
↓
Sync ElevenLabs Agent
↓
Upload Knowledge
↓
Select / Clone Voice
↓
Connect Twilio Number
↓
Test Agent
↓
Activate
↓
Receive Real Call
↓
Agent Answers Correctly
↓
Call Ends
↓
Call History Updated
↓
Transcript Available
↓
Summary Available
```

Recommended MVP scope:

```text
M0–M12
M14–M17
```

Add M18 or M19 depending on the first target industry.

---

# 30. Database Domain Model

High-level target tables/entities:

```text
users
organizations
organization_members
invitations

businesses
business_settings
business_hours

agents
agent_configs
agent_prompts
agent_provider_mappings

knowledge_bases
knowledge_sources
knowledge_sync_logs

voices
voice_configs
voice_clones
voice_consents
voice_samples

phone_numbers
phone_number_assignments

calls
call_events
call_messages
call_recordings
call_analysis

customers
customer_notes
customer_preferences

tools
agent_tools
tool_executions

integrations
integration_credentials

automations
automation_runs

notifications

plans
plan_features
subscriptions
subscription_items

usage_records
usage_aggregates
provider_usage_records

invoices
billing_events

audit_logs
provider_logs
system_events
```

Use migrations for schema changes.

---

# 31. API Design Guidelines

Version APIs:

```text
/api/v1/auth
/api/v1/organizations
/api/v1/businesses
/api/v1/agents
/api/v1/knowledge
/api/v1/voices
/api/v1/phone-numbers
/api/v1/calls
/api/v1/customers
/api/v1/tools
/api/v1/automations
/api/v1/analytics
/api/v1/billing
```

Provider webhooks:

```text
/api/v1/webhooks/twilio
/api/v1/webhooks/elevenlabs
/api/v1/webhooks/stripe
```

Rules:

- DTO validation
- tenant authorization
- pagination
- filtering
- idempotency where needed
- webhook verification
- consistent errors
- API versioning

---

# 32. Background Jobs and Events

Use jobs for:

- Knowledge sync
- Transcript processing
- Call analysis
- Analytics aggregation
- Notifications
- Provider retry
- Usage aggregation
- Billing reconciliation
- Webhook retries

Internal events should be provider-neutral:

```text
AGENT_CREATED
AGENT_SYNC_REQUESTED
KNOWLEDGE_UPDATED
KNOWLEDGE_SYNCED
CALL_COMPLETED
CALL_ANALYZED
BOOKING_CREATED
SUBSCRIPTION_UPDATED
```

---

# 33. Frontend Architecture

Initially use one Next.js codebase with route groups.

```text
src/app/

(public)/
├── page.tsx
├── features/
├── pricing/
└── contact/

(auth)/
├── login/
├── register/
└── forgot-password/

(portal)/
├── dashboard/
├── businesses/
├── agents/
├── knowledge/
├── voices/
├── phone-numbers/
├── calls/
├── customers/
├── automations/
├── analytics/
├── billing/
└── settings/

(admin)/
├── organizations/
├── businesses/
├── users/
├── agents/
├── providers/
├── calls/
├── usage/
├── billing/
└── system/
```

Split Admin into a separate app only when needed.

---

# 34. Backend Architecture

Target conceptual structure:

```text
src/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── utils/
├── config/
├── database/
├── infrastructure/
│   ├── redis/
│   ├── storage/
│   └── queues/
├── providers/
│   ├── telephony/
│   │   ├── interfaces/
│   │   ├── twilio/
│   │   └── telnyx/
│   └── voice-agent/
│       ├── interfaces/
│       ├── elevenlabs/
│       ├── retell/
│       └── openai-realtime/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── businesses/
│   ├── agents/
│   ├── knowledge/
│   ├── voices/
│   ├── phone-numbers/
│   ├── calls/
│   ├── customers/
│   ├── tools/
│   ├── automation/
│   ├── analytics/
│   ├── subscriptions/
│   ├── usage/
│   ├── billing/
│   └── admin/
└── main.ts
```

Refactor incrementally, not all at once.

---

# 35. ChatGPT Work Responsibilities

ChatGPT Work is the planning and documentation center.

Maintain:

- Master PRD
- Architecture decisions
- Module registry
- Dependency map
- Database architecture
- API registry
- Provider registry
- Risk register
- Development roadmap
- Cursor implementation briefs
- Lovable UI briefs

Suggested module statuses:

```text
Not Started
Planning
Ready for Development
In Development
Testing
Blocked
Completed
```

---

# 36. Cursor Responsibilities

Cursor is the primary engineering environment.

Use Cursor for:

- NestJS
- PostgreSQL
- migrations
- auth/RBAC
- provider integrations
- Redis
- S3
- tests
- frontend integration
- refactoring
- code review

Every module brief should include:

1. Objective
2. Existing files affected
3. Files to create
4. Files to modify
5. DB changes
6. Migration
7. APIs
8. DTOs
9. Validation
10. Authorization
11. Services
12. Provider integration
13. Frontend
14. Error states
15. Tests
16. Acceptance criteria
17. Definition of Done
18. Out-of-scope

---

# 37. Lovable Responsibilities

Lovable is the UI/UX accelerator.

Use it for:

- Page design
- Dashboard layouts
- Forms
- Wizards
- Responsive UI
- Empty states
- Loading states
- Error states
- Confirmation states
- Reusable visual components

Do not let Lovable:

- create a new backend
- introduce Supabase
- create a separate DB
- replace NestJS
- replace PostgreSQL
- redesign provider architecture
- build the whole SaaS in one prompt

Workflow:

```text
Work Requirements
↓
Lovable UI
↓
Cursor Integration
↓
Real API Connection
↓
QA
```

---

# 38. Git Strategy

Create a checkpoint before architecture refactor:

```bash
git status
git add .
git commit -m "chore: checkpoint existing AI call agent implementation"
git checkout -b feature/saas-foundation
```

Suggested branches:

```text
feature/authentication
feature/organizations
feature/business-management
feature/agents
feature/elevenlabs-provider
feature/knowledge-base
feature/voice-cloning
feature/twilio-provider
feature/inbound-calls
fix/*
chore/*
```

---

# 39. Testing Strategy

### Unit
- Services
- utilities
- permission logic
- transformations

### Integration
- database
- APIs
- provider integration
- webhooks

### End-to-End

Authentication:

```text
Register
→ Verify
→ Login
→ Protected Route
→ Logout
```

Calling:

```text
Assign Number
→ Make Real Call
→ Agent Answers
→ Ask Business Question
→ End Call
→ Call Stored
→ Transcript Stored
→ Summary Stored
```

### Manual QA
- responsive behavior
- empty states
- validation
- error handling
- retry behavior
- tenant boundaries
- role boundaries

---

# 40. Definition of Done

Every module must pass:

1. Requirements finalized
2. User stories defined
3. Acceptance criteria defined
4. Database migration complete where needed
5. Entities/models complete
6. Backend service complete
7. APIs complete
8. Validation complete
9. Auth/authorization complete
10. Frontend UI complete
11. Frontend API integration complete
12. Loading states complete
13. Empty states complete
14. Error states complete
15. Unit tests complete
16. Integration tests complete
17. E2E tests complete
18. Manual QA complete
19. Security review complete
20. Documentation updated
21. No unrelated future work added
22. Module accepted ✅

---

# 41. Risks and Mitigation

### Provider Lock-In
Mitigation: provider abstractions + canonical data internally.

### Data Ownership
Mitigation: keep original files and core records in our systems.

### Tenant Leakage
Mitigation: strict organization scoping, guards and tests.

### Voice Consent
Mitigation: explicit consent workflow and audit trail.

### Provider Outage
Mitigation: monitoring first, fallback provider later.

### Cost Growth
Mitigation: usage metering, cost analytics and future custom provider.

### Over-Engineering
Mitigation: strict MVP boundary and vertical slices.

### Stale Knowledge
Mitigation: sync state + live tools for dynamic data.

### Blind Transcript Learning
Mitigation: human-approved knowledge improvement loop.

---

# 42. Deployment Environments

Use:

```text
Local
Development
Staging
Production
```

Keep separate:

- configuration
- secrets
- database
- provider keys where practical

Production should include:

- HTTPS
- domain
- reliable PostgreSQL
- Redis
- object storage
- backups
- monitoring
- secret management
- health checks
- migrations

---

# 43. Observability and Cost Control

Monitor:

- API errors
- Webhook failures
- Provider failures
- Call failures
- Knowledge sync errors
- Tool execution errors
- Queue health
- Redis health
- DB health
- Provider usage
- Cost per minute
- Cost per call
- Cost per tenant
- Revenue per tenant
- Gross margin

---

# 44. Delivery Milestones

## Milestone 1 — SaaS Foundation

```text
M0 Foundation
M1 Authentication
M2 Organizations
M3 Users & Roles
M4 Businesses
```

Result: Multi-tenant SaaS foundation ✅

## Milestone 2 — Agent Builder

```text
M5 Agents
M6 ElevenLabs
M7 Knowledge
M8 Voice
M9 Voice Cloning
```

Result: Business can configure AI receptionist ✅

## Milestone 3 — AI Calling MVP

```text
M10 Twilio
M11 Phone Numbers
M12 Incoming Calls
M14 Calls
M15 Transcripts
M16 Analysis
```

Result: Real customers can call AI receptionist ✅

## Milestone 4 — Intelligent Receptionist

```text
M17 Tools
M18 Appointments
M19 Reservations
M20 CRM
M21 Knowledge Improvement
```

Result: Agent can perform real business actions ✅

## Milestone 5 — Automation

```text
M22 n8n
M23 Notifications
```

Result: Automated business workflows ✅

## Milestone 6 — Commercial SaaS

```text
M24 Analytics
M25 Plans
M26 Usage
M27 Billing
M28 Admin
```

Result: Product can be monetized and operated ✅

## Milestone 7 — Production Scale

```text
M29 Security / Audit / Monitoring
```

Result: Production maturity ✅

## Milestone 8 — Provider Independence

```text
M30 Retell
M31 OpenAI Realtime
M32 Telnyx
```

Result: Multi-provider SaaS ✅

## Milestone 9 — Platform Expansion

```text
M33 Developer Portal
M34 Help Center
M35 Operations Console
M36 Partner / Reseller Portal
M37 Public Status Page
M38 Business Mobile App
M39 Web Voice / Chat Widget
M40 Public Demo Sandbox
```

Result: Enterprise ecosystem ✅

---

# 45. Immediate Next Step

The next development unit is:

# M0 — Existing Project Architecture Audit & SaaS Foundation Refactor

Do not start Authentication until M0 passes its Definition of Done.

After M0:

```text
M1 Authentication
→ Complete End-to-End
→ QA
→ Accept
→ M2 Organizations
```

---

# 46. Final Architecture Decision

The approved direction is:

```text
OUR SAAS
│
├── Next.js / React / TypeScript
├── NestJS / TypeScript
├── PostgreSQL
├── Redis
├── S3-Compatible Storage
│
├── TelephonyProvider
│   ├── Twilio ← Initial
│   └── Telnyx ← Future
│
└── VoiceAgentProvider
    ├── ElevenLabs ← Initial
    ├── Retell ← Future
    └── OpenAI Realtime ← Future
```

Our SaaS owns customer data, business logic, configuration, billing, integrations and provider mappings.

Twilio provides telephony.

ElevenLabs initially provides the managed realtime voice-agent layer.

Existing OpenAI Realtime and voice-stream code is preserved for future high-volume/custom provider support.

Development continues from the existing codebase using strict vertical slices.

---

# 47. Project Tooling Model

```text
ChatGPT Work
→ Architecture
→ Requirements
→ Roadmap
→ Documentation
→ Cursor Briefs
→ Lovable Briefs

Lovable
→ UI/UX generation

Cursor
→ Production implementation
→ Backend
→ Database
→ Integrations
→ Testing
→ Final UI integration

GitHub
→ Source code truth
```

This file is the **master project reference** and should be updated whenever an approved architecture, scope, provider, module or roadmap decision changes.
