# DreamPath — Scholarship Consultancy System

**A full-stack scholarship intelligence platform designed to help Malaysian students discover opportunities, understand eligibility requirements, prepare applications, and manage their scholarship journey.**

DreamPath brings scholarship discovery, deterministic eligibility evaluation, application tracking, and AI-assisted preparation tools into one platform.

I independently developed the website implementation, including its application architecture, user interface, backend logic, database integration, AI-assisted features, and security controls. The project originated as a team project, and this repository showcases my software engineering contribution to it.

---

## Table of Contents

* [Overview](#overview)
* [The Problem](#the-problem)
* [Key Features](#key-features)
* [Technical Highlights](#technical-highlights)
* [Technology Stack](#technology-stack)
* [System Architecture](#system-architecture)
* [Security and Privacy](#security-and-privacy)
* [Testing and Code Quality](#testing-and-code-quality)
* [Getting Started](#getting-started)
* [Environment Configuration](#environment-configuration)
* [Project Structure](#project-structure)
* [Current Limitations](#current-limitations)
* [Future Improvements](#future-improvements)
* [Project Context and Attribution](#project-context-and-attribution)
* [License](#license)

---

## Overview

Finding a suitable scholarship can be challenging when opportunities, eligibility requirements, deadlines, and application instructions are spread across different websites.

DreamPath aims to make this process more organised by helping students move through a structured journey:

**Discover → Understand → Check → Save → Apply → Track**

The platform combines a scholarship catalogue with rule-based eligibility evaluation, application management, AI-assisted preparation tools, and administrative scholarship management.

The project also explores an important engineering principle: **AI should assist students, not replace deterministic logic or act as an unquestionable source of truth.**

## The Problem

Students may encounter several challenges when searching and applying for scholarships:

* Scholarship information is distributed across different provider websites.
* Eligibility requirements can be difficult to interpret.
* Application deadlines and progress can be difficult to manage.
* Preparing resumes, personal statements, and interview answers takes time.
* General-purpose AI assistants can produce inaccurate scholarship information if not properly constrained.

DreamPath addresses these challenges through structured scholarship information, rule-based eligibility checks, application tracking, and AI-assisted preparation features.

Scholarship requirements and deadlines must still be verified against the relevant official provider sources.

---

## Key Features

### 1. Scholarship Discovery

* Browse a central scholarship catalogue.
* Search for scholarship opportunities.
* Filter opportunities using available scholarship attributes.
* View scholarship details, requirements, and intake information.
* Review available source evidence and selection-stage information.

### 2. Rule-Based Eligibility Checker

DreamPath includes a deterministic eligibility engine that evaluates structured scholarship requirements against available student information.

Depending on the rules and profile information, the system can identify requirements that are met, not met, or missing information.

**Eligibility to apply is not a guarantee of receiving a scholarship.** Interviews, assessments, shortlisting, and final selection are separate processes.

### 3. Scholarship Comparison

* Compare scholarship information side by side.
* Review relevant requirements and funding information.
* Use AI-assisted comparison where supported by the implementation.

### 4. Application Journey Tracker

* Organise scholarships a student intends to pursue.
* Track application progress through defined statuses.
* Record application notes and relevant dates.
* Manage application progress through the available tracker interface.
* Export supported scholarship deadlines to a calendar using an iCalendar file.

### 5. Student Academic Profile

* Maintain academic information used by supported features.
* Store relevant qualification details, including SPM results and CGPA where applicable.
* Use supported profile information for eligibility evaluation.
* Access transcript-text autofill assistance where available.

### 6. AI-Assisted Resume Builder

The resume workflow combines structured information collection with deterministic processing.

* Collect student-provided information through a conversational workflow.
* Organise extracted information into structured records.
* Track interview progress and collected facts.
* Generate structured resume content from available information.
* Provide resume editing and PDF export functionality.

AI-assisted extraction and writing should not be treated as proof that an inferred fact is accurate. Students should review their information before using a generated resume.

### 7. AI Interview Practice

The platform includes an interview-practice feature intended to help students prepare for scholarship interviews through simulated questions and feedback.

### 8. Scholarship Essay Assistant

An AI-assisted writing tool supports students in reviewing and improving scholarship essays or statements of purpose.

Students remain responsible for the accuracy, originality, and final content of their submissions.

### 9. Grounded Scholarship Q&A

The scholarship Q&A functionality is designed to answer questions using available scholarship information rather than treating a general-purpose AI response as authoritative scholarship policy.

Its accuracy depends on the quality, completeness, and currency of the underlying information.

### 10. Administrative Scholarship Management

The administrative interface supports scholarship and provider management, scholarship creation, structured requirements, and administrative user-role management.

Administrative workflows are intended to support more structured scholarship data management and verification.

---

## Technical Highlights

### Deterministic Eligibility Evaluation

Scholarship eligibility is handled by application logic rather than delegated entirely to an LLM.

Structured requirement rules can be evaluated against student profile data, making the evaluation process more consistent and testable than relying on an unconstrained chatbot response.

### Stateful Conversational Resume Workflow

The resume interview architecture separates conversation planning, information extraction, fact management, and resume synthesis.

This separation helps the application manage collected information and reduce repetitive questioning.

### Structured Database Design

The application uses relational data models for core entities such as users, student profiles, scholarship providers, scholarships, intakes, requirements, and applications.

Additional models support resume and interview workflows.

### AI Provider Integration

AI-backed features are implemented through application services and routing logic. The exact provider and model used can depend on the feature, environment configuration, and available fallback paths.

AI output is not a substitute for official scholarship information or verified student facts.

### Security-Oriented Engineering

The codebase includes authentication and authorization logic, server-side data access, protected application routes, validation, and security-related utilities. See the security section below for scope and limitations.

---

## Technology Stack

The current codebase uses the following technologies, subject to the installed dependency versions:

| Area              | Technology                                         | Purpose                                                                 |
| ----------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Web framework     | Next.js                                            | Application routing, rendering, server functionality, and API endpoints |
| UI library        | React                                              | Interactive user interfaces                                             |
| Language          | TypeScript                                         | Typed application and domain logic                                      |
| Styling           | Tailwind CSS                                       | Interface styling                                                       |
| Database          | PostgreSQL                                         | Persistent relational data                                              |
| Database platform | Supabase                                           | Database and authentication services                                    |
| ORM               | Drizzle ORM                                        | Typed database queries and schema management                            |
| Authentication    | Supabase Auth and SSR integration                  | User authentication and session handling                                |
| Validation        | Zod                                                | Runtime data validation                                                 |
| AI integration    | Google Gemini and configured provider integrations | Selected AI-assisted features                                           |
| Resume export     | React PDF renderer                                 | PDF document generation                                                 |
| Testing           | Vitest                                             | Automated tests                                                         |
| Code quality      | ESLint and TypeScript compiler                     | Static analysis and type checking                                       |

Dependency versions should be checked against `package.json` and the lockfile before publishing version-specific badges or claims.

---

## System Architecture

DreamPath is organised around the following high-level layers:

```text
┌──────────────────────────────────────┐
│           User Interface             │
│   Next.js App Router + React          │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│       Application and API Layer      │
│   Server Actions + Route Handlers     │
└─────────┬───────────────────┬────────┘
          │                   │
┌─────────▼────────┐  ┌───────▼────────┐
│ Domain Logic     │  │ AI Services    │
│ Eligibility      │  │ Q&A and writing│
│ Resume workflow  │  │ Interview tools│
└─────────┬────────┘  └────────────────┘
          │
┌─────────▼────────────────────────────┐
│        Data Access Layer             │
│          Drizzle ORM                 │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│        PostgreSQL / Supabase         │
└──────────────────────────────────────┘
```

This diagram is a conceptual overview of the codebase, not a deployment topology or a guarantee that every feature follows exactly the same execution path.

---

## Security and Privacy

Security-related implementation areas include:

* Authentication and session handling through Supabase integration.
* Protected student and administrative routes.
* Server-side role checks for administrative functionality.
* User-scoped database operations for applicable student data.
* Runtime validation for supported structured inputs.
* A restricted web-content fetching utility designed to reduce server-side request forgery risks.
* Redaction utilities for sensitive information in supported AI workflows.
* Account data export and deletion functionality where implemented.

These controls reduce specific risks but do not establish that the entire application is vulnerability-free, fully compliant with a privacy law, or independently security-audited.

Never commit `.env.local`, API keys, database credentials, service-role keys, or other secrets.

---

## Testing and Code Quality

The project includes automated tests covering areas such as:

* Scholarship eligibility rules and evaluation.
* Scholarship data and eligibility semantics.
* AI service routing and fallback behaviour.
* Resume and conversational interview workflows.
* Authentication and authorization.
* Security utilities.
* Administrative operations and student profile actions.

The codebase can also be checked using its configured TypeScript and ESLint commands.

**Test results should be reproduced on the exact commit being published.** Test counts and build results may change as the project evolves.

---

## Getting Started

### Prerequisites

* Node.js version compatible with the project configuration.
* npm.
* Access to the required database and authentication services.
* Valid provider credentials for AI features that require external APIs.

### Installation

```bash
git clone https://github.com/Jittesh26/dreampath.git
cd dreampath
npm install
```

### Environment Configuration

Create a local environment file based on the example:

```powershell
Copy-Item .env.example .env.local
```

Fill in the required values in `.env.local` using your own development credentials. Never commit this file.

### Database Setup

Review the available database scripts and migration configuration before running any database command. Use the exact migration or setup command defined by the current project scripts.

Do not run production migrations or seed operations against an unintended database.

### Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000.

### Run Tests and Quality Checks

Check the scripts in `package.json` first. The following commands are available when configured in the project:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
```

External services and valid environment variables may be required for some workflows.

---

## Project Structure

The main application code is organised under `src/`.

```text
src/
├── app/
│   ├── actions/       # Server-side application actions
│   ├── admin/         # Administrative pages
│   ├── api/           # API route handlers
│   ├── scholarships/  # Scholarship discovery and detail pages
│   └── student/       # Student workspace and tools
├── components/
│   ├── admin/         # Administrative UI
│   ├── design-system/ # Shared interface components
│   ├── resume/        # Resume-related components
│   ├── scholarships/  # Scholarship interface components
│   └── student/       # Student-facing components
├── db/                # Database schema, access, and seed utilities
├── domain/            # Eligibility, resume, and business logic
└── lib/               # Shared services, integrations, and utilities
```

The exact directory contents may evolve as features are added or refactored.

---

## Current Limitations

DreamPath is an evolving project. Important considerations include:

* Scholarship information must be maintained and verified against official provider sources.
* A deterministic eligibility result does not guarantee shortlisting or an award.
* AI-generated content requires user review.
* External AI services may be subject to latency, availability, quotas, and usage limits.
* Automated background scholarship collection and external deadline notifications should not be assumed unless explicitly implemented and tested.
* Security controls require ongoing review and testing.
* A successful local test run does not prove that every user journey works correctly in production.

---

## Future Improvements

Potential areas for further development include:

* More comprehensive scholarship source verification and change tracking.
* Automated monitoring for scholarship intake updates.
* Reliable deadline notification delivery.
* Expanded end-to-end and accessibility testing.
* Improved monitoring and operational observability.
* Additional privacy and security reviews.
* Better documentation of API contracts, data models, and deployment procedures.

These are potential improvements, not claims about existing functionality.

---

## Project Context and Attribution

DreamPath originated as a team project. This repository showcases my independent work on the website implementation and engineering.

The original project concept and collaborative contributions should be acknowledged appropriately. Implementation, architecture, AI feature design, tooling choices, and code contributions described here reflect my work to the extent supported by the repository and project history.

## License

No open-source license has been specified yet. Until ownership and permission to publish the code are confirmed, all rights remain reserved by the applicable copyright holders. Do not assume that making the repository public grants permission for others to reuse the code.

---

**Built with a focus on structured scholarship information, explainable eligibility logic, and practical AI-assisted student tools.**
