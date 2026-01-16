import requests
import json
from datetime import date

BASE_URL = "http://localhost:8000/api/v1"

def test_create_voucher():
    # 1. Fetch IDs (Hack: We know the names from seed)
    # We don't have GetLedger API yet, so we assume DB IDs if fresh.
    # Cash ~ ID 1? P&L ~ ID 2?
    # Let's use SQlite directly to find IDs first or trust the order.
    # OR, better: Add a quick GET /accounting/ledgers endpoint?
    # No, let's just peek into DB or guess.
    
    # Actually, we have Chart of Accounts endpoint.
    print("Fetching Chart of Accounts...")
    r = requests.get(f"{BASE_URL}/accounting/chart-of-accounts")
    if r.status_code != 200:
        print(f"Failed to fetch COA: {r.status_code}")
        print(r.text)
        return

    # Helper to find ledger id
    def find_ledger(groups, name, depth=0):
        if not groups: return None
        for g in groups:
            print(f"{'  '*depth}Group: {g['name']}")
            ledgers = g.get('ledgers') or []
            for l in ledgers:
                print(f"{'  '*depth}  Ledger: {l['name']}")
                if l['name'] == name:
                    return l['id']
            res = find_ledger(g.get('children') or [], name, depth + 1)
            if res: return res
        return None

    groups = r.json()
    cash_id = find_ledger(groups, "Cash")
    pl_id = find_ledger(groups, "Profit & Loss A/c")
    
    print(f"Cash ID: {cash_id}, P&L ID: {pl_id}")
    
    if not cash_id or not pl_id:
        print("ERROR: Ledgers not found!")
        return

    # 2. Create Voucher Payload
    # Type: Payment (Assumed ID 2 based on seed order? Contra=1, Payment=2)
    # Let's hope IDs are deterministic or fetch via API if created.
    # We will try ID 2.
    
    payload = {
        "voucher_type_id": 2, # Payment
        "date": str(date.today()),
        "narration": "Test Payment via script",
        "entries": [
            {
                "ledger_id": pl_id,
                "amount": 500.0,
                "is_debit": True # Dr Expense/PL
            },
            {
                "ledger_id": cash_id,
                "amount": 500.0,
                "is_debit": False # Cr Cash
            }
        ]
    }
    
    print("\nSending Voucher Payload:")
    print(json.dumps(payload, indent=2))
    
    resp = requests.post(f"{BASE_URL}/vouchers/", json=payload)
    print(f"\nResponse: {resp.status_code}")
    print(resp.json())
    
    assert resp.status_code == 200

if __name__ == "__main__":
    test_create_voucher()
