# Deployment & Execution Guide

This guide covers how to run the ERP system locally (using Docker) and how to host it online (using Railway).

---

## Part 1: Running Locally (Docker)

Use this method to run the entire system (Database, Backend, Frontend) on your own computer.

### Prerequisites
- Install **Docker Desktop**: [Download Here](https://www.docker.com/products/docker-desktop/)
- Ensure Docker is running.

### 1. First Time Setup
1. Open your terminal.
2. Navigate to the project folder:
   ```bash
   cd /path/to/ERP
   ```
3. Run the following command to build and start everything:
   ```bash
   docker-compose up --build
   ```
   *This may take 5-10 minutes the first time as it downloads dependencies.*

4. **Access the App**:
   - Frontend (UI): Open [http://localhost](http://localhost) in your browser.
   - Backend Docs: [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Consecutive Runs (Daily Usage)
Once set up, you don't need to rebuild every time.
1. Start the app:
   ```bash
   docker-compose up
   ```
2. To stop it, press `Ctrl+C`.
3. To stop and remove containers (clean up), run:
   ```bash
   docker-compose down
   ```

---

## Part 2: Hosting Online (Railway)

We will use **Railway.app** because it natively supports Docker and makes connecting a Database easy.

### Prerequisites
- A **GitHub Account**.
- Push this code to a new GitHub Repository (public or private).
- A **Railway Account** (Login with GitHub at railway.app).

### Step-by-Step Setup

#### Step 1: Create Project & Database
1. Go to your [Railway Dashboard](https://railway.app/dashboard).
2. Click **New Project** > **Provision PostgreSQL**.
3. This creates a database container.

#### Step 2: Deploy Backend
1. Click **New** (or `Command + K`) > **GitHub Repo**.
2. Select your ERP Repository.
3. **IMPORTANT**: The build will initially fail. This is normal.
4. **Click on the newly created Service card** (the distinct box on the project canvas).
5. A set of tabs will appear (Start, Deployments, Variables, Settings, etc.). Click **Settings**.
6. Scroll down to the **Service** section (General section).
7. Find **Root Directory**.
8. Enter `/backend` and press **Enter** (or click the checkmark).
   - *This tells Railway to look for the Dockerfile in the backend folder.*
   - *Railway will automatically restart the build.*
7. **Configure Variables**:
   - Go to the **Variables** tab.
   - Click **New Variable**.
   - `DATABASE_URL`: Type `${{Postgres.DATABASE_URL}}` (Select the autocomplete option).
   - `PORT`: `8000`
   - `SECRET_KEY`: `your_secret_key_here` (Optional but recommended).
8. **Generate Domain**:
   - Go to **Settings** > **Networking** > **Public Networking**.
   - Click **Generate Domain**.
   - **Copy this URL** (e.g., `https://backend-production.up.railway.app`). You need it for Step 3.

#### Step 3: Deploy Frontend
1. Click **New** > **GitHub Repo** (Select the SAME repository again).
2. **IMPORTANT**: The build will initially fail.
3. Click on the new Service card (Frontend).
4. Go to **Settings** > **Service Section** > **Root Directory**.
5. Enter `/frontend` and press **Enter**.
   - *Railway will restart the build.*
6. **Configure Variables** (Crucial):
   - Go to **Variables**.
   - Add `VITE_API_URL`.
   - Value: Paste the Backend URL from Step 2 (e.g., `https://backend-production.up.railway.app/api/v1`).
   - *Note: Ensure you add `/api/v1` to the end of the URL.*
7. **Generate Domain**:
   - Go to **Settings** > **Networking** > **Public Networking**.
   - Click **Generate Domain**.
   - Click correct link to open your live App!

### Consecutive Updates
Railway is connected to your GitHub.
- **To Update**: Simply `git push` your changes to GitHub. Railway will detect the change and automatically redeploy both the Backend and Frontend services.

---

## Troubleshooting

**Local Docker**:
- If port `5432` is busy: Access `docker-compose.yml` and change ports to `"5433:5432"`.
- If Frontend can't reach Backend: Ensure you are accessing via `localhost`.

**Railway**:
- If Build Fails: Check the "Build Logs" in Railway.
- **Error: "Railpack could not determine how to build the app"**:
  - This means Railway is looking at the root folder instead of the specific service folder.
  - **Fix**: Go to **Settings** > **Root Directory** and set it to `/backend` (for Backend service) or `/frontend` (for Frontend service).
- If Database connection fails: Ensure `DATABASE_URL` is set correctly in Backend variables.
