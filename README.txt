GK KIOSK ADS v1

ALMASHTIRILADI:
crm/src/pages/KioskPage.jsx

NIMA O'ZGARDI:
- IDLE kutish ekrani reklama/informatsiya slayderiga aylandi.
- EXPIRED holatida ham "QR-kod muddati tugadi" ekrani o'rniga reklama ko'rinadi.
- 4 ta tayyor slayd 7 soniyada avtomatik almashadi:
  1. Ipoteka
  2. Mikroqarz
  3. Ko'chmas mulk
  4. Golden Key OS raqamli xizmatlar
- Operator QR chiqarsa, reklama darhol yo'qoladi va QR chiqadi.
- Shartnoma tasdiqlansa 5 soniya "Muvaffaqiyatli" ko'rinadi, keyin reklama qaytadi.
- Backendga tegilmaydi.
- QR ishlash mantig'i o'zgarmaydi.

DEPLOY:
1) KioskPage.jsx ni crm/src/pages ichiga almashtiring.
2) Commit -> Push.
3) Frontend deploy.
4) Telefon kiosk sahifasini yangilang.

KEYINGI VERSIYA:
Admin paneldan reklama rasmlari/video va ko'rsatish vaqtini boshqarish.
