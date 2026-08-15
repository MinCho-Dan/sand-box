import type { SynergyDef } from '../types'

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'quality-assurance',
    name: '품질 보증',
    requiredJobs: ['developer', 'qa'],
    appliesTo: ['developer'],
    description: '개발자 + QA — 개발자 공격력 +30%',
    attackMult: 1.3,
  },
  {
    id: 'continuous-deploy',
    name: '지속 배포',
    requiredJobs: ['developer', 'devops'],
    appliesTo: ['developer'],
    description: '개발자 + DevOps — 개발자 공격속도 +25%',
    attackSpeedMult: 1.25,
  },
  {
    id: 'dev-team',
    name: '개발팀',
    requiredJobs: ['developer', 'qa', 'devops'],
    appliesTo: ['developer', 'qa', 'devops'],
    description: '개발자 + QA + DevOps — 모든 개발 직군 공격력 +20% 추가',
    attackMult: 1.2,
  },
]
