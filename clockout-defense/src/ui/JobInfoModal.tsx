import { JOB_LIST } from '../data/employees'
import { SYNERGIES } from '../data/synergies'
import Modal from './Modal'

interface Props {
  onClose: () => void
}

export default function JobInfoModal({ onClose }: Props) {
  return (
    <Modal title="직무 안내" onClose={onClose}>
      <div className="mb-3 text-[11px] text-slate-500">
        등급 배율 Common ×1 · Rare ×1.6 · Epic ×2.6 — 같은 직무·등급·레벨 직원을 채용하면 자동으로
        합쳐져 레벨업합니다(공격력·공격속도 +25%/레벨).
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
