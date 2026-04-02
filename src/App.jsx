import { useState, useEffect, useCallback, useRef, Fragment } from 'react'

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

// ── Liquid Glass CSS Styles ───────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --text-main: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.6);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-highlight: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  --blur: blur(16px);
  --accent: #fff;
  --danger: #ff4757;
  --success: #2ed573;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', sans-serif;
  background-color: #050505;
  min-height: 100vh;
  color: var(--text-main);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

#root { position: relative; min-height: 100vh; }

/* ── Liquid Background Blobs ── */
.liquid-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #0a0a1a;
}

.blob {
  position: absolute;
  filter: blur(80px);
  border-radius: 50%;
  opacity: 0.6;
  animation: floatBlobs 20s infinite alternate cubic-bezier(0.45, 0.05, 0.55, 0.95);
}

.blob-1 {
  top: -10%; left: -10%;
  width: 50vw; height: 50vw;
  background: #4facfe;
  animation-delay: 0s;
}

.blob-2 {
  bottom: -20%; right: -10%;
  width: 60vw; height: 60vw;
  background: #f093fb;
  animation-delay: -5s;
}

.blob-3 {
  top: 40%; left: 60%;
  width: 40vw; height: 40vw;
  background: #43e97b;
  animation-delay: -10s;
}

@keyframes floatBlobs {
  0% { transform: translate(0, 0) scale(1) rotate(0deg); }
  33% { transform: translate(5vw, 10vh) scale(1.1) rotate(90deg); }
  66% { transform: translate(-10vw, 5vh) scale(0.9) rotate(180deg); }
  100% { transform: translate(0, 0) scale(1) rotate(360deg); }
}

/* Base Glass Class applied to panels */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border);
  border-top: 1px solid var(--glass-highlight);
  border-left: 1px solid var(--glass-highlight);
  box-shadow: var(--glass-shadow);
  border-radius: 24px;
}

/* ── Lock Screen ── */
.lock-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.lock-box {
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInScale {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.lock-icon-wrapper {
  width: 64px; height: 64px;
  margin: 0 auto 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-highlight);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 4px 10px rgba(255,255,255,0.1);
}

.lock-icon { font-size: 1.8rem; }

.lock-title {
  font-size: 1.6rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}

.lock-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 32px;
}

.lock-input {
  width: 100%;
  padding: 14px 18px;
  margin-bottom: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
}

.lock-input:focus {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255,255,255,0.4);
  box-shadow: 0 0 15px rgba(255,255,255,0.1), inset 0 2px 5px rgba(0,0,0,0.2);
}

.lock-input.error { border-color: var(--danger); }

.lock-error {
  font-size: 0.85rem;
  color: var(--danger);
  text-align: center;
  margin-bottom: 16px;
}

.lock-btn {
  width: 100%;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #000;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(255,255,255,0.2);
}

.lock-btn:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,255,255,0.3); }

/* ── App Layout ── */
.app {
  max-width: 680px;
  margin: 0 auto;
  padding: 56px 24px 140px;
  position: relative;
  z-index: 1;
}

.app-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--glass-border);
}

.app-title {
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.app-subtitle { color: var(--text-muted); font-size: 0.95rem; }

.header-actions { display: flex; gap: 12px; }

.btn-add, .btn-settings {
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--glass-highlight);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-add { padding: 0 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.btn-add:hover { background: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }

.btn-settings { width: 44px; }
.btn-settings:hover { background: rgba(255, 255, 255, 0.2); }

.settings-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  z-index: 100;
  padding: 8px;
  animation: fadeInScale 0.2s ease;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #fff;
  cursor: pointer;
  background: transparent;
  border: none;
  width: 100%;
  border-radius: 8px;
  transition: background 0.2s;
}

.settings-item:hover { background: rgba(255, 255, 255, 0.1); }
.settings-item.danger { color: var(--danger); }
.settings-item.danger:hover { background: rgba(255, 71, 87, 0.15); }

/* ── Cards List ── */
.cards-list { display: flex; flex-direction: column; gap: 0; }
.card-group-separator { margin-bottom: 24px !important; }

.alpha-group-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 8px 0;
  margin-top: 16px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 12px;
}
.alpha-group-label::after {
  content: ''; flex: 1; height: 1px; background: var(--glass-border);
}

/* ── Liquid Glass Card ── */
.card {
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--glass-shadow);
  /* The base glass effect */
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-top: 1px solid rgba(255,255,255,0.3);
  border-left: 1px solid rgba(255,255,255,0.2);
}

/* Subtle tint layer defined by inline styles */
.card-tint {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* Diagonal glass shine */
.card::after {
  content: '';
  position: absolute;
  top: 0; left: -150%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%);
  transform: skewX(-25deg);
  transition: 0.5s;
}

.card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 15px 40px rgba(0,0,0,0.4);
  border-top: 1px solid rgba(255,255,255,0.4);
}
.card:hover::after { left: 150%; transition: 0.7s ease-in-out; }

.card-top { display: flex; justify-content: space-between; margin-bottom: 32px; position: relative; z-index: 2; }

.card-chip {
  width: 44px; height: 34px;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
  border: 1px solid rgba(255,255,255,0.3);
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
  overflow: hidden;
}
/* Frosting the chip lines */
.card-chip::after {
  content: ''; position: absolute; inset: 2px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
}

.card-name { font-size: 1rem; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

.card-number {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 28px; position: relative; z-index: 2;
}

.card-dots { font-size: 0.85rem; letter-spacing: 5px; color: var(--text-muted); }
.card-last4, .card-full-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem; font-weight: 500;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.card-bottom { display: flex; align-items: flex-end; justify-content: space-between; position: relative; z-index: 2; }
.card-meta { display: flex; gap: 32px; }
.card-field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
.field-value, .field-value-revealed { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }

.card-actions { 
  display: flex; gap: 8px; 
  opacity: 0; transform: translateX(10px); transition: all 0.3s ease;
}
.card:hover .card-actions { opacity: 1; transform: translateX(0); }

.btn-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(5px);
}
.btn-icon:hover { background: rgba(255, 255, 255, 0.25); transform: scale(1.05); }

/* ── Modal ── */
.overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
  padding: 32px;
  width: 100%; max-width: 440px;
}

.modal-title { font-size: 1.4rem; font-weight: 600; margin-bottom: 24px; }

.field-group { margin-bottom: 20px; }
.field-group .field-label { display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; }

.field-input {
  width: 100%; padding: 14px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  color: #fff; font-size: 1rem;
  font-family: inherit; outline: none; transition: all 0.2s;
}
.field-input:focus {
  background: rgba(0, 0, 0, 0.3); border-color: rgba(255,255,255,0.4);
  box-shadow: 0 0 10px rgba(255,255,255,0.1);
}

.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.field-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-nfc {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(79, 172, 254, 0.2);
  color: #4facfe;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-nfc:hover:not(:disabled) {
  background: rgba(79, 172, 254, 0.3);
  color: #fff;
  transform: translateY(-50%) scale(1.02);
}

.btn-nfc:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-nfc.scanning {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.nfc-status {
  font-size: 0.8rem;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.nfc-status.success { color: var(--success); }
.nfc-status.error { color: var(--danger); }
.nfc-status.info { color: #4facfe; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }

.btn-secondary {
  padding: 12px 24px; border-radius: 12px;
  background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);
  color: #fff; cursor: pointer; transition: 0.2s;
}
.btn-secondary:hover { background: rgba(255,255,255,0.2); }

.btn-primary {
  padding: 12px 24px; border-radius: 12px;
  background: #fff; border: none; color: #000;
  font-weight: 600; cursor: pointer; transition: 0.2s;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255,255,255,0.3); }

/* ── Empty State ── */
.empty {
  text-align: center; padding: 80px 24px;
  border-radius: 20px; border: 1px dashed var(--glass-highlight);
  background: rgba(255,255,255,0.02);
}

/* ── Toast ── */
.toast-container { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; flex-direction: column; gap: 12px; }
.toast {
  padding: 14px 20px; display: flex; align-items: center; gap: 12px;
  animation: toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes toastSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 768px) {
  .card-actions { opacity: 1; transform: none; }
}
`

// ── Helpers ───────────────────────────────────────────────
function formatCardNumber(raw) {
  return raw.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

// ── NFC Scanning Function ─────────────────────────────────
async function scanWithNFC(onProgress) {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC not supported on this device. Please use an Android phone with Chrome/Edge.')
  }

  const reader = new NDEFReader()
  
  return new Promise((resolve, reject) => {
    let resolved = false
    
    reader.onreading = event => {
      if (resolved) return
      
      try {
        let cardNumber = null
        
        for (const record of event.message.records) {
          const textDecoder = new TextDecoder(record.encoding)
          
          // Try to extract card number from text records
          if (record.recordType === 'text') {
            const text = textDecoder.decode(record.data)
            const extracted = text.replace(/\D/g, '').slice(0, 16)
            if (extracted.length >= 13) {
              cardNumber = extracted
              break
            }
          }
          
          // Try URI records
          if (record.recordType === 'url') {
            const url = textDecoder.decode(record.data)
            const extracted = url.replace(/\D/g, '').slice(0, 16)
            if (extracted.length >= 13) {
              cardNumber = extracted
              break
            }
          }
          
          // Try well-known text records
          if (record.recordType === 0x54) { // 'T' for text
            const text = textDecoder.decode(record.data)
            const extracted = text.replace(/\D/g, '').slice(0, 16)
            if (extracted.length >= 13) {
              cardNumber = extracted
              break
            }
          }
        }
        
        if (cardNumber) {
          resolved = true
          resolve(formatCardNumber(cardNumber))
        } else {
          reject(new Error('No valid card number found on NFC tag'))
        }
      } catch (err) {
        reject(new Error('Failed to parse NFC data: ' + err.message))
      }
    }
    
    reader.onreadingerror = () => {
      if (!resolved) {
        resolved = true
        reject(new Error('Failed to read NFC tag. Please try again.'))
      }
    }
    
    reader.scan()
      .then(() => {
        if (onProgress) onProgress('Scan started. Hold your card near the back of your phone...')
      })
      .catch(err => {
        if (!resolved) {
          resolved = true
          reject(new Error('NFC scan failed: ' + err.message))
        }
      })
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('NFC scan timed out. Please try again.'))
      }
    }, 15000)
  })
}

function CopyBtn({ number, dashes }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    const d = number.replace(/\s/g, '')
    const text = dashes ? d.replace(/(.{4})/g, '$1-').replace(/-$/, '') : d
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button className="btn-icon" title={dashes ? 'Copy with dashes' : 'Copy plain'} onClick={copy}>
      {copied
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ed573" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
        : dashes
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="2" width="13" height="13" rx="2"/><line x1="3" y1="22" x2="16" y2="22"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  )
}

// Glass tints that overlay the frosted card
const CARD_THEMES = [
  { color: '#5b6cf9' }, // Neon Blue
  { color: '#f093fb' }, // Pink
  { color: '#43e97b' }, // Green
  { color: '#fa709a' }, // Rose
  { color: '#00f2fe' }, // Cyan
  { color: '#f6d365' }, // Gold
]

// ── Card component ────────────────────────────────────────
function Card({ card, index, onEdit, onDelete }) {
  const t = CARD_THEMES[index % CARD_THEMES.length]
  const last4 = card.number.replace(/\s/g, '').slice(-4) || '????'
  const [revealed, setRevealed] = useState(false)
  const fullNumber = card.number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className="card">
      <div className="card-tint" style={{ background: `linear-gradient(135deg, ${t.color}, transparent)` }} />
      <div className="card-top">
        <div className="card-chip"></div>
        <div className="card-top-right">
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
            <span className="field-label">Expires</span>
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
          <button className="btn-icon" title={revealed ? 'Hide' : 'Show'} onClick={() => setRevealed(r => !r)}>
            {revealed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
          <CopyBtn number={card.number} dashes={false} />
          <CopyBtn number={card.number} dashes={true} />
          <button className="btn-icon" onClick={() => onEdit(card)} title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="btn-icon" onClick={() => onDelete(card.id)} title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Modal ────────────────────────────────────────
function Modal({ initial, onSave, onClose, onNFCScanRequest }) {
  const [form, setForm] = useState(initial || { name: '', number: '', expiry: '', cvv: '' })
  const [errors, setErrors] = useState({})
  const [nfcScanning, setNfcScanning] = useState(false)
  const [nfcStatus, setNfcStatus] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleNumber(e) { set('number', formatCardNumber(e.target.value)) }
  function handleExpiry(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2)
    set('expiry', v)
  }
  function handleCvv(e) { set('cvv', e.target.value.replace(/\D/g, '').slice(0, 4)) }

  async function handleNFCScan() {
    setNfcScanning(true)
    setNfcStatus('Starting NFC scan...')
    
    try {
      const cardNumber = await scanWithNFC((status) => setNfcStatus(status))
      set('number', cardNumber)
      setNfcStatus('✅ Card scanned successfully!')
      setTimeout(() => {
        setNfcScanning(false)
        setNfcStatus('')
      }, 2000)
    } catch (err) {
      setNfcScanning(false)
      setNfcStatus('❌ ' + err.message)
      if (onNFCScanRequest) {
        onNFCScanRequest(err.message)
      }
      setTimeout(() => setNfcStatus(''), 5000)
    }
  }

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.number.replace(/\s/g, '').length) newErrors.number = 'Card number is required'
    if (form.number.replace(/\s/g, '').length > 0 && form.number.replace(/\s/g, '').length < 13) newErrors.number = 'Invalid card number'
    if (form.expiry && !/^\d{2}\/\d{2}$/.test(form.expiry)) newErrors.expiry = 'Invalid format'
    if (form.cvv && form.cvv.length < 3) newErrors.cvv = 'Invalid CVV'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function submit(e) { e.preventDefault(); if (validate()) onSave(form) }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-panel">
        <div className="modal-title">{initial ? 'Edit Details' : 'Add New Card'}</div>
        <form onSubmit={submit}>
          <div className="field-group">
            <label className="field-label">Cardholder Name</label>
            <input className={`field-input${errors.name ? ' error' : ''}`} placeholder="e.g. JANE DOE" value={form.name} onChange={e => { set('name', e.target.value); setErrors(e => ({ ...e, name: '' })) }} />
          </div>
          <div className="field-group">
            <label className="field-label">Card Number</label>
            <div className="field-input-wrapper">
              <input 
                className={`field-input${errors.number ? ' error' : ''}`} 
                placeholder="0000 0000 0000 0000" 
                value={form.number} 
                onChange={handleNumber} 
                required 
                style={{ paddingRight: nfcScanning ? '140px' : '100px' }}
              />
              <button 
                type="button"
                className={`btn-nfc${nfcScanning ? ' scanning' : ''}`} 
                onClick={handleNFCScan}
                disabled={nfcScanning}
                title="Scan card using NFC"
              >
                {nfcScanning ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                    Scanning...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    Scan NFC
                  </>
                )}
              </button>
            </div>
            {nfcStatus && (
              <div className={`nfc-status${nfcStatus.includes('✅') ? ' success' : nfcStatus.includes('❌') ? ' error' : ' info'}`}>
                {nfcStatus}
              </div>
            )}
          </div>
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Expiration</label>
              <input className={`field-input${errors.expiry ? ' error' : ''}`} placeholder="MM/YY" value={form.expiry} onChange={handleExpiry} />
            </div>
            <div className="field-group">
              <label className="field-label">CVV</label>
              <input className={`field-input${errors.cvv ? ' error' : ''}`} placeholder="123" value={form.cvv} onChange={handleCvv} type="password" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Card</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Toast Component ───────────────────────────────────────
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="toast glass-panel">
      <span style={{ fontSize: '1.2rem' }}>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{message}</span>
    </div>
  )
}

// ── Lock Screen ───────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const firstTime = isFirstTime()
  const [pw, setPw] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setError('')
    if (pw.length < 4) return setError('Password must be at least 4 characters.')
    if (firstTime && pw !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      const salt = getSalt(); const key = await deriveKey(pw, salt)
      if (firstTime) {
        const payload = await encrypt(key, VERIFY_TEXT)
        localStorage.setItem(VERIFY_KEY, JSON.stringify(payload))
        onUnlock(key)
      } else {
        const payload = JSON.parse(localStorage.getItem(VERIFY_KEY))
        const result  = await decrypt(key, payload)
        if (result !== VERIFY_TEXT) throw new Error('wrong')
        onUnlock(key)
      }
    } catch { setError('Incorrect password. Please try again.') }
    setLoading(false)
  }

  return (
    <div className="lock-screen">
      <div className="lock-box glass-panel">
        <div className="lock-icon-wrapper">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div className="lock-title">{firstTime ? 'Setup Vault' : 'Welcome Back'}</div>
        <div className="lock-sub">{firstTime ? 'Create a master password.' : 'Enter password to decrypt.'}</div>
        <form onSubmit={submit}>
          <input className={`lock-input${error ? ' error' : ''}`} type="password" placeholder="Master password" value={pw} onChange={e => { setPw(e.target.value); setError('') }} autoFocus />
          {firstTime && <input className={`lock-input${error ? ' error' : ''}`} type="password" placeholder="Confirm password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} />}
          {error && <div className="lock-error">{error}</div>}
          <button className="lock-btn" type="submit" disabled={loading}>{loading ? 'Decrypting...' : firstTime ? 'Initialize Vault' : 'Unlock Vault'}</button>
        </form>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [cryptoKey, setCryptoKey] = useState(null)
  const [cards, setCards] = useState([])
  const [modal, setModal] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts] = useState([])
  const settingsRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) { if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, message, type }])
  }, [])

  useEffect(() => {
    if (!cryptoKey) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    decrypt(cryptoKey, JSON.parse(raw)).then(setCards).catch(() => setCards([]))
  }, [cryptoKey])

  const saveCards = useCallback(async (updated) => {
    if (!cryptoKey) return
    const payload = await encrypt(cryptoKey, updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [cryptoKey])

  function updateCards(fn) {
    setCards(prev => { const next = fn(prev); saveCards(next); return next })
  }

  function addCard(form) { updateCards(c => [...c, { ...form, id: Date.now() }]); setModal(null); addToast('Card saved', 'success') }
  function editCard(form) { updateCards(c => c.map(x => x.id === form.id ? form : x)); setModal(null); addToast('Card updated', 'success') }
  function deleteCard(id) { updateCards(c => c.filter(x => x.id !== id)); addToast('Card removed', 'error') }

  function clearAll() {
    if (!confirm('Permanently delete your vault? This cannot be undone.')) return setShowSettings(false)
    localStorage.clear(); setCards([]); setCryptoKey(null); setShowSettings(false)
  }

  const sorted = [...cards].sort((a, b) => ((a.name || '').trim().toUpperCase() || '~').localeCompare((b.name || '').trim().toUpperCase() || '~'))
  const groups = []; sorted.forEach((card, i) => {
    const l = ((card.name || '').trim()[0]?.toUpperCase().match(/[A-Z]/) ? card.name.trim()[0].toUpperCase() : '#')
    if (i === 0 || l !== groups[groups.length - 1]?.letter) groups.push({ letter: l, cards: [{ card, index: i }] })
    else groups[groups.length - 1].cards.push({ card, index: i })
  })

  // The liquid background component injected behind the app
  const LiquidBackground = () => (
    <div className="liquid-bg">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
    </div>
  )

  if (!cryptoKey) return (
    <>
      <style>{css}</style>
      <LiquidBackground />
      <LockScreen onUnlock={setCryptoKey} />
    </>
  )

  return (
    <>
      <style>{css}</style>
      <LiquidBackground />
      <div className="app">
        <header className="app-header">
          <div>
            <div className="app-title">Glass Vault</div>
            <div className="app-subtitle">{cards.length} encrypted record{cards.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="header-actions">
            <div style={{ position: 'relative' }} ref={settingsRef}>
              <button className="btn-settings" onClick={() => setShowSettings(s => !s)}>⚙️</button>
              {showSettings && (
                <div className="settings-menu glass-panel">
                  <button className="settings-item" onClick={() => { setCryptoKey(null); setShowSettings(false) }}>🔒 Lock Vault</button>
                  <button className="settings-item danger" onClick={clearAll}>🗑 Wipe Database</button>
                </div>
              )}
            </div>
            <button className="btn-add" onClick={() => setModal('add')}>+ New</button>
          </div>
        </header>

        <div className="cards-list">
          {cards.length === 0
            ? <div className="empty glass-panel"><p style={{fontSize: '2rem'}}>🫙</p><p style={{marginTop:'10px'}}>Vault is empty</p></div>
            : groups.map(({ letter, cards: group }, gi) => (
                <div key={letter}>
                  <div className="alpha-group-label">{letter}</div>
                  {group.map(({ card, index }, ci) => (
                    <Fragment key={card.id}>
                      <Card card={card} index={index} onEdit={c => setModal(c)} onDelete={deleteCard} />
                      {ci < group.length - 1 && <div className="card-group-separator" />}
                    </Fragment>
                  ))}
                  {gi < groups.length - 1 && <div className="card-group-separator" />}
                </div>
              ))
          }
        </div>

        {modal && <Modal initial={modal === 'add' ? null : modal} onSave={modal === 'add' ? addCard : editCard} onClose={() => setModal(null)} />}
        <div className="toast-container">
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
        </div>
      </div>
    </>
  )
}
