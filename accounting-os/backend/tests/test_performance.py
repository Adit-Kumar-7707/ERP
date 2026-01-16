from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest
import time

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry, JournalLine
from app.modules.jobs.models import Job, JobStatus, JobType
from app.modules.auth.models import User, UserRole
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_perf.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_active_user():
     return User(id=1, email="perf@example.com", is_active=True, role=UserRole.OWNER)

app.dependency_overrides[get_db] = override_get_db
from app.modules.auth import deps
app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Setup
    fy = FinancialYear(name="FY 24-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    db.add(fy)
    
    acc = Account(name="Perf Asset", code="PA", type=AccountType.ASSET)
    db.add(acc)
    db.commit()
    
    # Generate 1000 Entries (Light Load Test for CI)
    print("Generating 1000 Vouchers...")
    entries = []
    lines = []
    for i in range(1000):
        je = JournalEntry(date=date(2024, 4, 1), voucher_type="Journal", reference=f"P-{i}", financial_year_id=fy.id)
        entries.append(je)
        
    db.add_all(entries)
    db.commit() # Get IDs
    
    for je in entries:
        lines.append(JournalLine(entry_id=je.id, account_id=acc.id, debit=100.0, credit=0))
        
    db.add_all(lines)
    db.commit()
    print("Generation Complete.")
    
    yield db
    # Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_report_performance(test_db):
    start = time.time()
    res = client.get("/api/v1/reports/trial-balance?as_of=2025-03-31")
    end = time.time()
    
    assert res.status_code == 200
    duration = end - start
    print(f"Trial Balance (1000 recs) took: {duration:.4f}s")
    assert duration < 1.0 # Should be very fast
    
def test_ledger_pagination(test_db):
    acc = test_db.query(Account).filter_by(name="Perf Asset").first()
    
    # Page 1
    res = client.get(f"/api/v1/reports/ledger/{acc.id}?from_date=2024-04-01&to_date=2025-03-31&limit=50")
    assert res.status_code == 200
    data = res.json()
    assert len(data["transactions"]) == 50
    assert data["total_count"] == 1000
    
    # Page 2 (Skip 50)
    res = client.get(f"/api/v1/reports/ledger/{acc.id}?from_date=2024-04-01&to_date=2025-03-31&skip=50&limit=50")
    assert res.status_code == 200
    data = res.json()
    assert len(data["transactions"]) == 50
    # Check Running Balance logic: Should include previous 50 * 100 = 5000
    first_txn = data["transactions"][0]
    # Running Balance = OB (0) + Pre_Skip (50*100=5000) + Current (100) = 5100 ??
    # Wait, my logic sums PRE-SKIP lines. 
    # Skip=50 implies we skipped 50 lines. Sum of those 50 lines (each 100 Dr) = 5000 Dr.
    # Current line is 51st line (Skip 50 means start at index 50).
    # Its running balance should be 5000 + 100 = 5100.
    
    # Let's verify exact logic from service.py:
    # running = opening_balance + pre_page_sum
    # loop: running += amount
    
    # If pre_page_sum = 5000.
    # First item loops: running = 5000 + 100 = 5100.
    assert first_txn["running_balance"] == 5100.0

def test_job_system(test_db):
    # Create Job
    res = client.post("/api/v1/jobs/?type=REPORT", json={"report_name": "Trial Balance"})
    assert res.status_code == 200
    job_id = res.json()["id"]
    
    # Poll Status
    # Since TestClient runs synchronous, BackgroundTasks might run after response? 
    # FastAPI TestClient supports BackgroundTasks execution?
    # Usually yes, but might need context manager or manual trigger if mocked.
    # But we used real BackgroundTasks.
    
    # Wait for completion (simulated sleep)
    import time
    time.sleep(1.5)
    
    res = client.get(f"/api/v1/jobs/{job_id}")
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["result"] == {"report_url": "generated_report.pdf"}
