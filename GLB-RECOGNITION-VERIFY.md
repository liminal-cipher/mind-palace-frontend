# GLB 객체 인식 파이프라인 — 전수 검증 & 일반화 (2026-06-19)

방(memory-walk)에 GLB를 넣으면 가구를 인식해 핫스팟 마커를 만드는 파이프라인을, **현재 23개 방 GLB 전수** + **새 GLB 일반화** 관점에서 검증한 기록.

## 파이프라인 (요약)
정규화(폭 7.2) → ① **FURN_RE 이름표 패스**(메쉬 이름→가구 단어) → ② **기하학 후보 패스**(크기·위치·**모양** 필터) → `inferFurnLabel`(계층 이름) 실패 시 `geomGuess`(바운딩박스 추정) → 디클러스터(MINSEP)·`mergeAnchors` → 동선(`designRoute`)·카메라(`clearViewPos`).

핵심 성질: **데이터 구동**(GLB별 하드코딩 없음) — 같은 규칙이 모든 GLB·새 GLB에 적용됨.

## 검증 전략
1. **정적 분류** — 각 GLB의 glTF 노드 이름을 분석해 **명명(NAMED)** vs **무명(NAMELESS)** 분류. 명명=FURN_RE/inferFurnLabel로 실제 이름, 무명=geomGuess 의존(위험군).
2. **동적 검증** — 위험군(무명) + 표본을 실제 배포 페이지에서 구동해 `window.mpRoom`/`window.__mpDetectReport` 덤프, 기준 대비 판정.
3. **기준** — 마커 수 4~24, 구조물(벽·바닥·천장) 미포함, 한 종류 과다(=벽 누수 신호) 없음. (단 카페·교실의 의자·책상 다수는 정상)

## 정적 분류 결과 (23개)
- **NAMED 16**: dining, living, retro, bedroom, lounge, apartamento, studio-mono, pool-house, night-lounge, classroom-bright, kitchen-counter, simple-living, valdene-home, white-living, office, (검증된 패턴) → 실제 이름 사용, 안전.
- **NAMELESS 7**: paris, master-suite, kitchen-island, salon-cafe, concrete-room, apartment-interior, silvania-home → geomGuess 의존(집중 검증 대상).

## 동적 검증 결과 (실측)
| GLB | 분류 | 결과 | 판정 |
|-----|------|------|------|
| modern_bedroom | NAMED | 13 (창문·침대·의자·소파·식탁·러그·쿠션·카운터) | ✓ |
| living_room | NAMED | 13 (창문·소파·의자·식탁·화분·수납장) | ✓ ("umbrella" 1건 미번역) |
| apartment-interior | NAMELESS | 13→**11** (수납장 6→2, 균형) | ✓ 수정됨 |
| room_paris | NAMELESS | 10 (침대3·수납장2·의자2·조명·소파·식탁) | ✓ |
| kitchen-island | NAMELESS | 13 (테이블3·수납장3·소파2·스탠드2·의자2) | ✓ |
| salon-cafe | NAMELESS | 14 (의자7·소품3·…) | ✓ 카페=의자 많음(정상) |
| concrete-room | NAMELESS | 8→**5** (수납장 5→2) | ✓ 수정됨 |
| master-suite | NAMELESS | 3 (소품2·침대1) | ⚠ 희박 |
| silvania-home | NAMELESS | 5 (스탠드2·소품3) | ⚠ 희박·일반적 |

## 검증 중 발견·수정한 문제
1. **벽 누수 → "수납장" 과검출** (무명 GLB): 벽·바닥·기둥이 "Object_N"이라 이름기반 STRUCT_RE를 통과 → geomGuess가 "키 크고 넓음=수납장"으로 오분류(apartment 수납장 6개, concrete 5개).
   - **수정**: 후보 필터에 **모양 기반 구조물 제외** 추가 — (a) 얇고 큰 면=벽·칸막이, (b) 아주 납작·거대=바닥/천장 슬래브, (c) **바닥~천장 전체높이로 큰 것=벽·기둥**(전체높이 가구는 드묾; 스탠드·조명 같은 얇은 키큰 것은 보존). → apartment 6→2, concrete 5→2.
   - **수정**: `geomGuess` 임계값 보정 — "수납장"은 깊이 있는(thin>0.35) 키큰 것만, 낮은 가구(러그·침대·소파) 우선 판정.
2. **명명 GLB 회귀 없음**: 명명 GLB는 FURN_RE 경로라 기하학 필터 변경의 영향 없음(bedroom 13개 동일 확인).

## 남은 한계 (기하학 인식의 본질)
- **희박 GLB**(master-suite·silvania): 메쉬가 적거나 병합·모호하면 geomGuess가 소품/스탠드 위주로 빈약하게 인식. 벽 누수·과검출은 없으나 풍부하지 않음.
- 근본 해결은 **비전**(아래). PDF 학습 시엔 buildRoute가 부족한 마커를 합성 보강하므로 학습 흐름엔 지장 적음.

## 새 GLB 일반화 (이게 곧 "새 GLB 적용 검증")
1. **무수정 적용**: 파이프라인이 데이터 구동이라 새 GLB도 동일 규칙(이름추론→기하학→구조물제외→geomGuess)이 자동 적용.
2. **자가검사**: 검출 직후 `window.__mpDetectReport = {glb,count,byType,warn}` + 콘솔 `[mp-detect] …` 로 품질 보고. 새 GLB 추가 시 콘솔만 봐도 `sparse`(<4)·`skewed`(한 종류>5) 경고로 점검 가능.
3. **정밀 보정**: 인식이 약한 사물은 **"정밀" 버튼**(크롭→gpt-4.1 비전 `/api/vision-label`)으로 사람이 즉석 교정.
4. **권장 기준**(새 GLB 품질): NAMED(메쉬 이름에 가구 단어)면 최상. 무명이면 위 자가검사로 sparse/skewed 확인 후, 필요 시 정밀 보정 또는 더 잘 명명된 GLB로 교체.

## 검증 도구(재사용)
- 정적 분류: glTF JSON 청크의 노드 이름을 FURN/GENERIC 정규식으로 카운트 → NAMED/NAMELESS.
- 동적: `memory-walk.html?glb=<URL>` 로드 후 콘솔의 `window.__mpDetectReport` 확인(또는 `[mp-detect]` 로그).
