from app.core.db import SessionLocal
from app.demo_seed import seed_demo_data

db = SessionLocal()
seed_demo_data(db)
db.close()
