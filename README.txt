GK KIOSK IMAGE CAROUSEL v3

ALMASHTIRILADI:
crm/src/pages/KioskPage.jsx

RASMLAR:
crm/public/kiosk-ads/ad-1.png
crm/public/kiosk-ads/ad-2.png
crm/public/kiosk-ads/ad-3.png
crm/public/kiosk-ads/ad-4.png

ISHLASHI:
- Kutish rejimida faqat BITTA rasm ko'rinadi.
- Har 7 soniyada keyingi rasmga o'tadi.
- 4-rasmdan keyin yana 1-rasmga qaytadi.
- Rasm kesilmaydi: objectFit=contain.
- Scroll yo'q.
- QR_READY bo'lsa reklama darhol to'xtaydi va QR chiqadi.
- SIGNED bo'lsa muvaffaqiyatli ekran ko'rinadi, keyin reklama qaytadi.
- Backend o'zgarmaydi.

DEPLOY:
1) KioskPage.jsx ni almashtiring
2) ad-1.png ... ad-4.png public/kiosk-ads ichida ekanini tekshiring
3) Commit -> Push
4) Frontend deploy
5) Telefon kiosk sahifasini yangilang
