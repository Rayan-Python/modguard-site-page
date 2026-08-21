import { useState } from 'react'
import { submitFeedback } from '../integrations/supabase/feedback.functions.js'

const TYPES = ['Support', 'Bug Report', 'Feedback', 'Other']

function CheckBurst() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" fill="none" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
      <path
        d="M15 24.5 L21.5 31 L33 18"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function FeedbackForm() {
  const [type, setType] = useState('Support')
  const [otherType, setOtherType] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [sentTo, setSentTo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrorMsg('')
    try {
      await submitFeedback({ type, otherType, name, email, message })
      setSentTo(email.trim())
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message || 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="form-done">
        <span className="form-done__icon">
          <CheckBurst />
        </span>
        <p className="form-done__title">Thanks, we got it.</p>
        <p className="form-done__body">
          Your message is with the ModGuard team. We’ll reply to{' '}
          <span className="form-done__email">{sentTo}</span>.
        </p>
        <button
          type="button"
          className="form__submit"
          onClick={() => {
            setType('Support')
            setOtherType('')
            setName('')
            setEmail('')
            setMessage('')
            setStatus('idle')
          }}
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__field">
        <span className="form__label">What’s this about?</span>
        <div className="form__choices" role="group" aria-label="Type">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`form__choice${type === t ? ' form__choice--on' : ''}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {type === 'Other' && (
        <label className="form__field">
          <span className="form__label">Tell us the topic</span>
          <input
            className="form__input"
            type="text"
            value={otherType}
            onChange={(e) => setOtherType(e.target.value)}
            placeholder="A few words"
            required
          />
        </label>
      )}

      <label className="form__field">
        <span className="form__label">Message</span>
        <textarea
          className="form__input form__textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          required
          placeholder="Tell us what’s going on."
        />
      </label>

      <div className="form__row">
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            className="form__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className="form__field">
          <span className="form__label">Email</span>
          <input
            className="form__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="So we can reply"
            required
          />
        </label>
      </div>

      {status === 'error' && <p className="form__error">{errorMsg}</p>}

      <button
        type="submit"
        className="form__submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? (
          'Sending…'
        ) : (
          <>
            Send message
            <span className="form__submit-arrow" aria-hidden="true">
              →
            </span>
          </>
        )}
      </button>

      <p className="form__note">
        We’ll only use your email to reply to this message.
      </p>
    </form>
  )
}
