/**
 * Arena Studio primitives.
 *
 * Arena-owned components following Astryx-style composition conventions.
 * Keep these presentation-only: data, routing, authentication and workflow
 * behaviour stay with the consuming feature.
 */

const joinClasses = (...values) => values.filter(Boolean).join(' ')

export function ArenaButton({
  as: Element = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const nativeButton = Element === 'button'

  return (
    <Element
      {...(nativeButton ? { type } : {})}
      className={joinClasses('arena-ui-button', `arena-ui-button--${variant}`, `arena-ui-button--${size}`, className)}
      {...props}
    >
      {children}
    </Element>
  )
}

export function ArenaBadge({
  as: Element = 'span',
  tone = 'neutral',
  className = '',
  children,
  ...props
}) {
  return (
    <Element className={joinClasses('arena-ui-badge', `arena-ui-badge--${tone}`, className)} {...props}>
      {children}
    </Element>
  )
}

export function ArenaCard({
  as: Element = 'div',
  tone = 'surface',
  className = '',
  children,
  ...props
}) {
  return (
    <Element className={joinClasses('arena-ui-card', `arena-ui-card--${tone}`, className)} {...props}>
      {children}
    </Element>
  )
}

/**
 * Accessible text input primitive for the next form/settings pass.
 * Error and helper copy are connected to the input through aria-describedby.
 */
export function ArenaField({
  id,
  label,
  description,
  error,
  className = '',
  inputClassName = '',
  ...inputProps
}) {
  const descriptionId = description && id ? `${id}-description` : null
  const errorId = error && id ? `${id}-error` : null
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={joinClasses('arena-ui-field', className)}>
      {label ? <label className="arena-ui-field-label" htmlFor={id}>{label}</label> : null}
      <input
        {...inputProps}
        id={id}
        className={joinClasses('arena-ui-input', inputClassName)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      />
      {description && descriptionId ? <p className="arena-ui-field-help" id={descriptionId}>{description}</p> : null}
      {error && errorId ? <p className="arena-ui-field-error" id={errorId}>{error}</p> : null}
    </div>
  )
}
