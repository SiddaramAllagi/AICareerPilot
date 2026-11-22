# AI CareerPilot
**Tagline:** *Your Career. Your Skills. Your Future.*

AI CareerPilot is a full-stack SaaS career development platform built for college students, fresh graduates, and job seekers.

## Core Modules
- **AI Career Advisor**: Personalized career paths, required technical skills, language recommendations, and tailored explanations.
- **AI Resume Analyzer**: Server-validated PDF upload (up to 5 MB) evaluating structure, ATS readability, extracted/missing skills, project bullets, and grammar.
- **Skill Gap Analyzer**: Role benchmarking (`Data Analyst`, `Data Scientist`, `AI Engineer`, `Software Developer`, `Full Stack Developer`, `Machine Learning Engineer`, or custom roles) with High/Medium/Low priority gaps.
- **AI Learning Roadmap**: Beginner, Intermediate, and Advanced modules with weekly study targets, practical projects, and interactive Firestore-synced completion tracking.
- **AI Interview Preparation**: Technical & HR Q&A practice plus interactive Mock Interview answer scoring (0–100) and improved response suggestions.
- **Internship & Job Discovery**: Live listings aggregated from verified public APIs (Remotive & Arbeitnow) with role/location/experience/category filtering and saved opportunities.
- **Plans & Razorpay Integration**: Free, Pro (₹99/mo), and Premium (₹199/mo) tiers with server-side Razorpay order creation and HMAC-SHA256 signature verification.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, Multer (in-memory PDF validation), sliding-window rate limiting
- **AI**: `@google/genai` (`gemini-4-hydrogen`) strictly on the server
- **Database & Auth**: Firebase Authentication (Google Sign-In + Email/Password with email verification) & Cloud Firestore with hardened security rules (`firestore.rules`)

## Local Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (copy `.env.example` to `.env`):
   - `GEMINI_API_KEY`: Required for server-side Gemini AI endpoints.
   - `APP_URL`: Public URL of your deployment.
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Optional, required only to enable live Razorpay INR checkout.
3. Firebase Configuration:
   - Ensure `firebase-applet-config.json` is provisioned.
   - In the Firebase Console (`Authentication -> Sign-in method`), Google Sign-In is ready immediately. To also allow Email/Password sign-up, enable the **Email/Password** provider in Firebase Console.
4. Start the full-stack server on port `3000`:
   ```bash
   npm run dev
   ```

## Production Build & Deployment
```bash
npm run build
npm start
```
The Express server serves API routes under `/api/*` and the compiled Vite bundle from `dist/` on port `3000`.
