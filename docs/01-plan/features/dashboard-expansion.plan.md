# Plan: DigiGreen Youth Dashboard Expansion

> **Feature**: dashboard-expansion
> **Created**: 2026-02-01
> **Status**: Draft
> **Phase**: Plan

---

## 1. Executive Summary

Expand the DigiGreen Youth M&E Dashboard MVP into a comprehensive, production-ready platform for the GENIE DigiGreen Youth Employment Project in Côte d'Ivoire. The expansion focuses on **scalability**, **collaboration**, **analytics**, and **field operations**.

---

## 2. Current State Analysis (MVP Assessment)

### What's Built (85-90% Complete)
| Module | Status | Notes |
|--------|--------|-------|
| Dashboard KPIs | ✅ Complete | 4 key metrics with progress |
| Centers Map | ✅ Complete | 35 centers, Leaflet integration |
| Activity Tracker | ✅ Complete | Gantt chart, 31 activities |
| Targets & Milestones | ✅ Complete | Hierarchical 4→7→35+ view |
| Budget Tracking | ✅ Complete | $8.25M, activity-level detail |
| Risk Register | ✅ Complete | Matrix + filtering |
| Smart Uploader | ✅ Complete | AI extraction + self-learning |
| Settings | ⚠️ Placeholder | Empty page |

### Current Limitations
1. **No Authentication** - Anyone can access/modify data
2. **JSON-only Storage** - No database, scalability concerns
3. **Single User** - No collaboration or approval workflows
4. **No Historical Trends** - Only current snapshot views
5. **Web-only** - No mobile/offline capability
6. **No Notifications** - Manual checking required

---

## 3. Expansion Opportunities (Brainstorm)

### Category A: Core Platform Enhancements

#### A1. User Authentication & Role-Based Access
**Priority**: 🔴 Critical
**Effort**: Medium

| Role | Dashboard | Edit Data | Approve | Admin |
|------|-----------|-----------|---------|-------|
| M&E Manager | ✅ | ✅ | ✅ | ❌ |
| Finance Officer | Budget only | Budget | ❌ | ❌ |
| Center Director | Own center | Own center | ❌ | ❌ |
| Field Staff | ✅ (read) | Upload only | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Viewer (Donor) | ✅ (read) | ❌ | ❌ | ❌ |

**Features**:
- Login/logout with JWT or OAuth
- Password reset flow
- Session management
- Audit trail of all changes
- User activity logs

---

#### A2. Database Migration (JSON → PostgreSQL/Supabase)
**Priority**: 🔴 Critical
**Effort**: High

**Benefits**:
- Concurrent user support
- Data integrity (transactions)
- Historical versioning
- Better query performance
- Scalable to 1000+ users

**Migration Path**:
```
Current: JSON files → API → Frontend
Target:  PostgreSQL → FastAPI → Frontend
         (or Supabase for faster setup)
```

---

#### A3. Historical Data & Trend Analysis
**Priority**: 🟡 High
**Effort**: Medium

**Features**:
- Time-series views for all indicators
- Period-over-period comparisons (M/M, Q/Q, Y/Y)
- Progress trajectory (are we accelerating?)
- Forecasting based on current trends
- Snapshot archival (monthly/quarterly)

**Visualizations**:
- Sparklines in KPI cards
- Trend arrows (↑↓→)
- Historical charts per indicator
- Cumulative vs. periodic views

---

#### A4. Advanced Settings Page
**Priority**: 🟢 Medium
**Effort**: Low

**Settings to Add**:
- User profile (name, email, avatar)
- Notification preferences
- Dashboard layout preferences
- Default date range
- Export format preferences
- Language selection (French primary for Côte d'Ivoire)

---

### Category B: Collaboration & Workflow

#### B1. Approval Workflows
**Priority**: 🟡 High
**Effort**: Medium

**Workflow**:
```
Field Staff uploads report
    ↓
AI extracts data (SmartUploader)
    ↓
Data saved as "Pending Review"
    ↓
M&E Manager reviews & approves
    ↓
Data committed to actuals
    ↓
Notifications sent
```

**Features**:
- Pending queue with filters
- Inline comments/questions
- Approve/Reject with reason
- Bulk approval for trusted sources
- Escalation for overdue items

---

#### B2. Comments & Annotations
**Priority**: 🟢 Medium
**Effort**: Low

**Where**:
- Activity notes (why delayed?)
- Risk commentary (mitigation updates)
- Indicator narratives (explain variance)
- Center status notes

**Features**:
- @mentions for team members
- Comment threads
- Resolved/Open status
- Email notifications

---

#### B3. Team Dashboards
**Priority**: 🟢 Medium
**Effort**: Medium

**Dashboard Views By**:
- **Component**: View only Component 1, 2, or 3
- **Region**: San-Pédro, Abidjan, Gontougo, etc.
- **Center**: Single center performance
- **Role**: Finance sees budget, M&E sees indicators

---

### Category C: Analytics & Intelligence

#### C1. Predictive Analytics
**Priority**: 🟢 Medium
**Effort**: High

**Features**:
- Target achievement forecasting
- Budget burn rate projections
- Risk escalation predictions
- Activity delay probability
- "At Risk" indicator flagging

**Models**:
- Linear regression for simple trends
- Time-series forecasting (ARIMA)
- ML for pattern detection

---

#### C2. Automated Insights & Alerts
**Priority**: 🟡 High
**Effort**: Medium

**Alert Types**:
| Trigger | Alert | Action |
|---------|-------|--------|
| Indicator < 50% of target | Warning | Review required |
| Budget > 110% for activity | Over Budget | Finance review |
| Risk score increased | Risk Alert | Mitigation update |
| Activity 30+ days delayed | Critical Delay | Escalate |
| Center offline > 7 days | Connectivity | IT support |

**Delivery**:
- In-app notification center
- Email digest (daily/weekly)
- SMS for critical alerts
- Slack/Teams integration

---

#### C3. Correlation Analysis
**Priority**: 🟢 Low
**Effort**: High

**Questions to Answer**:
- Does trainer certification correlate with student enrollment?
- Which activities have highest ROI?
- Do specific centers perform better?
- What predicts successful job placement?

---

### Category D: Field Operations

#### D1. Mobile App / PWA
**Priority**: 🟡 High
**Effort**: High

**Use Cases**:
- Center directors check own performance
- Field staff upload photos/documents
- Quick data entry on-site
- Offline capability for rural areas

**Options**:
| Option | Pros | Cons |
|--------|------|------|
| PWA | Quick, single codebase | Limited offline |
| React Native | Native feel, offline | Separate codebase |
| Expo | Fast development | Some limitations |

---

#### D2. Offline Data Collection
**Priority**: 🟢 Medium
**Effort**: High

**Features**:
- Local storage of forms
- Sync when online
- Conflict resolution
- Photo/document capture
- GPS location tagging

---

#### D3. Center Management Portal
**Priority**: 🟢 Medium
**Effort**: Medium

**Features for Center Directors**:
- Own center dashboard
- Student enrollment forms
- Equipment inventory
- Training schedule management
- Issue reporting
- Direct messaging to HQ

---

### Category E: Integrations

#### E1. LMS Integration
**Priority**: 🟢 Medium
**Effort**: Medium

**Purpose**: Auto-pull training completion data

**Integrations**:
- Moodle API (if using)
- Custom LMS webhooks
- Certificate verification

---

#### E2. Financial System Integration
**Priority**: 🟢 Medium
**Effort**: Medium

**Purpose**: Real-time budget data

**Options**:
- QuickBooks API
- SAP integration
- Bank transaction feeds
- Manual CSV import (fallback)

---

#### E3. Government Portal Integration
**Priority**: 🟢 Low
**Effort**: High

**Purpose**: Policy tracking, compliance reporting

**Challenges**:
- No standard APIs
- Manual data entry likely
- Regulatory compliance

---

### Category F: Reporting & Export

#### F1. Advanced Report Builder
**Priority**: 🟡 High
**Effort**: Medium

**Features**:
- Custom report templates
- Drag-and-drop sections
- Scheduled generation (monthly, quarterly)
- Multiple formats (PDF, DOCX, XLSX, PPT)
- Donor-specific templates (KOICA, GGGI)

---

#### F2. Executive Dashboard / Donor View
**Priority**: 🟡 High
**Effort**: Low

**Features**:
- Simplified high-level view
- Key metrics only
- Shareable link (read-only)
- Branded for donors
- Auto-refresh

---

#### F3. Data Export API
**Priority**: 🟢 Medium
**Effort**: Low

**Features**:
- REST API for external systems
- Bulk data export
- Webhook notifications
- API key management

---

## 4. Prioritized Roadmap (Recommended)

### Phase 1: Foundation (Weeks 1-4)
| Feature | Priority | Effort |
|---------|----------|--------|
| A1. User Authentication | 🔴 Critical | Medium |
| A2. Database Migration | 🔴 Critical | High |
| A4. Settings Page | 🟢 Medium | Low |

**Goal**: Secure, scalable foundation

---

### Phase 2: Collaboration (Weeks 5-8)
| Feature | Priority | Effort |
|---------|----------|--------|
| B1. Approval Workflows | 🟡 High | Medium |
| C2. Alerts & Notifications | 🟡 High | Medium |
| B2. Comments | 🟢 Medium | Low |

**Goal**: Multi-user workflows

---

### Phase 3: Analytics (Weeks 9-12)
| Feature | Priority | Effort |
|---------|----------|--------|
| A3. Historical Trends | 🟡 High | Medium |
| F1. Report Builder | 🟡 High | Medium |
| F2. Donor Dashboard | 🟡 High | Low |

**Goal**: Data-driven insights

---

### Phase 4: Field Operations (Weeks 13-16)
| Feature | Priority | Effort |
|---------|----------|--------|
| D1. Mobile App/PWA | 🟡 High | High |
| D3. Center Portal | 🟢 Medium | Medium |
| E1. LMS Integration | 🟢 Medium | Medium |

**Goal**: Field-ready platform

---

### Phase 5: Advanced (Weeks 17+)
| Feature | Priority | Effort |
|---------|----------|--------|
| C1. Predictive Analytics | 🟢 Medium | High |
| D2. Offline Capability | 🟢 Medium | High |
| E2-E3. Integrations | 🟢 Low | High |

**Goal**: Intelligence & scale

---

## 5. Technical Decisions Needed

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Auth Provider** | Custom JWT, Auth0, Supabase Auth, Firebase | Supabase Auth (fast + DB combo) |
| **Database** | PostgreSQL, Supabase, MongoDB, PlanetScale | Supabase (Postgres + realtime) |
| **Mobile** | PWA, React Native, Expo, Flutter | PWA first, then React Native |
| **Hosting** | Vercel, Railway, Render, AWS | Vercel (frontend) + Railway (backend) |
| **Notifications** | Custom, Novu, OneSignal | Novu (open-source) |

---

## 6. Success Metrics

| Metric | Current | Target (6mo) |
|--------|---------|--------------|
| Active Users | 1 (dev) | 50+ |
| Data Entry Time | Manual JSON | 80% automated |
| Report Generation | Manual | 1-click |
| Mobile Access | 0% | 40% of users |
| Data Freshness | Quarterly | Weekly |
| Stakeholder Satisfaction | N/A | >80% |

---

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep | High | High | Phased approach, strict prioritization |
| Database migration issues | High | Medium | Thorough testing, rollback plan |
| User adoption resistance | Medium | Medium | Training, gradual rollout |
| Internet connectivity in field | High | High | Offline-first design, PWA |
| AI extraction accuracy | Medium | Low | Self-learning already in place |

---

## 8. Stakeholder & Context Analysis (Answered)

### User Groups Identified
| User Group | Count | Access Level | Primary Use |
|------------|-------|--------------|-------------|
| M&E Team | ~3-5 | Full admin | Maintain system, data quality |
| Project Team | ~5-10 | Edit + Approve | Project management, reporting |
| Trainers | 105 | Read-only | Check progress, updates |
| Implementing Partners | ~10-20 | Read-only | Monitor progress |
| **Total Users** | **~130+** | | |

### Timeline
- **MVP Completion**: This week (Feb 2026)
- **Initial Publish**: This week
- **Development Runway**: 3 months continuous

### Technical Constraints
- ❌ No IT team support
- ❌ MS Office data blocked/inaccessible directly
- ✅ Need watcher/automation for real-time data
- ✅ Student surveys integration needed
- ✅ LMS platform data integration needed

### Language
- French support needed but **not immediate priority**

### Developer Context
- User has political science / international affairs background
- New to full-stack development
- Basic Python training completed
- Requires educational, step-by-step approach

---

## 9. Next Steps

1. **Review this plan** and prioritize features
2. **Answer open questions** above
3. **Proceed to Design phase** for top-priority features
4. **Create detailed specs** for Phase 1

---

**Command to proceed**: `/pdca design dashboard-expansion` (after finalizing priorities)

