// 案件詳細の上部に置く進行ステッパー。取込→抽出確認→マッチ→提案の現在地を細く表示する。
// DESIGN.md準拠: 装飾ゼロ、罫線とウェイトのみで階層を作る。クリックで戻れる。

export type StepKey = 'import' | 'extract' | 'match' | 'propose'

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'import', label: '取込' },
  { key: 'extract', label: '抽出確認' },
  { key: 'match', label: 'マッチ' },
  { key: 'propose', label: '提案' },
]

type Props = {
  current: StepKey
  onSelect?: (step: StepKey) => void
}

export default function Stepper({ current, onSelect }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <ol className="stepper" aria-label="進行ステップ">
      {STEPS.map((step, index) => {
        const isCurrent = step.key === current
        const isDone = index < currentIndex
        const state = isCurrent ? 'current' : isDone ? 'done' : 'upcoming'
        return (
          <li key={step.key} className={`stepper-item stepper-item--${state}`}>
            <button
              type="button"
              className="stepper-button"
              aria-current={isCurrent ? 'step' : undefined}
              onClick={onSelect ? () => onSelect(step.key) : undefined}
              disabled={onSelect === undefined}
            >
              <span className="stepper-index tabular">{index + 1}</span>
              <span className="stepper-label">{step.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
