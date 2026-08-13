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
  config.ts      해상도·팔레트(COL/UI)·테마·Supabase 설정
  types.ts       공용 타입
  data/          chapters · enemies · weapons · upgrades (순수 데이터)
  core/          state · map · input · inputState · save · fx · util
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
- 파생 능력치(업그레이드 반영): `core/state.ts` 의 `stat`
- 드랍 확률: `systems/enemies.ts` 의 사망 처리 블록

## 현재 상태

동작 확인된 것: 8스테이지, 전동공구 4종 + 배터리, 상점 업그레이드 5종, 스테이지 카드 + 적 도감,
데미지 수치, 마정석, 전역 랭킹(Supabase), 효과음 + 배경음악 3패턴, 모바일 터치 조작,
도트 스프라이트(김대원 + 적 6종), 스테이지 진행도 트랙, 키 아트 타이틀.

### 밸런스 기준선 (2026-08-13, `balance.ts` 20회)

완주 80%. 스테이지별 평균 체력 손실 0 / 4 / 7 / 6 / 9 / 11 / 0 / 91, 스테이지당 12~16초.
보스만 사망 20%인데, 최종 보스라 의도한 값이다. 수치를 건드리면 이 표와 비교한다.
봇은 조준이 정확해서 사람보다 덜 맞는다 — 절대값이 아니라 **스테이지 간 상대비**를 봐라.

### 남은 일

1. **`public/keyart.png` 넣기** — 타이틀 배경 이미지. 지금은 없어서 폴백 화면이 뜬다.
2. **아이템 스프라이트** — 플레이어와 적만 도트로 바꿨다. 아이템(마정석·배터리·공구·구급함)과
   타일은 아직 도형이다. `render/world.ts` 의 `drawItems` / `drawMap`.
3. **Supabase 중복 정리** — `supabase.sql` 을 SQL Editor 에서 다시 실행해야
   기존에 쌓인 중복 닉네임이 정리되고 트리거가 걸린다. (2026-08-13 기준 미실행)
4. **프레임워크 재판단** — Phaser 전환은 보류. 캐릭터마다 애니메이션 상태가 여러 개
   필요해지면 그때 다시 본다. 지금 구조(문자열 도트 → 오프스크린 베이크)로도 충분하다.

## 환경 메모 (Windows)

- `gh` CLI 는 설치돼 있으나 새 셸 PATH 에 안 잡힐 수 있습니다 → `"C:\Program Files\GitHub CLI\gh.exe"`
- GitHub 계정은 **MinCho-Dan** 입니다. git config 의 `user.name` 은 `gyujik` 이라 다릅니다.
- PowerShell 로 한글 파일을 일괄 치환하지 마세요. `Get-Content`/`Set-Content` 인코딩 불일치로
  파일이 통째로 깨집니다. 파일 편집은 편집 도구를 쓰세요.
