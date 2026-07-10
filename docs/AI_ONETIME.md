# AI 1회 체험 결제

## 상품
| key | 가격 | 크레딧 | 설명 |
|---|---|---|---|
| `ai_chart` | 1,000원 | 2 | AI 차트 해석 1회 |
| `ai_fortune` | 2,900원 | 5 | 차트·트랜짓·올해 운세 등 체험 |

## 배포 전 체크
1. Supabase SQL Editor에서 `database/ai_credit_orders.sql` 실행
2. Render 환경변수:
   - `LIFECODE_ONETIME_ENABLED=true` 또는 `AI_ONETIME_ENABLED=true`
   - PortOne 원타임 채널(`PORTONE_ONETIME_CHANNEL_KEY`) 설정
3. 결제 페이지: `/ai-buy.html`
4. 점성학 잠금 UI에 「1회 체험 1,000원」 CTA 연결됨
