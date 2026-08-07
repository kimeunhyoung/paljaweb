# AI·달력 1회 체험 결제

## 상품
| key | 가격 | 내용 | 범위 |
|---|---|---|---|
| `cal_pass_3d` | 1,900원 | 3일 이용 + AI 3크레딧 | **수비학 달력** |
| `ai_2` | 1,000원 | AI 2크레딧 | 점성학·수비학 달력 AI |
| `ai_5` | 2,000원 | AI 5크레딧 | 점성학·수비학 달력 AI |
| `ai_10` | 3,500원 | AI 10크레딧 | 점성학·수비학 달력 AI |

### 하위 호환 (URL·옛 링크)
| 예전 key | 실제 상품 |
|---|---|
| `ai_chart` / `ai_3` | `ai_2` |
| `ai_fortune` / `ai_6` | `ai_5` |
| `ai_topup` | `ai_10` |

## 배포 전 체크
1. Supabase SQL Editor에서 실행:
   - `database/ai_credit_orders.sql` (최초 1회)
   - `database/ai_credit_orders_fulfill.sql` (**지급 실패 복구용 `fulfilled_at`**)
2. Render 환경변수:
   - `LIFECODE_ONETIME_ENABLED=true` 또는 `AI_ONETIME_ENABLED=true`
   - PortOne 원타임 채널(`PORTONE_ONETIME_CHANNEL_KEY`) 설정
3. 결제 페이지: `/ai-buy.html?product=…`
4. 점성학·수비학 달력 잠금 UI에 CTA 연결됨

### 지급 복구
- 주문 `status=paid`만으로는 완료가 아님 → `fulfilled_at`이 있을 때만 완료
- confirm/webhook이 다시 호출되면 미지급 건에 크레딧을 보강합니다
