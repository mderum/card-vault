import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'card_vault_enc'
const SALT_KEY    = 'card_vault_salt'
const VERIFY_KEY  = 'card_vault_verify'
const VERIFY_TEXT = 'card_vault_ok'

// ── Crypto helpers ────────────────────────────────────────
async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

async function encrypt(key, data) {
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
  return { iv: b64(iv), data: b64(new Uint8Array(buf)) }
}

async function decrypt(key, payload) {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(payload.iv) }, key, unb64(payload.data)
  )
  return JSON.parse(new TextDecoder().decode(buf))
}

const b64   = u8 => btoa(String.fromCharCode(...u8))
const unb64 = s  => Uint8Array.from(atob(s), c => c.charCodeAt(0))

function getSalt() {
  const stored = localStorage.getItem(SALT_KEY)
  if (stored) return unb64(stored)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(SALT_KEY, b64(salt))
  return salt
}

const isFirstTime = () => !localStorage.getItem(VERIFY_KEY)

// ── CSS ───────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Space Grotesk', sans-serif;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%);
  background-attachment: fixed;
  min-height: 100vh;
  color: #111;
}

#root { position: relative; }

/* ── Lock screen ── */
.lock-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lock-box {
  background: #fff;
  border-radius: 24px;
  padding: 36px 32px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.4);
  animation: slideUp 0.3s cubic-bezier(.34,1.4,.64,1);
}

.lock-icon {
  font-size: 2.4rem;
  margin-bottom: 16px;
  text-align: center;
}

.lock-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
  text-align: center;
}

.lock-sub {
  font-size: 0.8rem;
  color: #888;
  text-align: center;
  margin-bottom: 24px;
  line-height: 1.5;
}

.lock-input {
  width: 100%;
  padding: 13px 16px;
  background: #f5f5f5;
  border: 1.5px solid #e8e8e8;
  border-radius: 12px;
  color: #111;
  font-size: 1rem;
  font-family: 'Space Grotesk', sans-serif;
  outline: none;
  transition: all 0.15s ease;
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.lock-input:focus { border-color: #111; background: #fff; }
.lock-input.error { border-color: #ff4444; background: #fff5f5; }

.lock-error {
  font-size: 0.78rem;
  color: #ff4444;
  text-align: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.lock-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: #111;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: 'Space Grotesk', sans-serif;
  transition: all 0.15s ease;
}

.lock-btn:hover { background: #333; }
.lock-btn:disabled { background: #ccc; cursor: not-allowed; }

/* ── App ── */
.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 20px 100px;
  /* leave room for alpha bar on right */
  padding-right: 48px;
}

.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}

.app-title {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1.5px;
  color: #fff;
}

.app-subtitle {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.4);
  margin-top: 6px;
  font-weight: 500;
}

.header-actions { display: flex; gap: 10px; align-items: center; margin-top: 4px; }

.btn-add {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 2px solid #111;
  background: #111;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.btn-add:hover { background: #333; transform: rotate(90deg); }

.btn-settings {
  width: 42px; height: 42px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
  position: relative;
}
.btn-settings:hover { background: rgba(255,80,80,0.15); border-color: rgba(255,80,80,0.5); color: #ff6060; }

.settings-menu {
  position: absolute;
  top: calc(100% + 8px); right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  overflow: hidden;
  min-width: 180px;
  z-index: 100;
  animation: fadeIn 0.12s ease;
}

.settings-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  font-size: 0.85rem; font-weight: 600;
  color: #ff4444; cursor: pointer;
  transition: background 0.12s ease;
  border: none; background: none; width: 100%;
  font-family: 'Space Grotesk', sans-serif;
}
.settings-item:hover { background: #fff5f5; }

/* ── Cards ── */
.cards-list { display: flex; flex-direction: column; gap: 14px; }

/* group letter header */
.alpha-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  padding: 6px 2px 2px;
  margin-top: 6px;
}

/* ── Alpha sidebar ── */
.alpha-bar {
  position: fixed;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 50;
  user-select: none;
}

.alpha-bar-letter {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.12s ease;
  letter-spacing: 0;
}

.alpha-bar-letter:hover,
.alpha-bar-letter.active {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.alpha-bar-letter.has-cards {
  color: rgba(255,255,255,0.7);
}

.empty { text-align: center; padding: 80px 20px; color: rgba(255,255,255,0.25); }
.empty-icon { font-size: 3rem; margin-bottom: 12px; }
.empty p { font-size: 0.88rem; }

.card {
  border-radius: 20px;
  padding: 24px 22px 20px;
  position: relative;
  overflow: hidden;
  animation: slideIn 0.28s cubic-bezier(.34,1.4,.64,1);
  transition: transform 0.2s ease;
}
.card:hover { transform: translateY(-3px); }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.card-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 28px;
}

.card-chip {
  width: 38px; height: 28px; border-radius: 5px;
  background: rgba(0,0,0,0.18);
  display: flex; align-items: center; justify-content: center;
}
.chip-inner { width: 24px; height: 18px; border: 1.5px solid rgba(0,0,0,0.25); border-radius: 3px; }

.card-top-right { text-align: right; }
.card-label { font-size: 0.58rem; color: rgba(0,0,0,0.35); text-transform: uppercase; letter-spacing: 2.5px; font-weight: 600; }
.card-name  { font-size: 0.95rem; color: rgba(0,0,0,0.85); font-weight: 700; margin-top: 3px; }

.card-number { display: flex; align-items: baseline; gap: 8px; margin-bottom: 28px; }
.card-dots   { font-size: 0.9rem; letter-spacing: 5px; color: rgba(0,0,0,0.3); }
.card-last4  { font-size: 2rem; font-weight: 800; letter-spacing: -1px; color: #111; line-height: 1; }
.card-full-number { font-size: 1.35rem; font-weight: 800; letter-spacing: 2px; color: #111; line-height: 1; }

.card-bottom { display: flex; align-items: flex-end; justify-content: space-between; }
.card-meta   { display: flex; gap: 20px; }
.card-field  { display: flex; flex-direction: column; gap: 2px; }

.field-label { font-size: 0.52rem; color: rgba(0,0,0,0.35); text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
.field-value { font-size: 0.82rem; color: rgba(0,0,0,0.75); font-weight: 600; letter-spacing: 1px; }
.field-value-revealed { font-size: 0.82rem; color: #111; font-weight: 700; letter-spacing: 2px; }

.card-actions { display: flex; gap: 6px; }

.btn-icon {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid rgba(0,0,0,0.2);
  background: rgba(0,0,0,0.06);
  color: rgba(0,0,0,0.5);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}
.btn-icon:hover { background: rgba(0,0,0,0.12); color: #111; border-color: rgba(0,0,0,0.4); transform: scale(1.08); }
.btn-icon.btn-copy.copied { background: #111; color: #fff; border-color: #111; }
.btn-icon.btn-eye.active  { background: #111; color: #fff; border-color: #111; }
.btn-icon.btn-delete:hover { background: #ff4444; color: #fff; border-color: #ff4444; }

/* ── Modal ── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
  background: #fff; border-radius: 20px; padding: 28px;
  width: 100%; max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  animation: slideUp 0.22s cubic-bezier(.34,1.4,.64,1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 22px; color: #111; letter-spacing: -0.5px; }

.field-group { margin-bottom: 14px; }
.field-group .field-label {
  display: block; font-size: 0.65rem; color: #888;
  text-transform: uppercase; letter-spacing: 1.3px; margin-bottom: 7px; font-weight: 600;
}

.field-input {
  width: 100%; padding: 11px 14px;
  background: #f5f5f5; border: 1.5px solid #e8e8e8; border-radius: 10px;
  color: #111; font-size: 0.93rem; font-family: 'Space Grotesk', sans-serif;
  outline: none; transition: all 0.15s ease; font-weight: 500;
}
.field-input:focus { border-color: #111; background: #fff; }
.field-input::placeholder { color: #bbb; }

.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; gap: 10px; margin-top: 22px; }

.btn-primary {
  flex: 1; padding: 13px; border-radius: 10px; border: none;
  background: #111; color: #fff; font-weight: 700; font-size: 0.9rem;
  cursor: pointer; font-family: 'Space Grotesk', sans-serif; transition: all 0.15s ease;
}
.btn-primary:hover { background: #333; }

.btn-secondary {
  flex: 1; padding: 13px; border-radius: 10px;
  border: 1.5px solid #e0e0e0; background: #fff; color: #666;
  font-weight: 600; font-size: 0.9rem; cursor: pointer;
  font-family: 'Space Grotesk', sans-serif; transition: all 0.15s ease;
}
.btn-secondary:hover { border-color: #bbb; color: #333; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
`

// ── Helpers ───────────────────────────────────────────────
function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function CopyBtn({ number, dashes }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    const d = number.replace(/\s/g, '')
    const text = dashes ? d.replace(/(.{4})/g, '$1-').replace(/-$/, '') : d
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <button className={`btn-icon btn-copy${copied ? ' copied' : ''}`}
      title={dashes ? 'Copy with dashes' : 'Copy plain'} onClick={copy}>
      {copied ? '✓' : dashes
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="2" width="13" height="13" rx="2"/><line x1="3" y1="22" x2="16" y2="22"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  )
}

const CARD_THEMES = [
  { bg: '#c8f0a0' }, { bg: '#f5c842' }, { bg: '#f08080' },
  { bg: '#b8a0f0' }, { bg: '#80d4f0' }, { bg: '#f0b880' },
]

// ── Card component ────────────────────────────────────────
function Card({ card, index, onEdit, onDelete }) {
  const t = CARD_THEMES[index % CARD_THEMES.length]
  const last4 = card.number.replace(/\s/g, '').slice(-4) || '????'
  const [revealed, setRevealed] = useState(false)
  const fullNumber = card.number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className="card" style={{ background: t.bg }}>
      <div className="card-top">
        <div className="card-chip"><div className="chip-inner" /></div>
        <div className="card-top-right">
          {/* <div className="card-label">Credit Card</div> */}
          {card.name && <div className="card-name">{card.name}</div>}
        </div>
      </div>
      <div className="card-number">
        {revealed
          ? <span className="card-full-number">{fullNumber}</span>
          : <><span className="card-dots">•••• •••• ••••</span><span className="card-last4">{last4}</span></>
        }
      </div>
      <div className="card-bottom">
        <div className="card-meta">
          <div className="card-field">
            <span className="field-label">Expiry</span>
            <span className="field-value">{card.expiry || '––/––'}</span>
          </div>
          <div className="card-field">
            <span className="field-label">CVV</span>
            {revealed
              ? <span className="field-value-revealed">{card.cvv || '–––'}</span>
              : <span className="field-value">•••</span>
            }
          </div>
        </div>
        <div className="card-actions">
          <button className={`btn-icon btn-eye${revealed ? ' active' : ''}`}
            title={revealed ? 'Hide' : 'Show'} onClick={() => setRevealed(r => !r)}>
            {revealed
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
          <CopyBtn number={card.number} dashes={false} />
          <CopyBtn number={card.number} dashes={true} />
          <button className="btn-icon btn-edit" onClick={() => onEdit(card)} title="Edit">✎</button>
          <button className="btn-icon btn-delete" onClick={() => onDelete(card.id)} title="Delete">✕</button>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Modal ────────────────────────────────────────
function Modal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', number: '', expiry: '', cvv: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleNumber(e) { set('number', formatCardNumber(e.target.value)) }
  function handleExpiry(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    set('expiry', v)
  }
  function handleCvv(e) { set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4)) }

  function submit(e) {
    e.preventDefault()
    if (!form.number.replace(/\s/g, '')) return
    onSave(form)
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initial ? 'Edit Card' : 'Add Card'}</div>
        <form onSubmit={submit}>
          <div className="field-group">
            <label className="field-label">Cardholder Name</label>
            <input className="field-input" placeholder="J. DOE" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Card Number *</label>
            <input className="field-input" placeholder="0000 0000 0000 0000" value={form.number} onChange={handleNumber} required />
          </div>
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Expiry</label>
              <input className="field-input" placeholder="MM/YY" value={form.expiry} onChange={handleExpiry} />
            </div>
            <div className="field-group">
              <label className="field-label">CVV</label>
              <input className="field-input" placeholder="•••" value={form.cvv} onChange={handleCvv} type="password" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Lock Screen ───────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const firstTime = isFirstTime()
  const [pw, setPw]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (pw.length < 4) { setError('Password must be at least 4 characters.'); return }
    if (firstTime && pw !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const salt = getSalt()
      const key  = await deriveKey(pw, salt)
      if (firstTime) {
        // store encrypted verify token so we can detect wrong password later
        const payload = await encrypt(key, VERIFY_TEXT)
        localStorage.setItem(VERIFY_KEY, JSON.stringify(payload))
        onUnlock(key)
      } else {
        const payload = JSON.parse(localStorage.getItem(VERIFY_KEY))
        const result  = await decrypt(key, payload)
        if (result !== VERIFY_TEXT) throw new Error('wrong')
        onUnlock(key)
      }
    } catch {
      setError('Wrong password. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="lock-screen">
      <div className="lock-box">
        <div className="lock-icon">🔐</div>
        <div className="lock-title">{firstTime ? 'Set Password' : 'Card Vault'}</div>
        <div className="lock-sub">
          {firstTime
            ? 'Choose a master password to encrypt your cards.'
            : 'Enter your master password to unlock.'}
        </div>
        <form onSubmit={submit}>
          <input
            className={`lock-input${error ? ' error' : ''}`}
            type="password" placeholder="Master password"
            value={pw} onChange={e => { setPw(e.target.value); setError('') }}
            autoFocus
          />
          {firstTime && (
            <input
              className={`lock-input${error ? ' error' : ''}`}
              type="password" placeholder="Confirm password"
              value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
            />
          )}
          {error && <div className="lock-error">{error}</div>}
          <button className="lock-btn" type="submit" disabled={loading}>
            {loading ? 'Unlocking…' : firstTime ? 'Set Password & Enter' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Alpha sidebar ─────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

function AlphaBar({ available, onJump }) {
  const [active, setActive] = useState(null)

  function jump(letter) {
    setActive(letter)
    onJump(letter)
    setTimeout(() => setActive(null), 600)
  }

  return (
    <div className="alpha-bar">
      {ALPHABET.map(l => (
        <div
          key={l}
          className={`alpha-bar-letter${available.has(l) ? ' has-cards' : ''}${active === l ? ' active' : ''}`}
          onClick={() => available.has(l) && jump(l)}
        >
          {l}
        </div>
      ))}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [cryptoKey, setCryptoKey] = useState(null)
  const [cards, setCards]         = useState([])
  const [modal, setModal]         = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!cryptoKey) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    decrypt(cryptoKey, JSON.parse(raw))
      .then(setCards)
      .catch(() => setCards([]))
  }, [cryptoKey])

  const saveCards = useCallback(async (updated) => {
    if (!cryptoKey) return
    const payload = await encrypt(cryptoKey, updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [cryptoKey])

  function updateCards(fn) {
    setCards(prev => {
      const next = fn(prev)
      saveCards(next)
      return next
    })
  }

  function addCard(form)  { updateCards(c => [...c, { ...form, id: Date.now() }]); setModal(null) }
  function editCard(form) { updateCards(c => c.map(x => x.id === form.id ? form : x)); setModal(null) }
  function deleteCard(id) { updateCards(c => c.filter(x => x.id !== id)) }

  function clearAll() {
    if (!confirm('Delete all cards? This cannot be undone.')) { setShowSettings(false); return }
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(VERIFY_KEY)
    localStorage.removeItem(SALT_KEY)
    setCards([])
    setCryptoKey(null)
    setShowSettings(false)
  }

  // sort alphabetically by name, unnamed cards go to end
  const sorted = [...cards].sort((a, b) => {
    const na = (a.name || '').trim().toUpperCase() || '~'
    const nb = (b.name || '').trim().toUpperCase() || '~'
    return na.localeCompare(nb)
  })

  // group by first letter
  const groups = []
  const available = new Set()
  sorted.forEach((card, i) => {
    const first = (card.name || '').trim()[0]?.toUpperCase()
    const letter = first && /[A-Z]/.test(first) ? first : '#'
    available.add(letter)
    if (i === 0 || letter !== groups[groups.length - 1]?.letter) {
      groups.push({ letter, cards: [{ card, index: i }] })
    } else {
      groups[groups.length - 1].cards.push({ card, index: i })
    }
  })

  function jumpTo(letter) {
    const el = document.getElementById(`alpha-${letter}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!cryptoKey) return (
    <>
      <style>{css}</style>
      <LockScreen onUnlock={setCryptoKey} />
    </>
  )

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header className="app-header">
          <div>
            <div className="app-title">Card Vault</div>
            <div className="app-subtitle">{cards.length} card{cards.length !== 1 ? 's' : ''} stored locally</div>
          </div>
          <div className="header-actions">
            <div style={{ position: 'relative' }}>
              <button className="btn-settings" title="Settings" onClick={() => setShowSettings(s => !s)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              {showSettings && (
                <div className="settings-menu">
                  <button className="settings-item" onClick={() => { setCryptoKey(null); setShowSettings(false) }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Lock vault
                  </button>
                  <button className="settings-item" onClick={clearAll}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Clear all data
                  </button>
                </div>
              )}
            </div>
            <button className="btn-add" onClick={() => setModal('add')}>+</button>
          </div>
        </header>

        <div className="cards-list">
          {cards.length === 0
            ? <div className="empty"><div className="empty-icon">💳</div><p>No cards yet. Hit + to add one.</p></div>
            : groups.map(({ letter, cards: group }) => (
                <div key={letter}>
                  <div id={`alpha-${letter}`} className="alpha-group-label">{letter}</div>
                  {group.map(({ card, index }) => (
                    <Card key={card.id} card={card} index={index}
                      onEdit={c => setModal(c)} onDelete={deleteCard} />
                  ))}
                </div>
              ))
          }
        </div>

        {cards.length > 0 && <AlphaBar available={available} onJump={jumpTo} />}

        {modal && (
          <Modal
            initial={modal === 'add' ? null : modal}
            onSave={modal === 'add' ? addCard : editCard}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </>
  )
}
