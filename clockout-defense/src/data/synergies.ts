import type { SynergyDef } from '../types'

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'quality-assurance',
    name: '칼퇴 근절',
    requiredJobs: ['developer', 'qa'],
    appliesTo: ['developer'],
    description: '개발자 + QA — 버그는 잡았는데 오늘도 칼퇴는 물 건너갔다. 개발자 공격력 +30%',
    attackMult: 1.3,
  },
  {
    id: 'continuous-deploy',
    name: '커피 중독',
    requiredJobs: ['developer', 'devops'],
    appliesTo: ['developer'],
    description: '개발자 + DevOps — 배포 파이프라인처럼 쉬지 않고 커피를 들이켠다. 개발자 공격속도 +25%',
    attackSpeedMult: 1.25,
  },
  {
    id: 'dev-team',
    name: '야근 마스터',
    requiredJobs: ['developer', 'qa', 'devops'],
    appliesTo: ['developer', 'qa', 'devops'],
    description: '개발자 + QA + DevOps — 오늘도 사무실 불이 꺼지지 않는다. 모든 개발 직군 공격력 +20% 추가',
    attackMult: 1.2,
  },
]
