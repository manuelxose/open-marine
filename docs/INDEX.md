# Documentation Index

**Last Updated:** 2026-01-28

Quick reference guide to all documentation files for the Open Marine Instrumentation project.

---

## 📖 Documentation Files

### Main Files (Root Level)

| File | Purpose | Best For | Read Time |
|------|---------|----------|-----------|
| [README.md](README.md) | Quick start guide and overview | New developers, quick setup | 5 min |
| [CLAUDE.md](CLAUDE.md) | AI assistant guide & conventions | AI agents, developers | 20 min |

### Architecture & Design (docs/)

| File | Purpose | Best For | Read Time |
|------|---------|----------|-----------|
| [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | **[NEW]** Complete setup instructions | Setting up locally | 15 min |
| [docs/STATUS.md](docs/STATUS.md) | **[NEW]** Project health scorecard | Quick status check | 10 min |
| [docs/architecture.md](docs/architecture.md) | System design & data flow | Understanding structure | 15 min |
| [docs/data-model.md](docs/data-model.md) | Types, units, Signal K paths | Data questions | 20 min |
| [docs/roadmap.md](docs/roadmap.md) | Development milestones & plans | Feature planning | 10 min |
| [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) | ⚠️ System-generated state analysis | Detailed health assessment | 30 min |

---

## 🎯 Quick Navigation by Use Case

### I'm New to the Project
1. Start → [README.md](README.md) (5 min overview)
2. Setup → [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) (15 min setup)
3. Understand → [CLAUDE.md](CLAUDE.md) (20 min conventions)
4. Code → [docs/architecture.md](docs/architecture.md) (system design)

### I Want to Set Up Locally
→ [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- Prerequisites checklist
- Step-by-step setup
- Verification steps
- Troubleshooting guide

### I'm Debugging a Problem
→ [docs/STATUS.md](docs/STATUS.md) for quick status
→ [docs/architecture.md](docs/architecture.md) for system overview
→ [CLAUDE.md](CLAUDE.md) for conventions

### I'm Adding a New Feature
1. [docs/roadmap.md](docs/roadmap.md) - Check if already planned
2. [CLAUDE.md](CLAUDE.md) - Review patterns and conventions
3. [docs/architecture.md](docs/architecture.md) - Understand where it fits
4. [docs/data-model.md](docs/data-model.md) - Check data requirements

### I'm Modifying Data Models
→ [docs/data-model.md](docs/data-model.md)
- Type definitions
- Unit conventions
- Signal K paths
- Examples and validation

### I'm Deploying to Production
→ [docs/architecture.md](docs/architecture.md)
→ [README.md](README.md) - Endpoints section
→ [docs/STATUS.md](docs/STATUS.md) - Health metrics

### I'm An AI Assistant Working Here
→ [CLAUDE.md](CLAUDE.md) **[MUST READ]**
- Architecture decisions
- DO/DON'T lists
- Code conventions
- Debugging tips

---

## 📚 Documentation Structure

```
docs/
├── SETUP_GUIDE.md       Prerequisites + step-by-step setup
├── STATUS.md            Health scorecard & quick reference
├── architecture.md      System design, responsibilities, data flow
├── data-model.md        Types, units, Signal K paths, examples
├── roadmap.md           Milestones, timeline, feature planning
└── PROJECT_STATE.md     ⚠️ System-generated (detailed health assessment)

Root/
├── README.md            Quick start + overview
└── CLAUDE.md            AI conventions + patterns
```

---

## 🔍 Topic-Based Navigation

### Setting Up Development Environment
- [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) - Complete setup
- [README.md](README.md#quick-start-5-minutes) - Quick start
- [docs/architecture.md](docs/architecture.md#development-urls) - Development endpoints

### Understanding the Architecture
- [docs/architecture.md](docs/architecture.md) - Full system design
- [CLAUDE.md](CLAUDE.md#single-source-of-truth-datapointstoreservice) - DatapointStoreService
- [docs/data-model.md](docs/data-model.md#data-flow-sequence) - Data flow

### Making Code Changes
- [CLAUDE.md](CLAUDE.md#code-conventions--standards) - Code standards
- [CLAUDE.md](CLAUDE.md#critical-architecture-decisions) - Architecture patterns
- [docs/architecture.md](docs/architecture.md#dependency-rules-critical) - Dependency rules

### Adding New Data Types
- [docs/data-model.md](docs/data-model.md#core-type-definitions) - Type definitions
- [docs/data-model.md](docs/data-model.md#signal-k-paths-mvp) - Adding paths
- [docs/data-model.md](docs/data-model.md#type-safety-checklist) - Checklist

### Debugging Issues
- [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md#troubleshooting-setup-issues) - Setup issues
- [CLAUDE.md](CLAUDE.md#debugging-tips) - Debugging guide
- [docs/STATUS.md](docs/STATUS.md#known-issues) - Known issues

### Planning New Features
- [docs/roadmap.md](docs/roadmap.md) - Milestones and timeline
- [docs/architecture.md](docs/architecture.md#dependency-rules-critical) - Architectural constraints
- [CLAUDE.md](CLAUDE.md#how-ai-assistants-should-work-here) - Development patterns

---

## 📋 By File Details

### [README.md](README.md) - Project Overview
**Sections:**
- Quick Start (5 minutes)
- System Architecture
- What Works (features)
- Known Issues
- Technology Stack
- Contributing guidelines

**Read this for:** Getting oriented, quick setup, overview

---

### [CLAUDE.md](CLAUDE.md) - AI Assistant & Conventions Guide
**Sections:**
- Project Overview
- Repository Structure
- Development Commands
- Code Conventions
- Critical Architecture Decisions
- What Works/Needs Attention
- AI Development Guidelines
- Debugging Tips
- Version Information

**Read this for:** Understanding conventions, AI development patterns, architecture decisions

---

### [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) - **[NEW]** Complete Setup
**Sections:**
- Prerequisites checklist
- Complete setup (7 steps)
- What happens after setup
- Common development tasks
- Troubleshooting
- Project structure after setup
- IDE configuration
- Cleaning up
- Development workflow

**Read this for:** Setting up locally, step-by-step guidance

---

### [docs/STATUS.md](docs/STATUS.md) - **[NEW]** Quick Status
**Sections:**
- Health Scorecard
- What Works (checklist)
- What Needs Work (by priority)
- Known Issues (detailed)
- Milestone Progress
- Stack Overview
- Dependency Graph
- Key Metrics
- Recent Changes
- AI Guidelines

**Read this for:** Quick status check, health metrics, what's pending

---

### [docs/architecture.md](docs/architecture.md) - System Design
**Sections:**
- High-Level System Diagram
- Responsibilities by Component
- Data Flow Architecture
- Dependency Rules
- Map Engine (MapLibre)
- Alarm Philosophy
- Electrical & Timing Assumptions
- Summary

**Read this for:** Understanding system structure, component responsibilities

---

### [docs/data-model.md](docs/data-model.md) - Data Types & Standards
**Sections:**
- Unit Conventions (CRITICAL)
- Core Type Definitions (DataPoint, SourceRef, Position, QualityFlag)
- Signal K Paths (MVP list)
- Data Flow Sequence (example)
- Signal K Delta Format
- Quality Lifecycle
- Unit Conversion Utilities
- True Wind Calculation (formulas)
- Timestamp Normalization
- Type Safety Checklist

**Read this for:** Data types, Signal K paths, unit standards

---

### [docs/roadmap.md](docs/roadmap.md) - Development Timeline
**Sections:**
- Overview
- Completed Milestones (M0-M3)
- Current Sprint (M4)
- Future Milestones (M5-M12)
- Long-Term Vision
- Technical Debt Backlog
- Success Criteria
- Release Plan
- AI Guidelines

**Read this for:** Feature planning, milestone tracking, what's coming

---

### [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) - Detailed State Analysis
**⚠️ System-Generated File - Read Only**

**Sections:**
- Executive Summary
- Current Architecture Overview
- Identified Problems (detailed)
- Dead Code Accumulation
- Architectural Inconsistencies
- Technical Debt from AI Iterations
- Contract-UI Misalignment
- Risk Assessment
- Canonical Architecture Proposal
- Migration Strategy (high level)

**Read this for:** Detailed health assessment, problem analysis, risk assessment

---

## 🔗 Cross-References

### Common Questions & Where to Find Answers

| Question | Location | Subsection |
|----------|----------|-----------|
| How do I set up? | SETUP_GUIDE.md | Complete Setup |
| What's the quick start? | README.md | Quick Start |
| How is data stored? | architecture.md | Data Flow Architecture |
| What are Signal K paths? | data-model.md | Signal K Paths |
| What are the conventions? | CLAUDE.md | Code Conventions |
| What needs fixing? | STATUS.md | What Needs Work |
| How do I add a feature? | roadmap.md | (check planned) |
| How do I debug? | CLAUDE.md | Debugging Tips |
| Is there a health check? | STATUS.md | Health Scorecard |
| What's the architecture? | architecture.md | Overview |

---

## 📅 Reading Schedule

### For New Team Members (1-2 Days)

**Day 1:**
- [ ] README.md (5 min)
- [ ] SETUP_GUIDE.md (15 min)
- [ ] docs/STATUS.md (10 min)
- [ ] CLAUDE.md (20 min)

**Day 2:**
- [ ] docs/architecture.md (15 min)
- [ ] docs/data-model.md (20 min)
- [ ] docs/roadmap.md (10 min)
- [ ] Explore code in `/src/app/features/`

### For AI Assistants (Required Before Coding)

- [ ] CLAUDE.md - **MUST READ** (20 min)
- [ ] docs/architecture.md (15 min)
- [ ] docs/data-model.md (15 min)
- [ ] CLAUDE.md DO/DON'T section (5 min)

### For Debugging (When Issues Arise)

- [ ] docs/STATUS.md - Known Issues section (5 min)
- [ ] CLAUDE.md - Debugging Tips (10 min)
- [ ] SETUP_GUIDE.md - Troubleshooting (10 min)
- [ ] docs/architecture.md - Relevant section (varies)

---

## ✅ Verification Checklist

After reading documentation, verify understanding:

- [ ] Can describe the high-level architecture (3 layers minimum)
- [ ] Can list all 5 npm packages and their purpose
- [ ] Know what DatapointStoreService does
- [ ] Know the unit convention for angles (radians)
- [ ] Can point to where alarms are implemented
- [ ] Know which files are read-only (PROJECT_STATE.md)
- [ ] Understand DO/DON'T rules for AI assistants
- [ ] Can name 3 completed milestones

---

## 📝 Last Updated

| File | Last Update | Status |
|------|-------------|--------|
| README.md | 2026-01-28 | ✅ Complete overhaul |
| CLAUDE.md | 2026-01-28 | ✅ Comprehensive expansion |
| docs/SETUP_GUIDE.md | 2026-01-28 | ✅ New file |
| docs/STATUS.md | 2026-01-28 | ✅ New file |
| docs/architecture.md | 2026-01-28 | ✅ Major expansion |
| docs/data-model.md | 2026-01-28 | ✅ Major expansion |
| docs/roadmap.md | 2026-01-28 | ✅ Comprehensive update |
| docs/PROJECT_STATE.md | 2026-01-28 | ✅ Untouched (system-generated) |

---

## 🎓 Learning Path

```
New Developer
    ↓
1. README.md (overview)
    ↓
2. SETUP_GUIDE.md (hands-on setup)
    ↓
3. CLAUDE.md (conventions)
    ↓
4. architecture.md (system design)
    ↓
5. data-model.md (types & paths)
    ↓
6. Explore code: /src/app/features/dashboard/
    ↓
7. Try: npm start && make a small change
    ↓
8. Read: roadmap.md (what's planned)
    ↓
Ready to code!
```

---

**Note:** All documentation is designed to be read by both humans and AI assistants. Links use relative paths for cross-reference.
