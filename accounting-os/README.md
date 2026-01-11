# Modern Accounting OS

A full-stack accounting application built with FastAPI and React.

## Project Structure

- `backend/`: FastAPI application
- `frontend/`: React + Vite + Tailwind application

## Setup

### Backend
1. `cd backend`
2. `python3 -m venv venv`
3. `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. `python seed.py`
6. `uvicorn app.main:app --reload`

### Frontend
1. `cd frontend`
2. `source ~/.nvm/nvm.sh` (If using NVM)
3. `npm install`
4. `npm run dev`
