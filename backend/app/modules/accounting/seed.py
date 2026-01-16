from sqlalchemy.orm import Session
from app.modules.accounting.models import AccountGroup, GroupNature, VoucherType, VoucherTypeNature

def seed_tally_groups(db: Session):
    """
    Populates the 28 Pre-defined Groups found in Tally Prime.
    """
    # 1. Define Hierarchy
    # Format: (Name, Nature, AffectsGP, ParentName)
    # If ParentName is None, it's a Primary Group.
    
    # Primary Groups (15)
    primaries = [
        ("Branch / Divisions", GroupNature.LIABILITIES, False),
        ("Capital Account", GroupNature.LIABILITIES, False),
        ("Current Assets", GroupNature.ASSETS, False),
        ("Current Liabilities", GroupNature.LIABILITIES, False),
        ("Direct Expenses", GroupNature.EXPENSES, True),
        ("Direct Incomes", GroupNature.INCOME, True),
        ("Fixed Assets", GroupNature.ASSETS, False),
        ("Indirect Expenses", GroupNature.EXPENSES, False),
        ("Indirect Incomes", GroupNature.INCOME, False),
        ("Investments", GroupNature.ASSETS, False),
        ("Loans (Liability)", GroupNature.LIABILITIES, False),
        ("Misc. Expenses (ASSET)", GroupNature.ASSETS, False),
        ("Purchase Accounts", GroupNature.EXPENSES, True),
        ("Sales Accounts", GroupNature.INCOME, True),
        ("Suspense A/c", GroupNature.LIABILITIES, False),
    ]

    # Secondary Groups (13) - Mapped to Primaries
    secondaries = [
        ("Bank Accounts", "Current Assets"),
        ("Bank OD A/c", "Loans (Liability)"),
        ("Cash-in-hand", "Current Assets"),
        ("Deposits (Asset)", "Current Assets"),
        ("Duties & Taxes", "Current Liabilities"),
        ("Loans & Advances (Asset)", "Current Assets"),
        ("Provisions", "Current Liabilities"),
        ("Reserves & Surplus", "Capital Account"),
        ("Retained Earnings", "Capital Account"), # Typical Tally behavior
        ("Secured Loans", "Loans (Liability)"),
        ("Stock-in-hand", "Current Assets"),
        ("Sundry Creditors", "Current Liabilities"),
        ("Sundry Debtors", "Current Assets"),
        ("Unsecured Loans", "Loans (Liability)"),
    ]

    # 2. Create Primaries
    created_map = {} # Name -> Obj

    for name, nature, affects_gp in primaries:
        exists = db.query(AccountGroup).filter(AccountGroup.name == name).first()
        if not exists:
            group = AccountGroup(
                name=name,
                nature=nature,
                affects_gross_profit=affects_gp,
                is_reserved=True,
                parent_id=None
            )
            db.add(group)
            db.flush() # To get ID
            created_map[name] = group
            print(f"Created Primary Group: {name}")
        else:
             created_map[name] = exists

    # 3. Create Secondaries
    for name, parent_name in secondaries:
        exists = db.query(AccountGroup).filter(AccountGroup.name == name).first()
        if not exists:
            parent = created_map.get(parent_name)
            if not parent:
                # Try fetching if not in current map (e.g. run 2)
                parent = db.query(AccountGroup).filter(AccountGroup.name == parent_name).first()
            
            if parent:
                group = AccountGroup(
                    name=name,
                    nature=parent.nature, # Inherit nature
                    affects_gross_profit=parent.affects_gross_profit, # Inherit
                    is_reserved=True,
                    parent_id=parent.id
                )
                db.add(group)
                print(f"Created Secondary Group: {name} (Under {parent_name})")
            else:
                print(f"ERROR: Parent {parent_name} not found for {name}")

    db.commit()
    print("Tally Standard Hierarchy Seeding Complete.")

def seed_voucher_types(db: Session):
    from app.modules.accounting.models import VoucherType, VoucherTypeNature
    
    # Standard Tally Voucher Types
    types = [
        ("Contra", VoucherTypeNature.CONTRA),
        ("Payment", VoucherTypeNature.PAYMENT),
        ("Receipt", VoucherTypeNature.RECEIPT),
        ("Journal", VoucherTypeNature.JOURNAL),
        ("Sales", VoucherTypeNature.SALES),
        ("Purchase", VoucherTypeNature.PURCHASE),
        ("Credit Note", VoucherTypeNature.JOURNAL), # Traditionally specific
        ("Debit Note", VoucherTypeNature.JOURNAL),
    ]
    
    for name, nature in types:
        exists = db.query(VoucherType).filter(VoucherType.name == name).first()
        if not exists:
            vt = VoucherType(
                name=name,
                nature=nature,
                numbering_method="Automatic"
            )
            db.add(vt)
            print(f"Created Voucher Type: {name}")
            
    db.commit()
    print("Voucher Type Seeding Complete.")

def seed_default_ledgers(db: Session):
    from app.modules.accounting.models import Ledger, AccountGroup
    
    defaults = [
        ("Cash", "Cash-in-hand"),
        ("Profit & Loss A/c", "Primary") # Specialized in Tally, mapped to Primary but special behavior
    ]
    
    for name, group_name in defaults:
        exists = db.query(Ledger).filter(Ledger.name == name).first()
        if not exists:
            # specialized logic for P&L which is weird in Tally (it's a text entry in chart, but acts like a ledger/group hybrid)
            # For this clone, we treat it as a special Ledger under 'Capital Account' or 'Reserves' if Primary is not valid for Ledger?
            # Actually Tally allows Ledgers under Primary? No, usually Groups.
            # "Profit & Loss A/c" is a reserved Primary Group in some views, or a Ledger.
            # Let's put P&L under "Retained Earnings" or "Reserves & Surplus" for now to fit SQL strictness.
            # Cash is easy.
            
            target_group_name = group_name
            if name == "Profit & Loss A/c":
                 target_group_name = "Retained Earnings" # Best approximation
            
            group = db.query(AccountGroup).filter(AccountGroup.name == target_group_name).first()
            if group:
                ledger = Ledger(
                    name=name,
                    group_id=group.id,
                    opening_balance=0.0
                )
                db.add(ledger)
                print(f"Created Default Ledger: {name}")
    
    db.commit()
    print("Default Ledger Seeding Complete.")
