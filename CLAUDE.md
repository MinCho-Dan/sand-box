# sand-box — 작업 컨텍스트

여러 기기에서 이어서 작업하기 위한 문서입니다. 새 세션은 이 파일부터 읽으면 됩니다.

## 이 저장소

브라우저에서 바로 도는 실험용 프로젝트 모음. GitHub Pages 로 서빙됩니다.

- 사이트 루트: <https://mincho-dan.github.io/sand-box/> (랜딩 페이지는 `site/index.html`)
- 저장소: <https://github.com/MinCho-Dan/sand-box>

| 프로젝트 | 경로 | 배포 주소 |
|---|---|---|
| 이세계전사 김대원 | `isekai-kimdaewon/` | `/sand-box/isekai-kimdaewon/` |

## 시작하기 (새 기기)

```bash
git clone https://github.com/MinCho-Dan/sand-box.git
cd sand-box/isekai-kimdaewon
npm ci
npm test        # vitest 42개
npm run dev     # 개발 서버
```

`npm run build` 는 `tsc --noEmit` 을 먼저 돌리므로 타입 오류가 있으면 빌드가 멈춥니다.

## 배포

`main` 에 푸시하면 `.github/workflows/deploy.yml` 이 **테스트 → 빌드 → Pages 배포**를 수행합니다.
테스트가 깨지면 배포되지 않습니다. Pages 소스는 브랜치가 아니라 **GitHub Actions** 로 설정돼 있습니다.

워크플로는 `_site` 를 조립합니다: 루트에 `site/index.html`, 하위에 각 프로젝트의 `dist/`.
프로젝트를 추가하면 워크플로의 "Assemble site" 단계와 `site/index.html` 목록에 한 줄씩 추가하면 됩니다.

## 이세계전사 김대원

세로형(540×972) 탑다운 액션. 상단 108px 는 HUD 전용, 나머지 540×864(15×24 타일)가 아레나.
월드 좌표는 아레나 기준이고 렌더링할 때만 `HUD_H` 만큼 내려 그립니다.

### 구조

```
src/
  config.ts      해상도·색·테마·Supabase 설정
  types.ts       공용 타입
  data/          chapters · enemies · weapons · upgrades (순수 데이터)
  core/          state · map · input · inputState · save · fx · util
  systems/       combat · enemies · items · shop · ranking · ui · update
  render/        ctx · world · hud · screens · index(디스패처)
  audio/         효과음 + 배경음악 (오디오 파일 없이 Web Audio 합성)
  ui/            rankForm (랭킹 등록 DOM 폼)
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

### 밸런스 수치가 있는 곳

- 무기·배터리: `data/weapons.ts` (`drain` 이 스윙당 소모, 주석에 완충 시 스윙 수)
- 적 능력치·점수·마정석: `data/enemies.ts`
- 스테이지 구성·적 배치: `data/chapters.ts`
- 업그레이드 비용: `data/upgrades.ts`
- 파생 능력치(업그레이드 반영): `core/state.ts` 의 `stat`
- 드랍 확률: `systems/enemies.ts` 의 사망 처리 블록

## 현재 상태

동작 확인된 것: 8스테이지, 전동공구 4종 + 배터리, 상점 업그레이드 5종, 스테이지 카드 + 적 도감,
데미지 수치, 마정석, 전역 랭킹(Supabase), 효과음 + 배경음악 3패턴, 모바일 터치 조작.

### 남은 일

1. **에셋 도입** — CC0 무료 팩(Kenney 등)으로 가기로 결정. 지금은 전부 도형 렌더링이라
   `render/world.ts` 의 그리기 함수만 교체하면 됩니다. 톤(픽셀 도트 / 벡터 플랫) 미정.
   스프라이트 로더와 아틀라스 구조를 같이 만들어야 합니다.
2. **밸런스** — 수치는 전부 추정값이고 실제 플레이 기반 조정이 안 됐습니다.
   특히 전동공구 배터리(전기톱 9스윙)가 빡빡한지 확인 필요.
3. **Supabase 중복 정리** — `supabase.sql` 을 SQL Editor 에서 다시 실행해야
   기존에 쌓인 중복 닉네임이 정리되고 트리거가 걸립니다. (2026-08-13 기준 미실행)
4. **프레임워크 재판단** — Phaser 전환은 보류. 실제 애니메이션 에셋이 들어오고
   캐릭터당 상태가 여러 개 필요해지면 그때 다시 봅니다.

## 환경 메모 (Windows)

- `gh` CLI 는 설치돼 있으나 새 셸 PATH 에 안 잡힐 수 있습니다 → `"C:\Program Files\GitHub CLI\gh.exe"`
- GitHub 계정은 **MinCho-Dan** 입니다. git config 의 `user.name` 은 `gyujik` 이라 다릅니다.
- PowerShell 로 한글 파일을 일괄 치환하지 마세요. `Get-Content`/`Set-Content` 인코딩 불일치로
  파일이 통째로 깨집니다. 파일 편집은 편집 도구를 쓰세요.
