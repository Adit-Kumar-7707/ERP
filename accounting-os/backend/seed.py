import logging
from app.db.session import SessionLocal, engine
from app.modules.accounting.models import Account, AccountType
from app.modules.auth.models import User, UserRole
from app.modules.organization.models import Organization
from app.modules.vouchers.models import VoucherType, VoucherSequenceType
from app.modules.inventory.models import StockGroup, StockItem, UnitOfMeasure
from app.modules.masters.models import CostCenter
from app.modules.rules.models import Rule, RuleAction, RuleEvent
from app.core.security import get_password_hash
from app.db.base import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    # DROP ALL TABLES TO APPLY NEW SCHEMA (Hierarchy)
    logger.info("Dropping all tables to reset schema...")
    Base.metadata.drop_all(bind=engine)
    logger.info("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()

    # 1. Seed Organization
    if not db.query(Organization).first():
        org = Organization(
            name="Demo Company Pvt Ltd",
            currency_symbol="$",
            features={"inventory": True, "gst": False}
        )
        db.add(org)
    
    # 2. Seed Users
    owner = User(
        email="owner@example.com",
        hashed_password=get_password_hash("password"),
        full_name="Business Owner",
        role=UserRole.OWNER
    )
    db.add(owner)
    
    accountant = User(
        email="accountant@example.com",
        hashed_password=get_password_hash("password"),
        full_name="Jane Accountant",
        role=UserRole.ACCOUNTANT
    )
    db.add(accountant)
    db.commit() # Commit users to handle potential FKs if any (none yet)

    # 3. Seed Hierarchical Chart of Accounts
    # GROUPS
    assets = Account(code="1000", name="Assets", type=AccountType.ASSET, is_group=True)
    liabilities = Account(code="2000", name="Liabilities", type=AccountType.LIABILITY, is_group=True)
    income = Account(code="3000", name="Income", type=AccountType.INCOME, is_group=True)
    expenses = Account(code="4000", name="Expenses", type=AccountType.EXPENSE, is_group=True)
    
    db.add_all([assets, liabilities, income, expenses])
    db.commit() # Commit to get IDs

    # SUB-GROUPS & LEDGERS
    current_assets = Account(code="1100", name="Current Assets", type=AccountType.ASSET, is_group=True, parent_id=assets.id)
    bank_accounts = Account(code="1110", name="Bank Accounts", type=AccountType.ASSET, is_group=True, parent_id=current_assets.id) # Will set parent after commit
    
    db.add(current_assets)
    db.commit()
    
    # We need to refresh or re-fetch to safely use IDs if we were doing complex logic, 
    # but for simple seeding we can just chain commits or use object references if session is active.
    # However, setting parent_id=current_assets.id works because current_assets.id is populated after commit.
    
    bank_accounts.parent_id = current_assets.id
    db.add(bank_accounts)
    db.commit()

    # LEDGERS
    cash = Account(code="1001", name="Cash in Hand", type=AccountType.ASSET, is_group=False, parent_id=current_assets.id)
    hdfc = Account(code="1002", name="HDFC Bank", type=AccountType.ASSET, is_group=False, parent_id=bank_accounts.id)
    
    sales = Account(code="3001", name="Sales Account", type=AccountType.INCOME, is_group=False, parent_id=income.id)
    rent = Account(code="4001", name="Rent Expense", type=AccountType.EXPENSE, is_group=False, parent_id=expenses.id)
    
    payable = Account(code="2001", name="Accounts Payable", type=AccountType.LIABILITY, is_group=False, parent_id=liabilities.id)

    db.add_all([cash, hdfc, sales, rent, payable])
    db.commit()
    
    # 4. Seed Voucher Types
    
    v_sales = VoucherType(name="Sales Invoice", type_group="Sales", prefix="INV-", sequence_type=VoucherSequenceType.AUTOMATIC)
    v_purchase = VoucherType(name="Purchase Invoice", type_group="Purchase", prefix="PUR-", sequence_type=VoucherSequenceType.AUTOMATIC)
    v_payment = VoucherType(name="Payment", type_group="Payment", prefix="PMT-", sequence_type=VoucherSequenceType.AUTOMATIC)
    v_receipt = VoucherType(name="Receipt", type_group="Receipt", prefix="RCP-", sequence_type=VoucherSequenceType.AUTOMATIC)
    v_journal = VoucherType(name="Journal", type_group="Journal", prefix="JV-", sequence_type=VoucherSequenceType.AUTOMATIC)
    
    db.add_all([v_sales, v_purchase, v_payment, v_receipt, v_journal])
    db.commit()

    # 5. Seed Inventory
    # UOM
    uom_nos = UnitOfMeasure(name="Numbers", symbol="Nos", precision=0)
    uom_kgs = UnitOfMeasure(name="Kilograms", symbol="Kgs", precision=2)
    db.add_all([uom_nos, uom_kgs])
    db.commit()
    
    # Groups
    g_hardware = StockGroup(name="Hardware")
    g_software = StockGroup(name="Software")
    db.add_all([g_hardware, g_software])
    db.commit()
    
    # Items
    i_drill = StockItem(name="Power Drill", part_number="PD-001", group_id=g_hardware.id, uom_id=uom_nos.id, gst_rate=18.0)
    i_win = StockItem(name="Windows 11 License", part_number="SW-001", group_id=g_software.id, uom_id=uom_nos.id, gst_rate=18.0)
    
    db.add_all([i_drill, i_win])
    db.commit()

    # 6. Seed Cost Centers
    cc_ho = CostCenter(name="Head Office", code="HO")
    cc_marketing = CostCenter(name="Marketing", code="MKT")
    db.add_all([cc_ho, cc_marketing])
    db.commit()

    # 7. Seed Price Levels
    from app.modules.masters.models import PriceLevel
    pl_std = PriceLevel(name="Standard Price")
    pl_whole = PriceLevel(name="Wholesale Price")
    db.add_all([pl_std, pl_whole])
    db.commit()

    # 8. Seed Rules
    r_high_value = Rule(
        name="High Value Check", 
        condition="entry.amount > 50000", 
        action=RuleAction.WARN, 
        message="This is a high value transaction. Please verify.",
        event=RuleEvent.BEFORE_SAVE
    )
    db.add(r_high_value)
    db.commit()

    logger.info("Database seeded including Rules!")

if __name__ == "__main__":
    init_db()
