# 🏥 Smart Clinic — Multi-Clinic Healthcare Management & Digital Queue Orchestration Platform

<div align="center">

![Smart Clinic Banner](https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1400&q=80)

[![React](https://img.shields.io/badge/Frontend-React_19_|_Vite_8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS_|_DaisyUI_5-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Django REST Framework](https://img.shields.io/badge/Backend-Django_5_|_DRF-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![AI Vision](https://img.shields.io/badge/AI_Engine-Gemini_1.5_Multimodal_Vision-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Speech Synthesis](https://img.shields.io/badge/Audio-Web_Speech_API_Bilingual-FF6F00?style=for-the-badge&logo=google-cloud&logoColor=white)]()
[![Database](https://img.shields.io/badge/Database-SQLite_/_PostgreSQL-4479A1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Production_Grade_Hardened-success?style=for-the-badge)]()
[![Tests](https://img.shields.io/badge/Tests-148%2F148_Passing_(100%25)-brightgreen?style=for-the-badge)]()

**An enterprise-grade, distributed clinical ecosystem bridging Clinics, Specialist Doctors, Receptionists, Patients, and Platform Administrators across Bangladesh.**

[Explore Features](#-key-features) • [System Architecture](#-system-architecture) • [Queue State Machine](#-digital-queue-engine--emergency-priority) • [Clinical Innovation Matrix](#-clinical-innovation--ai-architecture) • [Quick Start](#-quick-start-guide) • [Default Credentials](#-default-credentials-development) • [API Documentation](#-api-documentation)

</div>

---

## 🌟 Overview

**Smart Clinic** is an end-to-end, multi-tenant digital health management platform engineered to resolve queue congestion, fragmented medical records, and manual counter discrepancies in healthcare facilities across Bangladesh.

Benchmarked against regional leaders like [Smart ClinicX by HEALTHx](https://clinic.healthxbd.com/), Smart Clinic eliminates physical waiting room chaos with **real-time live chamber dispatching**, empowers patients with **longitudinal vitals tracking and Gemini AI multimodal medical report analysis**, equips doctors with a **BMDC-standard chamber super-console**, and gives front-desk receptionists an **automated cash drawer reconciliation and denomination handover ledger**.

---

## 🏛️ System Architecture

```mermaid
graph TD

    subgraph CLIENTS["Clients and Public Displays"]
        P["Patient Mobile / Web App"]
        R["Front-Desk Reception Counter"]
        D["Doctor Chamber Workstation"]
        A["Clinic Admin Control Tower"]
        TV["Waiting Room 4K / 1080p Signage TV"]
    end

    subgraph FRONTEND["Application Gateway and Frontend - React 19 + Vite 8"]
        FE["React 19 Single Page App"]
        Router["React Router v7"]
        AuthCtx["AuthProvider and JWT Interceptor"]
        LangCtx["LanguageContext - EN / Bangla Localization"]
        GeoHook["Bangladesh Geo Cascading Hook"]
        SpeechEng["Web Speech Dual-Voice Synthesizer"]
        VitalsDash["SVG Health Indicator Trend Engine"]
    end

    subgraph API_GATEWAY["Security and API Gateway - Django 5 + DRF"]
        API["Django REST Framework"]
        SimpleJWT["SimpleJWT Bearer and Role-Based RBAC"]
        Spectacular["OpenAPI 3.0 / Swagger Documentation"]
    end

    subgraph SERVICES["Micro-Services and Domain Modules"]
        GeoSvc["apps.common - Bangladesh 8-Division Geo Hierarchy"]
        AccSvc["apps.accounts - User Profiles and Security"]
        ClnSvc["apps.clinics - Multi-Tenant Clinics, Staff and Shift Logs"]
        DocSvc["apps.doctors - Chamber Rosters and Availability"]
        AptSvc["apps.appointments - Atomic State Machine and Proximity Dispatch"]
        RxSvc["apps.prescriptions - E-Prescriptions and Vitals Auto-Sync"]
        AIEng["apps.prescriptions.ai_analyzer - Gemini Multimodal Vision"]
        PaySvc["apps.payments - SSLCommerz and Cash Drawer Ledgers"]
        NotifSvc["apps.notifications - BD SMS and Email Dispatcher"]
    end

    subgraph STORAGE["Persistence and Cloud Storage"]
        DB[("PostgreSQL / SQLite Database")]
        Cloudinary[("Cloudinary Authenticated Medical Vault")]
    end

    P --> FE
    R --> FE
    D --> FE
    A --> FE
    TV --> FE

    FE --> Router
    Router --> AuthCtx
    Router --> LangCtx

    FE --> GeoHook
    FE --> SpeechEng
    FE --> VitalsDash

    FE -->|JSON / Bearer JWT| API

    API --> SimpleJWT
    SimpleJWT --> Spectacular

    API --> GeoSvc
    API --> AccSvc
    API --> ClnSvc
    API --> DocSvc
    API --> AptSvc
    API --> RxSvc
    API --> PaySvc
    API --> NotifSvc

    RxSvc --> AIEng
    AIEng --> Cloudinary

    GeoSvc --> DB
    AccSvc --> DB
    ClnSvc --> DB
    DocSvc --> DB
    AptSvc --> DB
    RxSvc --> DB
    PaySvc --> DB
    NotifSvc --> DB
