# Petit Lenormand 카드 이미지

경로: `public/lenormand/{NN}-{en}.webp`  
코드 매핑: [`js/lenormand-deck.js`](../js/lenormand-deck.js) 의 `imageSrc`

예: `01-rider.webp` … `36-cross.webp`

이미지가 없어도 AI 리딩·검색은 동작합니다. 미리보기만 placeholder/숨김.

---

## Midjourney 공통 스타일 (복붙 뼈대)

시판 덱을 베끼지 말고 **전통 상징만** 그릴 것. 동일 시드/스타일로 36장 통일.

```
Petit Lenormand oracle card illustration, traditional European fortune-telling card,
centered emblem of {SUBJECT}, cream parchment background, soft warm brown ink linework,
subtle gold accents, ornate thin border frame, flat graphic poster style,
no photoreal people faces, no modern logos, no text, no watermark,
square card composition --ar 2:3 --stylize 120 --v 6
```

`{SUBJECT}` 자리에 아래 영문 상징을 넣습니다.

| # | file | SUBJECT |
|--|--|--|
| 01 | 01-rider | a messenger on horseback riding left to right |
| 02 | 02-clover | a four-leaf clover |
| 03 | 03-ship | a sailing ship on water |
| 04 | 04-house | a small house with chimney |
| 05 | 05-tree | a large rooted tree |
| 06 | 06-clouds | dark and light clouds swirling |
| 07 | 07-snake | a coiled snake |
| 08 | 08-coffin | a closed coffin with drapery |
| 09 | 09-bouquet | a bouquet of flowers |
| 10 | 10-scythe | a curved scythe |
| 11 | 11-whip | a birch whip / rod |
| 12 | 12-birds | two small birds on a branch |
| 13 | 13-child | a small child figure silhouette (no face detail) |
| 14 | 14-fox | a fox sitting alert |
| 15 | 15-bear | a standing bear |
| 16 | 16-stars | a night sky with bright stars |
| 17 | 17-stork | a stork in flight |
| 18 | 18-dog | a loyal dog sitting |
| 19 | 19-tower | a tall stone tower |
| 20 | 20-garden | a formal garden gate with flowers |
| 21 | 21-mountain | a steep mountain peak |
| 22 | 22-crossroads | a forked path / crossroads |
| 23 | 23-mice | two mice near grain |
| 24 | 24-heart | a classic heart emblem |
| 25 | 25-ring | an ornate ring |
| 26 | 26-book | a closed book |
| 27 | 27-letter | a sealed letter / envelope |
| 28 | 28-man | a gentleman silhouette from behind or side (no face) |
| 29 | 29-woman | a lady silhouette from behind or side (no face) |
| 30 | 30-lily | white lilies |
| 31 | 31-sun | a radiant sun |
| 32 | 32-moon | a crescent moon |
| 33 | 33-key | an antique key |
| 34 | 34-fish | two fish |
| 35 | 35-anchor | a ship anchor |
| 36 | 36-cross | a simple cross |

## 작업 순서
1. 공통 프롬프트로 1장 시안 → 스타일 확정  
2. 같은 `--sref` / 시드로 36장 배치  
3. webp로 저장 후 이 폴더에 파일명 맞춰 넣기  
4. 캐시 bust: `lenormand-deck.js?v=` 올리기
