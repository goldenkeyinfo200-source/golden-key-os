Golden Key OS — Нотариус backend модули

Файллар:
1) schema.prisma -> prisma/schema.prisma
2) notaries.js -> backend routes папкасига (banks.js/appraisals.js турган жой)
3) index.js -> routes/index.js ўрнига
4) auth.js -> routes/auth.js ўрнига

Муҳим ҳуқуқлар:
- Нотариусга заявка юбориш: фақат SUPER_ADMIN ва RECEPTION_MANAGER.
- RECEPTION_MANAGER фақат ўзига бириктирилган мурожаатни юборади.
- NOTARY: қабул қилади, текширади, камчилик ёзади, ҳужжат тайёрлигини/қабулга тайёрлигини белгилайди.
- EXECUTOR: фақат ўзига бириктирилган ишни нотариусда якунланган деб белгилайди.
- SUPER_ADMIN: назорат ва бекор қилиш ҳуқуқига эга.

Ўрнатгандан кейин:
npx prisma format
npx prisma generate
npx prisma db push

Сўнг backend deploy қилинади.
