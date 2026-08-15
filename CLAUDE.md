# sand-box — 작업 컨텍스트

여러 기기에서 이어서 작업하기 위한 문서입니다. 새 세션은 이 파일부터 읽으면 됩니다.

## 이 저장소

브라우저에서 바로 도는 실험용 프로젝트 모음. GitHub Pages 로 서빙됩니다.

- 사이트 루트: <https://mincho-dan.github.io/sand-box/> (랜딩 페이지는 `site/index.html`)
- 저장소: <https://github.com/MinCho-Dan/sand-box>

| 프로젝트 | 경로 | 배포 주소 |
|---|---|---|
| 이세계전사 김대원 | `isekai-kimdaewon/` | `/sand-box/isekai-kimdaewon/` |
| 퇴근까지 버텨라 | `clockout-defense/` | `/sand-box/clockout-defense/` |

## 시작하기 (새 기기)

```bash
git clone https://github.com/MinCho-Dan/sand-box.git
cd sand-box/isekai-kimdaewon
npm ci
npm test        # vitest 66개
npm run dev     # 개발 서버
```

`npm run build` 는 `tsc --noEmit` 을 먼저 돌리므로 타입 오류가 있으면 빌드가 멈춥니다.

`clockout-defense/` 는 `npm ci && npm run dev` 만 하면 됩니다(테스트 없음, `tsc -b && vite build` 로 빌드).

## 배포

`main` 에 푸시하면 `.github/workflows/deploy.yml` 이 **테스트 → 빌드 → Pages 배포**를 수행합니다.
테스트가 깨지면 배포되지 않습니다. Pages 소스는 브랜치가 아니라 **GitHub Actions** 로 설정돼 있습니다.

워크플로는 `_site` 를 조립합니다: 루트에 `site/index.html`, 하위에 각 프로젝트의 `dist/`.
프로젝트를 추가하면 워크플로의 "Assemble site" 단계와 `site/index.html` 목록에 한 줄씩 추가하면 됩니다.

## 이세계전사 김대원

세로형(540×972) 탑다운 액션. 상단 108px 는 HUD, 하단 180px 는 조작 밴드,
가운데 540×684(15×19 타일)가 아레나. 월드 좌표는 아레나 기준이고
렌더링할 때만 `HUD_H` 만큼 내려 그립니다.

**스토리 모드**(고정 8스테이지)와 **무한모드**(죽을 때까지 파도가 이어짐) 두 축입니다.
`state.mode: "story" | "endless"` 로 갈립니다.

### 구조

```
src/
  config.ts      해상도·팔레트(COL/UI)·테마·Supabase 설정
  types.ts       공용 타입
  data/          chapters · enemies · weapons · upgrades (순수 데이터)
  core/          state · map · input · inputState · controlMode · save · fx · util
  assets/        sprites(도트 데이터) · bake(스프라이트 굽기) · keyart(타이틀 배경)
  systems/       combat · enemies · items · shop · ranking · ui · update
  render/        ctx · world · hud · screens · index(디스패처)
  audio/         효과음 + 배경음악 (오디오 파일 없이 Web Audio 합성)
  ui/            rankForm (랭킹 등록 DOM 폼)
public/          정적 파일. 여기에 keyart.png 를 넣으면 타이틀 배경이 된다
scripts/         개발 도구 (게임 번들에 안 들어간다)
tests/           vitest
```

의존성 방향: `data → core → systems → render → main`. **순환을 만들지 마세요.**
이미 두 곳을 이 원칙 때문에 비틀어 놨습니다.

- `core/inputState.ts` 는 아무것도 import 하지 않습니다. `state ↔ input` 순환을 피하려고
  입력 플래그만 따로 뗀 파일입니다.
- `audio/bgmTick(mood)` 은 씬을 직접 보지 않고 mood 를 인자로 받습니다.

`state` 는 `core/state.ts` 의 `export let` 이고 재할당은 `newGame()` 안에서만 일어납니다.
다른 모듈은 라이브 바인딩으로 읽기만 하세요.

### 반드시 알아야 할 결정들

**화면 크기는 JS 가 픽셀로 지정합니다** (`main.ts` 의 `fitCanvas`).
`100vh` 는 모바일 주소창 때문에 실제 보이는 높이보다 커서 화면이 잘리고,
`aspect-ratio` 도 height 가 확정된 상태에서는 `max-width` 클램프에 비율이 깨집니다.
둘 다 실제로 겪은 버그입니다. CSS 의 `aspect-ratio` 는 JS 실행 전 폴백일 뿐입니다.

**입력 게이트** — 씬 전환 시 `setScene(scene, lock)` 이 짧은 잠금을 걸고 대기 중인 입력을 버립니다.
보스를 잡으려 연타하던 손가락이 엔딩을 넘겨버리거나 상점에서 오결제되던 버그의 수정입니다.
공격·회피 버튼은 **어떤 경우에도** 씬을 진행시키면 안 됩니다. 회귀 테스트가 걸려 있습니다.

**터치 UI 는 마지막으로 쓴 입력 장치를 따라갑니다.** 한 번 켜고 끝내면 터치 지원 PC 에서
화면 버튼이 계속 남습니다.

**랭킹은 클라이언트에서 삭제할 수 없습니다.** RLS 에 delete 정책이 없고 있어서도 안 됩니다.
닉네임당 최고점 유지는 `supabase.sql` 의 `security definer` 트리거가 담당합니다.
클라이언트는 POST 응답이 빈 배열인지로 갱신 여부를 판단합니다.

**`SUPABASE_ANON_KEY` 는 publishable(공개) 키입니다.** 클라이언트 노출이 정상이며
실제 보호는 RLS 정책이 합니다. `service_role` / `sb_secret_` 키는 절대 넣지 마세요 —
테스트가 이를 검사합니다.

**그림은 키 아트에서 시작한다.** 팔레트(`config.ts` 의 `COL`/`UI`)와 도트 스프라이트
(`assets/sprites.ts`)는 전부 타이틀 키 아트 — 남색 폭풍우 하늘, 금색 타이틀, 시안 검기,
주황 화염, 보라 균열 — 에서 색을 뽑았다. 색을 새로 들일 때는 이 다섯 갈래 안에서 고른다.

**키 아트 파일은 `public/keyart.png`** (jpg·jpeg·webp 도 자동으로 잡는다).
파일이 없어도 게임은 돌아가고, 타이틀만 도형으로 그린 폴백 화면이 된다.

**도트 스프라이트는 문자열 그림이다.** `assets/sprites.ts` 에서 한 글자가 한 픽셀이고,
`assets/bake.ts` 가 오프스크린 캔버스에 한 번 구워 그 뒤로는 `drawImage` 만 한다.
행 길이가 어긋나면 예외가 나고 테스트가 잡는다. 캔버스를 만들 수 없는 환경에서는
`blit` 이 false 를 돌려주고 호출한 쪽이 도형 그리기로 넘어간다 — 그래서 테스트가 돈다.

**하단 180px(`CTRL_H`, 5타일)는 아레나에서 제외된 예약 공간이다.** 터치 버튼이 적이나
아이템을 가리지 않도록 아레나 자체를 그만큼 줄였다(`MH` 24→19). 처음엔 72px(2타일)로
시작했다가 "버튼이 너무 아래에 있다"는 피드백을 받고 2.5배로 늘렸다 — 아레나는 거의
그대로 두고 조작 쪽에 여유를 몰아준 것. PC 모드에서는 `drawControlBand()` 가 그 자리에
조작 안내 텍스트를 채운다 — 빈 공간으로 두지 않는다. 아레나/HUD 크기를 건드릴 땐
반드시 `HUD_H + AH + CTRL_H === H` 를 유지해야 한다.

**터치 조작은 드래그형/고정형 두 가지다** (`core/controlMode.ts`, 타이틀의 "이동:" 버튼).
드래그형은 손가락이 닿은 자리에 조이스틱이 뜨는 기존 방식(아날로그). 고정형은
화면 고정 위치에 나타나는 디지털 십자키 — 각도를 8방향(45° 단위)으로 스냅하고
크기도 조작 밴드 안에 들어가게 CSS 로 따로 줄인다(`body.ctrlfixed` 클래스).
**이 클래스는 반드시 `main.ts` 에서 rAF 루프 시작 전에 한 번 직접 설정해야 한다** —
루프 안에서만 토글하면 첫 프레임 전에는 드래그용(더 큰) 크기로 그려져 조작 밴드를
넘친다. 실제로 겪은 버그다(Browser pane 에서 rAF 가 안 도는 동안 재현됨).

**스토리/무한모드는 `CHAPTERS[i]` 를 직접 읽지 않고 `currentChapter(i)` 를 거친다**
(`core/state.ts`). 무한모드는 `data/chapters.ts` 의 `endlessChapter(wave)` 가 파도
번호로 즉석에서 구성을 계산한다 — `boss` 타입은 절대 안 쓴다(엔딩을 트리거하는
전용 타입이라 섞으면 런이 그대로 끝나버린다). 화면에 "STAGE n/8" 대신 "ROUND n" 을
보여줄 곳은 `chapterLabel(i)` 를 쓰고, `CHAPTERS.length` 를 전제로 한 `stageTrack()`
호출은 전부 `state.mode === "story"` 로 감싼다. 무한모드 체력·속도 배율은 **상한이 없다**
(`hpMult = 1 + i*0.05`, `spdMult = 1 + i*0.02`) — 언젠가 죽는 게 무한모드의 요점이라
인위적인 천장을 두지 않기로 했다.

**상점 업그레이드 상한도 무한모드에서는 일부만 풀린다.** 적이 끝없이 세지니 받아치는
쪽(체력·공격력)도 끝없이 오를 수 있어야 한다는 요청으로, `data/upgrades.ts` 의
`UNCAPPED_IN_ENDLESS = ["hp", "atk"]` 에 든 능력치만 무한모드에서 레벨 상한(`UP_MAX=4`)이
없다. 회피·공속·허기는 스토리와 무한 둘 다 4레벨에서 막힌다(별개 요청으로 정함 —
특히 회피는 레벨이 오를수록 쿨다운이 줄고 무적시간이 늘어서, 상한 없이 풀면 무적시간이
쿨다운을 넘어 사실상 무적이 되는 경계가 있다. 4레벨에서는 안전하지만 그 이상은 검증 안 함).
비용은 `upCostAt(level) = 2*level² + 6*level + 10` 하나로 통일했다 — 레벨 0~3 에서
기존 `UP_COST` 배열과 정확히 같은 값이 나오게 맞춘 것이라, 레벨 4 이후로도 자연스럽게
이어진다. 어느 능력치가 지금 상한이 걸려 있는지는 `systems/shop.ts` 의 `levelCapped(id)`
하나로 판단한다 — canBuy·HUD·상점 화면이 전부 이 함수를 거친다.

**랭킹은 스토리/무한모드가 완전히 분리돼 있다.** Supabase `scores` 테이블에 `mode`
컬럼이 있고, 닉네임당 최고점은 `(nick, mode)` 조합 기준으로 유지된다(트리거·유니크
인덱스 전부 이걸로 바뀌었다 — `supabase.sql` 재실행 필요, 아래 참고). 클라이언트는
`systems/ranking.ts` 의 `rank.mode` 로 지금 보고 있는 탭을 들고 있고, `fetchRanking(mode)`
로 전환한다. 타이틀의 "랭킹 보기"는 항상 스토리 탭으로 열고, 게임 종료 후 등록 화면은
방금 플레이한 모드로 연다(`submitScore()` 안에서 `fetchRanking(state.mode)`).

### 개발 도구 (scripts/)

브라우저 미리보기를 못 띄우는 환경이 있어서 화면 확인과 밸런스 측정을 CLI 로 한다.
둘 다 `@napi-rs/canvas` 가 필요한데, 게임에도 CI 에도 안 쓰이므로 package.json 에 넣지 않는다.

```bash
npm i --no-save @napi-rs/canvas
npx vite-node scripts/shot.ts -- title stage:5 card:3 shop dead ending   # .shots/*.png
npx vite-node scripts/balance.ts -- 20                                   # 20회 자동 플레이 통계
```

`shot.ts` 는 한글이 두부로 나오지 않게 `C:/Windows/Fonts/malgun.ttf` 를 등록한다.
`balance.ts` 의 봇은 BFS 길찾기를 쓴다 — 게임 본편에는 길찾기가 없다(사람이 하는 일이라
필요 없다). 없으면 봇이 마트 선반 사이에 끼어 굶어 죽어서 측정이 안 된다.

`npm run dev` 나 `vite build --mode development` 로 띄우면 콘솔에 `__dbg` 가 생긴다
(`__dbg.stage(6)`, `__dbg.scene("ending")`). `npm run build` 에서는 통째로 사라진다.

### 밸런스 수치가 있는 곳

- 무기·배터리: `data/weapons.ts` (`drain` 이 스윙당 소모, 주석에 완충 시 스윙 수)
- 적 능력치·점수·마정석: `data/enemies.ts`
- 스테이지 구성·적 배치: `data/chapters.ts`
- 업그레이드 비용: `data/upgrades.ts`
- 파생 능력치(업그레이드 반영): `core/state.ts` 의 `stat` (허기 감소율 `foodRate` 포함)
- 드랍 확률: `systems/enemies.ts` 의 사망 처리 블록
- 마왕 패턴(탄막·소환·돌진): `systems/enemies.ts` 의 `if (d.boss)` 블록.
  돌진은 체력 50% 아래에서만 풀린다(`e.phase===3 && hpR<0.5`).
- 무한모드 난이도 곡선: `data/chapters.ts` 의 `endlessChapter()`(적 구성)와
  `core/state.ts` 의 `beginChapter()` 안 `hpMult`/`spdMult`(파도당 체력·속도 배율, 상한 없음)

## 현재 상태

동작 확인된 것: 스토리 8스테이지 + 무한모드, 전동공구 4종 + 배터리, 상점 업그레이드 5종,
스테이지 카드 + 적 도감, 데미지 수치, 마정석, 전역 랭킹(Supabase), 효과음 + 배경음악 3패턴,
모바일 터치 조작(드래그형/고정형 선택), 도트 스프라이트(김대원 + 적 6종),
스테이지 진행도 트랙, 키 아트 타이틀, 하단 조작 밴드, 마왕 돌진 패턴, 1스테이지 배회 잡몹 +
보급품 서사 텍스트.

### 밸런스 기준선 (2026-08-13, `balance.ts` 20~24회, 스토리 모드)

완주 50~70%대(런마다 변동 큼 — 표본이 24회뿐이라 확률 요소로 흔들린다).
스테이지별 평균 체력 손실이 낮은 자릿수에서 시작해 7스테이지에서 20대, 보스에서
70~90대로 뚜렷하게 올라간다. 보스 사망률 20~40%. 이전 기준선(완주 80%, 보스만
어려움)보다 전체적으로 더 어렵게, 그리고 중후반부터 꾸준히 압박이 오르게 조정한 것이다.
수치를 다시 건드리면 이 표와 비교한다. 봇은 조준이 정확해 사람보다 덜 맞는다 —
절대값이 아니라 **스테이지 간 상대비**와 **곡선의 모양**을 봐라.

2026-08-14: 하단 조작 밴드를 72→180px 로 늘리며 아레나가 15×22→15×19 로 한 번 더
줄었다. 재측정해도 위 곡선과 같은 범위(완주 70% 안팎)라 아레나 크기 변화가
난이도에 유의미한 영향을 주지 않는 것으로 확인했다. 사용자가 "이대로 가자"고
확정한 기준선이니, **밸런스 자체는 다시 요청받기 전까지 건드리지 말 것.**

### 남은 일

1. **`supabase.sql` 재실행 필요 — 이번엔 필수입니다.** `mode` 컬럼 추가, 유니크
   인덱스/트리거를 `(nick, mode)` 기준으로 재구성, `stage_range` 상한을 무한모드에
   맞게 확장하는 스키마 변경이 들어 있다. 실행 전에는 랭킹 등록 자체가 (구버전
   `stage` 체크 제약에 걸려) 무한모드에서 실패할 수 있다. (2026-08-14 기준 미실행)
2. **아이템 스프라이트** — 플레이어와 적만 도트로 바꿨다. 아이템(마정석·배터리·공구·구급함)과
   타일은 아직 도형이다. `render/world.ts` 의 `drawItems` / `drawMap`.
3. **프레임워크 재판단** — Phaser 전환은 보류. 캐릭터마다 애니메이션 상태가 여러 개
   필요해지면 그때 다시 본다. 지금 구조(문자열 도트 → 오프스크린 베이크)로도 충분하다.

## 퇴근까지 버텨라

직장인 컨셉 랜덤 타워 디펜스. React + TypeScript + Tailwind v4 + Phaser 3, Vite 빌드.
**2026-08-15 기준 초기 프로토타입** — 기획서(랭킹/퀘스트/도감/업적/스토리모드/보스 등)의
극히 일부만 구현된 상태다. 지금 있는 것: 직무 4종(개발자·QA·DevOps·영업), 등급 3단계
(Common/Rare/Epic), 랜덤 채용, 슬롯 배치, 동일 직무·등급·레벨 2개 병합 승진(일괄 승진),
직무 시너지 2개 + 부서 시너지 1개(전역 조건부 배율, 오라 아님), 적 3종, 상한 없는 무한
웨이브. **없는 것**: 스토리 모드, 보스, 랭킹(Supabase), 퀘스트, 도감, 업적, 이벤트,
사운드, 스프라이트(전부 도형+이모지).

### 구조

```
src/
  types.ts        공용 타입 (Employee, EnemyDef, SynergyDef, GameSnapshot 등)
  data/           employees · enemies · synergies (순수 데이터)
  game/
    EventBus.ts   React ↔ Phaser 통신 전용 Phaser.Events.EventEmitter 싱글턴
    MainScene.ts  게임 상태의 단일 소스. 웨이브·전투·배치·병합·시너지 계산이 전부 여기 있다
    PhaserGame.tsx  Phaser.Game 을 마운트하는 React 래퍼
  ui/             Hud · ControlBar · InventoryPanel · SynergyPanel · GameOverOverlay
  App.tsx         EventBus 'state-update' 구독 → 스냅샷을 각 UI 컴포넌트에 전달
```

React 는 `MainScene`이 주기적으로(150ms 간격 + 주요 액션 직후) emit 하는 `GameSnapshot`
을 구독만 한다. 액션(채용/선택/일괄승진/배속/즉시웨이브/재시작)은 전부 `EventBus.emit(...)`
으로 씬에 보낸다. **상태를 React 쪽에 별도로 들고 있지 않는다** — 필드 배치, 골드, 웨이브
전부 `MainScene` 인스턴스 필드가 유일한 원본이다.

### 반드시 알아야 할 결정

**Phaser 캔버스는 마운트 직후 크기가 0일 수 있다.** `PhaserGame.tsx` 의 컨테이너는 Tailwind
`aspect-[5/3]` 로 높이를 잡는데, `new Phaser.Game()` 생성 시점에 이 CSS 레이아웃이 아직
반영 전이면 Phaser 가 부모 크기를 0x0 으로 읽어 캔버스를 그 크기로 굳혀버리고, 이후
윈도우 리사이즈가 없으면 영영 0x0 으로 남는다(실제로 겪은 버그 — HUD 는 정상인데 필드만
안 보였다). `ResizeObserver` 로 컨테이너를 관찰하다가 `game.scale.refresh()` 를 부르는
방식으로 고쳤다. 컨테이너 크기 결정 방식을 바꿀 때는 이 타이밍 문제를 다시 확인할 것.

**시너지는 오라가 아니라 전역 조건부 배율이다.** 배치된 직원들의 직무 집합이
`SynergyDef.requiredJobs` 를 전부 포함하면, `appliesTo` 에 속한 직무의 공격력/공격속도에
곱연산으로 적용된다(거리 기반 아님). 직무 시너지와 부서 시너지가 동시에 만족되면 곱이
누적된다(예: 개발자는 품질보증 1.3 × 개발팀 1.2). 기획서의 오라형 버프(DevOps 가 주변을
강화하는 식)는 프로토타입 범위에서 의도적으로 뺐다 — 거리 계산 없이도 "조합을 완성하면
강해진다"는 핵심 재미는 전달된다고 판단했다.

**적 처치 우선순위는 "경로 진행도가 가장 큰(=회사에 가장 가까운) 적"이다**
(`MainScene.update()` 의 `bestX` 비교). 사거리 안의 모든 적 중 x 좌표가 가장 큰 것을
공격한다 — 여러 적이 동시에 들어와도 회사에 먼저 닿을 적부터 처리되게 하려는 의도.

### 개발 도구

이 저장소의 Browser 미리보기 세션은 `document.visibilityState === 'hidden'` 인 채로 rAF 가
전혀 안 돌 때가 있다(패널이 실제로 화면에 표시되지 않은 상태). 그럴 때는 `npm run dev` 로
띄운 뒤 콘솔에서 `window.__game`(dev 빌드에서만 존재, `PhaserGame.tsx` 에서 주입, prod
빌드에서는 트리쉐이킹으로 사라짐)으로 씬을 붙잡아 `scene.update(time, delta)` 를 직접
반복 호출해 웨이브/전투 로직을 검증할 수 있다. `scene.employees`, `scene.hireRandomEmployee()`,
`scene.mergeOnce()`, `scene.effectiveStats(emp, activeIds)` 도 런타임에서 바로 호출 가능하다
(TS `private` 는 컴파일 타임 전용이라 런타임엔 그냥 열려 있다).

### 남은 일

기획서(`README.md` 없음, 최초 요청 메시지 참고) 대비 스토리모드·보스·랭킹·퀘스트·도감·업적·
이벤트·사운드·스프라이트가 전부 비어 있다. 다음으로 붙일 만한 것 우선순위: ① 보스 1종 +
승리 조건이 있는 짧은 스토리 모드, ② 도트/이모지를 실제 스프라이트로, ③ Supabase 무한모드
랭킹(이세계전사 김대원의 `systems/ranking.ts` 패턴 재사용 가능).

## 환경 메모 (Windows)

- `gh` CLI 는 설치돼 있으나 새 셸 PATH 에 안 잡힐 수 있습니다 → `"C:\Program Files\GitHub CLI\gh.exe"`
- GitHub 계정은 **MinCho-Dan** 입니다. git config 의 `user.name` 은 `gyujik` 이라 다릅니다.
- PowerShell 로 한글 파일을 일괄 치환하지 마세요. `Get-Content`/`Set-Content` 인코딩 불일치로
  파일이 통째로 깨집니다. 파일 편집은 편집 도구를 쓰세요.
