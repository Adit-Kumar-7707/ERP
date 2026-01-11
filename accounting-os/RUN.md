# Accounting OS - Run Guide

This guide explains how to set up and run the Accounting OS application (Backend + Frontend).

## 1. Prerequisites
Ensure you have the following installed:
- **Python 3.10+**
- **Node.js 16+** & **npm**

---

## 2. First Time Setup

You only need to do this once (or when dependencies change).

### Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    ```
3.  Activate the virtual environment:
    - **Mac/Linux:** `source venv/bin/activate`
    - **Windows:** `venv\Scripts\activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Initialize and Seed the Database (Creates tables and default data):
    ```bash
    python seed.py
    ```

### Frontend Setup
1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

---

## 3. Running the Application

Follow these steps every time you want to start the app.

### Step 1: Start the Backend Server
1.  Open a terminal.
2.  Go to `backend` and activate the environment:
    ```bash
    cd backend
    source venv/bin/activate  # (Windows: venv\Scripts\activate)
    ```
3.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    *The backend will start at `http://localhost:8000`*

### Step 2: Start the Frontend Client
1.  Open a **second** terminal.
2.  Go to `frontend`:
    ```bash
    cd frontend
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    *The frontend will start at `http://localhost:5173` (or similar)*

---

## 4. Accessing the App
Open your browser and navigate to:
**http://localhost:5173**

### Default Login Credentials
- **Owner**: `owner@example.com` / `password`
- **Accountant**: `accountant@example.com` / `password`
