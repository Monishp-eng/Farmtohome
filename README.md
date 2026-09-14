# 🌾 FarmToHome (KisanSetu)

> **Direct Farm-to-Doorstep Agriculture Marketplace with 2G Voice AI & Direct Cold Logistics**  
> *Built for Smart India Hackathon (SIH 2026) | Clean Production Architecture*

---

## 📌 Project Overview

**FarmToHome** is an end-to-end direct agricultural platform bridging rural farmers and urban consumers:
- **For Rural Farmers (No Smartphone):** 2G feature phone IVR & Voice AI in native Tamil/Hindi using Twilio & Sarvam AI. Farmers can list crops, check earnings, and verify orders by dialing a phone number.
- **For Urban Consumers & Buyers:** High-performance responsive web marketplace with smart proximity-based matching, direct doorstep delivery, and zero middlemen markup.
- **For Logistics Drivers:** Direct farm-to-consumer dispatch routing with real road geometry (OSRM), animated delivery tracking, and Proof of Delivery (POD).
- **For AI/ML Insights:** Demand forecasting (Random Forest/XGBoost), 2-Opt TSP route optimization, and ESG carbon emission metrics.

---

## 🚀 6-Layer Production Architecture & Team Roster

| Layer | Focus Area | Primary Owner | Status |
|:---|:---|:---|:---:|
| **Layer 1** | **PostgreSQL 16 Migration, Auth Hardening, Rate Limiting** | **M1 (Backend Architect)** | ✅ **COMPLETED** |
| **Layer 2** | **Core API Rebuild, Razorpay Escrow (Test Mode), SMS & Payouts** | **M1 (Backend Architect)** | ✅ **COMPLETED** |
| **Layer 3** | APMC Agmarknet Training, Crop Doctor AI, Route Optimizer | M3 + M6 | 🟡 Next Up |
| **Layer 4** | Production Frontend PWA, Offline Caching, Live Tracking | M2 + M3 | ⚪ Upcoming |
| **Layer 5** | React Native Android App, Zero-Cost Cloud Deploy (Render/Vercel) | M5 + M4 | ⚪ Upcoming |
| **Layer 6** | 10 E2E Journey Tests, Security Audit, Grafana Analytics | M6 + ALL | ⚪ Upcoming |

📄 **Full Team Production Plan:** See [`KisanSetu_Production_Build_Plan.pdf`](./KisanSetu_Production_Build_Plan.pdf)

---

## 💰 Zero-Cost Production Stack (₹0/Month)

| Component | Technology / Free Provider | Free Tier Specification |
|:---|:---|:---|
| **Database** | [Neon PostgreSQL](https://neon.tech) | 0.5 GB storage, auto-suspend |
| **Backend API** | [Render](https://render.com) | 750 hrs/mo free web service |
| **Frontend UI** | [Vercel](https://vercel.com) | Unlimited static hosting, CDN, SSL |
| **AI Microservice** | [Hugging Face Spaces](https://huggingface.co/spaces) | 2 vCPU, 16 GB RAM free CPU |
| **Cache & Store** | [Upstash Redis](https://upstash.com) | 10,000 commands/day free |
| **Media Storage** | [Supabase Storage](https://supabase.com) | 1 GB free bucket storage |
| **DNS & Security** | [Cloudflare](https://cloudflare.com) | Free SSL, DDoS mitigation |
| **Voice / SMS** | [Twilio Trial](https://twilio.com) | $15 free trial credit |
| **Voice AI Engine** | Amazon Polly (Aditi Indian voice) | Native in-carrier synthesis |

---

## 🛠️ Quick Start Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Backend Server Setup
```bash
cd server
npm install
npm run migrate    # Verifies database schema and runs migrations
npm start          # Runs on http://localhost:5000
```
Health check: `http://localhost:5000/api/health`

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev        # Runs on http://localhost:3000
```

### 3. AI Microservice Setup
```bash
cd ai-service
pip install -r requirements.txt
python app.py      # Runs on http://localhost:5001
```

---

## 🔒 Security & Quality Features (Layer 1)
- **DDoS / Brute-Force Rate Limiting:** Applied to authentication & OTP endpoints (`express-rate-limit`).
- **Strict Input Validation:** Indian phone numbers (`^[6-9]\d{9}$`), IFSC codes, and passwords validated via `express-validator`.
- **Dual-Engine Persistence:** Automatic SQLite fallback locally, seamless PostgreSQL connection pooling via `DATABASE_URL` in production.
- **Health & Metrics Monitoring:** Real-time uptime, memory, and database status endpoint at `/api/health`.

---

## 📄 License
MIT License. Created for SIH 2026.
