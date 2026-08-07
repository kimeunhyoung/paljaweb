# AI·달력 1회 체험 결제

## 상품
| key | 가격 | 내용 | 원/크레딧 | 범위 |
|---|---|---|---|---|
| `ai_2` | 1,000원 | AI 2크레딧 | 500원 | 맛보기 · 짧은 운세 |
| `ai_5` | 2,000원 | AI 5크레딧 | 400원 | 차트(3)+여유 등 |
| `ai_10` | 2,500원 | AI 10크레딧 | 250원 | 가장 저렴 |
| `cal_pass_3d` | 1,900원 | 3일 이용 + AI 3크레딧 | — | **수비학 달력**만 열림 |

### 하위 호환 (URL·옛 링크)
| 예전 key | 실제 상품 |
|---|---|
| `ai_chart` / `ai_3` | `ai_2` |
| `ai_fortune` / `ai_6` | `ai_5` |
| `ai_topup` | `ai_10` |

## 배포 전 체크
1. Supabase SQL Editor에서 `database/ai_credit_orders.sql` 실행  
   - `profiles.ai_credits_bonus`  
   - `profiles.calendar_pass_until` (달력 3일 체험용)  
   - `ai_credit_orders` 테이블
2. Render 환경변수:
   - `LIFECODE_ONETIME_ENABLED=true` 또는 `AI_ONETIME_ENABLED=true`
   - PortOne 원타임 채널(`PORTONE_ONETIME_CHANNEL_KEY`) 설정
3. 결제 페이지: `/ai-buy.html?product=…`
4. 점성학·수비학 달력 잠금 UI에 CTA 연결됨
