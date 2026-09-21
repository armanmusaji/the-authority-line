import { StatusPill } from './Marks'
import { mornings, settings, type PermissionId } from './scenario'

interface Props {
  current: PermissionId
  viewed: PermissionId[]
  onSelect: (permission: PermissionId) => void
}

/** Back in Arman's voice: the comparison the whole piece exists to make. */
export function ThreeMornings({ current, viewed, onSelect }: Props) {
  return (
    <section className="mornings-section" aria-labelledby="mornings-heading">
      <h2 className="h2" id="mornings-heading">
        {mornings.heading}
      </h2>

      <div className="mornings">
        {settings.map((setting) => {
          const seen = viewed.includes(setting.id)
          const isCurrent = setting.id === current
          return (
            <button
              type="button"
              key={setting.id}
              className={`m${seen ? '' : ' empty'}${isCurrent ? ' on' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => onSelect(setting.id)}
            >
              <b>{setting.label}</b>
              <span className="visually-hidden">
                {seen ? mornings.viewedStateLabel : mornings.emptyStateLabel}.{' '}
              </span>
              {seen && <StatusPill pill={setting.report.pill} />}
              <span className="t">{seen ? setting.summary : mornings.emptyText}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
