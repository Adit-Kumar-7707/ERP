import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.modules.tax.engine import calculate_gst, determine_place_of_supply

def test_gst_calculation():
    print("--- Testing GST Engine ---")
    
    # 1. Intra State (18% on 1000)
    print("Test 1: Intra-State 18% on 1000")
    res = calculate_gst(1000.0, 18.0, is_inter_state=False)
    assert res.cgst_amount == 90.0
    assert res.sgst_amount == 90.0
    assert res.igst_amount == 0.0
    assert res.total_tax == 180.0
    print("Passed.")
    
    # 2. Inter State (18% on 1000)
    print("Test 2: Inter-State 18% on 1000")
    res = calculate_gst(1000.0, 18.0, is_inter_state=True)
    assert res.cgst_amount == 0.0
    assert res.sgst_amount == 0.0
    assert res.igst_amount == 180.0
    print("Passed.")
    
    # 3. Place of Supply
    print("Test 3: Place of Supply")
    assert determine_place_of_supply("Karnataka", "Karnataka") == "Intra"
    assert determine_place_of_supply("Karnataka", "Kerala") == "Inter"
    assert determine_place_of_supply("Karnataka", " karnataka ") == "Intra" # Case/Space check
    print("Passed.")
    
    print("--- All GST Tests Passed ---")

if __name__ == "__main__":
    test_gst_calculation()
