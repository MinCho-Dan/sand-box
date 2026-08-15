# 퇴근까지 버텨라

> "직원들을 잘 조합해서 오늘도 무사히 퇴근하라."

직장인 컨셉 랜덤 타워 디펜스. 밀려드는 업무를 직원으로 막아내고, 조직 시너지를
완성해 오늘도 무사히 퇴근하는 게 목표입니다.

**▶ [지금 플레이하기](https://mincho-dan.github.io/sand-box/clockout-defense/)**

## 상태

초기 프로토타입입니다. 랜덤 채용 → 배치 → 웨이브 → 골드 → 승진으로 이어지는 핵심
루프와 기본 시너지만 구현돼 있습니다. 자세한 범위와 구조는 저장소 루트의
[`CLAUDE.md`](../CLAUDE.md#퇴근까지-버텨라)를 참고하세요.

## 개발

```bash
npm ci
npm run dev     # 개발 서버
npm run build   # tsc -b && vite build
```
