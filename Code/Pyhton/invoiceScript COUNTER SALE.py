import pyautogui as pag
import time

print("Keep TallyPrime Open and on Home Area")
print("This is for COUNTER SALE with \"C\" in Token No.")

x=int(input("Enter the First Token No.: "))
y=int(input("Enter the Last Token No.: "))

pag.hotkey("win","3") #open tally prime

pag.press("c")
pag.press("l")
pag.press("enter")


for token in range(x, y + 1):
    pag.typewrite("C" + str(token))
    pag.press("enter")
    pag.press("enter")
    pag.typewrite("sundry debtors")
    pag.press("tab")
    pag.hotkey("ctrl","a")

input()