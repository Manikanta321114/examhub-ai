# ExamHub AI - Beta Release Preparation

ExamHub AI is a centralized student examination directory and smart scheduling portal designed for Indian students. It tracks government, banking, engineering, medical, and collegiate entrance examinations, organizes deadline reminders, supports regional language translation, and validates external applications through a secure routing system.

---

## ⚡ Key Features

1. **AI-Powered Discovery & Automation**
   - Automatically crawls and suggests exam details (fee, syllabus, dates).
   - Admin console with version history rollback capabilities.
2. **Multilingual Regional Support**
   - Verified translation support for **English, ಕನ್ನಡ, हिन्दी, తెలుగు, தமிழ், മലയാളം**.
   - Input regional keyword mappings to match searches.
3. **Advanced Security & Redirection Protection**
   - Confirms user credentials before allowing bookmarks or external redirection.
   - External Link Safety warning prompts before transferring users to official websites.
   - Brute-force protection: accounts temporarily lock for 15 minutes after 5 failed login attempts.
4. **Student Exam Suggestion Registry**
   - Candidates can request missing examinations, raising the duplicate prevention request counter.
5. **Real-time Analytics Dashboard**
   - View click conversions, growth stats, and audit logs.
6. **Built-in User Feedback System**
   - Footer submission form for bugs, feature requests, and general comments.
   - Dedicated feedback dashboard inbox in the admin portal.

---

## 🛠️ Tech Stack

* **Frontend**: React + Vite, TailwindCSS, Lucide Icons, i18next
* **Backend**: FastAPI (Python), SQLAlchemy (ORM), JWT authentication (python-jose), SQLite (development)
* **Database**: PostgreSQL (production ready)

---

## 🚀 Setup Steps

### 1. Backend Setup
Navigate to the `backend` directory, install requirements, and run the server:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
* The backend API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup
Navigate to the `frontend` directory, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
* Open the browser at [http://localhost:5173](http://localhost:5173).

---

## ☁️ Deployment Instructions

### Database -> PostgreSQL (e.g. Supabase, Neon)
1. Create a PostgreSQL instance.
2. Set the `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/dbname
   ```
3. Install PostgreSQL dialect driver in Python if deploying (`pip install psycopg2-binary` or `asyncpg`).

### Backend -> Render
1. Create a new **Web Service** pointing to your repository.
2. Set the Environment to `Python`.
3. Set the Build Command:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Set the Start Command:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the necessary Environment Variables (e.g., `DATABASE_URL`, `SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### Frontend -> Vercel
1. Import your repository into Vercel.
2. Select **Vite** as the framework preset.
3. Set the Root Directory to `frontend`.
4. Add the backend URL variable inside `frontend/src/services/api.js` (or export as `VITE_API_BASE_URL` env variable in Vite).
5. Deploy.
