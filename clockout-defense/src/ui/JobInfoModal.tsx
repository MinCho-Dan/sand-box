import { JOB_LIST, RARITY_LIST, HIRE_COST, LEVEL_CAP } from '../data/employees'
import { SYNERGIES } from '../data/synergies'
import Modal from './Modal'

interface Props {
  onClose: () => void
}

export default function JobInfoModal({ onClose }: Props) {
  return (
    <Modal title="직무 안내" onClose={onClose}>
      <div className="mb-3 flex flex-col gap-1 text-[11px] text-slate-500">
        <p>
          빈 슬롯을 누르면 {HIRE_COST}G 에 랜덤 직원이 채용돼 그 자리에 배치됩니다. 이미
          직원이 있는 슬롯을 누르면 골드를 내고 레벨을 올릴 수 있습니다(레벨마다 최대
          Lv.{LEVEL_CAP} 까지, 공격력·공격속도 +25%씩, 강화 비용도 함께 오름).
        </p>
        <p>
          같은 직무·같은 등급의 Lv.{LEVEL_CAP} 직원이 두 명 모이면, 그중 한 슬롯을 눌러 두
          직원을 합쳐 한 단계 위 등급의 랜덤 직무 Lv.1 직원을 만들 수 있습니다. 채용은
          처음엔 Common 등급만 나오고, 이렇게 등급을 한 번 만들 때마다 그 등급도 랜덤
          채용 풀에 추가됩니다.
        </p>
        <p>
          등급 배율:{' '}
          {RARITY_LIST.map((r) => `${r.name} ×${r.statMult}`).join(' · ')}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {JOB_LIST.map((job) => {
          const related = SYNERGIES.filter((s) => s.requiredJobs.includes(job.id))
          return (
            <div key={job.id} className="rounded-md border border-slate-800 p-2 text-xs">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{job.icon}</span>
                <span className="font-semibold text-slate-100">{job.name}</span>
              </div>
              <p className="mt-1 text-slate-400">{job.description}</p>
              <p className="mt-1 text-slate-500">
                공격력 {job.baseAttack} · 공격속도 {job.baseAttackSpeed}/s · 사거리 {job.baseRange}
                {job.vsTankyMult && <> · 고방어 적 피해 ×{job.vsTankyMult}</>}
                {job.bonusGoldMult && <> · 처치 골드 ×{job.bonusGoldMult}</>}
              </p>
              {related.length > 0 && (
                <p className="mt-1 text-slate-500">관련 시너지: {related.map((s) => s.name).join(', ')}</p>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
