import { forwardRef } from 'react'
import { AuthorityMark, SectionHead } from './Marks'
import { product, settings, type PermissionId } from './scenario'

interface Props {
  value: PermissionId
  /** True for a moment after "Change this setting", to show where you landed. */
  highlighted: boolean
  onChange: (permission: PermissionId) => void
  radioRef: (id: PermissionId) => (node: HTMLInputElement | null) => void
}

/**
 * The setting: a three-stop rail. Underneath it is still a native radio group.
 * Each radio is named by its position alone, with its explanation as the
 * description. Selection shows twice, as the filled knob and the outlined card.
 */
export const SettingsPane = forwardRef<HTMLFieldSetElement, Props>(function SettingsPane(
  { value, highlighted, onChange, radioRef },
  fieldsetRef,
) {
  return (
    <div className="pane left">
      <SectionHead id="settings-heading" number={1}>
        {product.settingsHeading}
      </SectionHead>

      <fieldset
        className={highlighted ? 'settings live' : 'settings'}
        ref={fieldsetRef}
        id="settings"
      >
        <legend>{product.legend}</legend>

        <div className="rail">
          {settings.map((setting) => {
            const inputId = `setting-${setting.id}`
            const nameId = `${inputId}-name`
            const descId = `${inputId}-desc`
            return (
              <label className="opt" key={setting.id} htmlFor={inputId}>
                <input
                  type="radio"
                  id={inputId}
                  name="agent-setting"
                  value={setting.id}
                  checked={value === setting.id}
                  ref={radioRef(setting.id)}
                  onChange={() => onChange(setting.id)}
                  aria-labelledby={nameId}
                  aria-describedby={descId}
                />
                <span className="opt-box">
                  <b id={nameId}>{setting.label}</b>
                  <small id={descId}>{setting.description}</small>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/*
        Not a fourth option: a rule that holds under all three. It sits outside the
        radio group and straight after it, so a screen reader meets it right after
        the options. The struck square is the log's "outside its authority" mark.
      */}
      <div className="never">
        <AuthorityMark kind="outside" />
        <div className="never-text">
          <p className="never-head">{product.offLimitsHeading}</p>
          <p>{product.offLimitsBody}</p>
        </div>
      </div>
    </div>
  )
})
