import { useState } from 'react'
import axios from 'axios'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/forgot-password', { email })
      setSuccess(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim permintaan reset')
    } finally { setLoading(false) }
  }

  if (success) {
    const resetLink = `/reset-password/${success.resetToken}`
    return (
      <div style={{ minHeight: '100vh', display: 'flex', background: '#F0F2F8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ width: 480, background: '#1A3B8F', display: 'flex', flexDirection: 'column', padding: 48, flexShrink: 0 }}
          className="hidden-mobile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'auto' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <img src="/src/assets/logo.png" style={{ width: 40, height: 40, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:#1A3B8F;font-weight:800;font-size:14px">AW</span>' }} />
            </div>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>AL-WILDAN</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>HR System</p>
            </div>
          </div>
          <div style={{ marginBottom: 'auto', paddingTop: 80 }}>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20 }}>
              <span style={{ color: '#C8962E' }}>Reset</span> Password<br />
              telah dikirim
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
              Gunakan link di samping untuk membuat password baru. Link berlaku selama 1 jam.
            </p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 32 }}>© 2026 AL-WILDAN Islamic School</p>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1A3B8F', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/src/assets/logo.png" style={{ width: 36, height: 36, objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:white;font-weight:800;font-size:12px">AW</span>' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: '#0a0b0d' }}>AL-WILDAN HR System</p>
                <p style={{ fontSize: 12, color: '#9BA5C0' }}>Sistem Data Karyawan Terpadu</p>
              </div>
            </div>

            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <CheckCircle size={26} color="#059669" />
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0a0b0d', letterSpacing: '-0.5px', marginBottom: 6 }}>Cek Email Anda</h2>
            <p style={{ fontSize: 14, color: '#9BA5C0', marginBottom: 24, lineHeight: 1.6 }}>
              Jika email <strong>{email}</strong> terdaftar di sistem, link reset password telah tersedia di bawah.
            </p>

            <div style={{ background: '#F0F2F8', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #E8EBF4' }}>
              <p style={{ fontSize: 12, color: '#9BA5C0', marginBottom: 8, fontWeight: 600 }}>LINK RESET PASSWORD</p>
              <a href={resetLink}
                style={{ color: '#1A3B8F', fontSize: 14, fontWeight: 700, wordBreak: 'break-all', textDecoration: 'underline' }}>
                {window.location.origin}{resetLink}
              </a>
            </div>

            <button onClick={onBack}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E8EBF4', background: 'white', color: '#1A3B8F', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8F9FD'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              Kembali ke Login
            </button>
          </div>
        </div>
        <style>{`@media(max-width:768px){ .hidden-mobile{ display:none!important; } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F0F2F8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ width: 480, background: '#1A3B8F', display: 'flex', flexDirection: 'column', padding: 48, flexShrink: 0 }}
        className="hidden-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'auto' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/src/assets/logo.png" style={{ width: 40, height: 40, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:#1A3B8F;font-weight:800;font-size:14px">AW</span>' }} />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>AL-WILDAN</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>HR System</p>
          </div>
        </div>
        <div style={{ marginBottom: 'auto', paddingTop: 80 }}>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20 }}>
            <span style={{ color: '#C8962E' }}>Reset</span> Password<br />
            Akun HR Anda
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
            Masukkan email yang terdaftar. Kami akan memberikan link untuk membuat password baru. Link berlaku 1 jam.
          </p>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 32 }}>© 2026 AL-WILDAN Islamic School</p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1A3B8F', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/src/assets/logo.png" style={{ width: 36, height: 36, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:white;font-weight:800;font-size:12px">AW</span>' }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0a0b0d' }}>AL-WILDAN HR System</p>
              <p style={{ fontSize: 12, color: '#9BA5C0' }}>Sistem Data Karyawan Terpadu</p>
            </div>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0a0b0d', letterSpacing: '-0.5px', marginBottom: 6 }}>Lupa Password</h2>
          <p style={{ fontSize: 14, color: '#9BA5C0', marginBottom: 32 }}>Masukkan email akun HR Anda</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9BA5C0' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="nama@alwildan.sch.id" required
                  style={{ width: '100%', padding: '13px 16px 13px 42px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                  onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#9BA5C0' : '#1A3B8F', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#152E6E' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1A3B8F' }}>
              {loading
                ? <div style={{ width: 18, height: 18, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : 'Kirim Link Reset'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={onBack}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1A3B8F', fontSize: 14, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} /> Kembali ke Login
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){ .hidden-mobile{ display:none!important; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}
