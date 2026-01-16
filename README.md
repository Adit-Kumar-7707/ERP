# Accounting OS (Tally Prime Clone)

**Objective**: Detailed, feature-parity clone of Tally Prime.
**Architecture**: Modular Monolith (Python Backend, React Frontend).

## 📚 Documentation & Planning
*   [Execution Plan](file:///Users/aditkumarsingh/.gemini/antigravity/brain/c23e16ab-4dd5-41bf-88bf-307d9e7efeea/tally_clone_plan.md)
*   [Feature Inventory](file:///Users/aditkumarsingh/.gemini/antigravity/brain/c23e16ab-4dd5-41bf-88bf-307d9e7efeea/feature_inventory.md)

## Quick Start (Docker)

The easiest way to run the ERP allows you to spin up the Database, Backend, and Frontend with one command.

1. **Install Docker Desktop**.
2. Run:
   ```bash
   docker-compose up --build
   ```
3. Access the App: `http://localhost`.
4. API Docs: `http://localhost:8000/docs`.

## Manual Setup

### Backend (FastAPI)
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

### Frontend (React)
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Features
- **Accounting**: Vouchers, Ledgers, Trial Balance, P&L, Balance Sheet.
- **Inventory**: Stock Items, Weighted Average Valuation.
- **Banking**: Bank Reconciliation Statement (BRS).
- **Compliance**: GST Export (JSON), Audit Trail.
- **Dashboard**: Financial Overview, Alerts, Quick Actions.
- **UI/UX**: Keyboard-first navigation, Shadcn/UI.

## ⚠️ Non-Negotiables
*   No features guessed.
*   Tally Verification required before implementation.
*   Strict "Books Beginning From" and "Financial Year" logic from Day 0.
