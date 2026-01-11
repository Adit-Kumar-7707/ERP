import sqlite3

def fix_db():
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    columns = [
        ("address", "VARCHAR"),
        ("gstin", "VARCHAR"),
        ("email", "VARCHAR"),
        ("website", "VARCHAR")
    ]
    
    for col, type_ in columns:
        try:
            print(f"Adding column {col}...")
            cursor.execute(f"ALTER TABLE organization ADD COLUMN {col} {type_}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print(f"Column {col} already exists.")
            else:
                print(f"Error adding {col}: {e}")
                
    conn.commit()
    conn.close()
    print("Database patched successfully.")

if __name__ == "__main__":
    fix_db()
