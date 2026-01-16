import pyautogui as pag
import time
import pyperclip as clip

limit=int(input("Enter limit:"))
time.sleep(2)
pag.hotkey('win', '3')
time.sleep(0.1)
pag.press('V')
pag.press('f8')
for i in range(limit):
    pag.hotkey("win","4") #open excel
    time.sleep(0.1)
    pag.hotkey("ctrl","c") #copy
    time.sleep(0.15)
    x=clip.paste()
    x=x[10:]
    clip.copy(x)
    time.sleep(0.15)
    pag.hotkey("win","3") #open tally
    pag.hotkey("ctrl","v") #paste
    pag.press('enter')
    #invoice no entered
    pag.typewrite('job card sale')
    pag.press('tab')

    pag.hotkey("win","4") #open excel
    pag.press('right')
    pag.hotkey("ctrl","c") #copy
    time.sleep(0.15)
    pag.hotkey("win","3") #open tally
    pag.hotkey("ctrl","v") #paste

    pag.hotkey("win","4") #open excel
    pag.press('right')
    pag.hotkey("ctrl","c") #copy
    time.sleep(0.15)
    pag.hotkey("win","3") #open tally
    pag.press('f2')
    pag.press('escape')
    pag.hotkey("ctrl","v") #paste
    time.sleep(0.3)
    pag.hotkey("ctrl","a") #save
    pag.hotkey("ctrl","a") #save
    time.sleep(0.3)
    pag.hotkey("win","4") #open excel
    pag.press("down")
    pag.press('left')
    pag.press('left')
    pag.hotkey("win","3") #open tally