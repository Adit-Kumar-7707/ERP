from app.modules.vouchers.schemas import VoucherCreate, VoucherEntryCreate, BillAllocationCreate
from datetime import date

# Test Schema Instantiation to ensure Pydantic is happy
try:
    v = VoucherCreate(
        voucher_type_id=1,
        date=date.today(),
        entries=[
            VoucherEntryCreate(
                ledger_id=101,
                amount=1000,
                is_debit=True,
                bill_allocations=[
                     BillAllocationCreate(
                         ref_type="New Ref",
                         ref_name="INV/001",
                         amount=1000,
                         credit_period=date.today()
                     )
                ]
            ),
             VoucherEntryCreate(
                ledger_id=202,
                amount=1000,
                is_debit=False
            )
        ]
    )
    print("Schema Validation Passed")
    print(v.json())
except Exception as e:
    print(f"Schema Validation Failed: {e}")
