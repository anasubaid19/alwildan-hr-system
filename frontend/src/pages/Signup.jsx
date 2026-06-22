import { useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react'

export default function Signup({ onSignup }) {
  const [form, setForm] = useState({ nama: '', email: '', password: '', konfirmasi: '', invite_key: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.konfirmasi)
      return setError('Konfirmasi password tidak cocok')
    if (form.password.length < 6)
      return setError('Password minimal 6 karakter')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/signup', {
        nama: form.nama,
        email: form.email,
        password: form.password,
        invite_key: form.invite_key.trim()
      })
      localStorage.setItem('aw_token', res.data.token)
      localStorage.setItem('aw_user', JSON.stringify(res.data.user))
      onSignup(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mendaftar')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F0F2F8', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* Left Panel */}
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,150,46,0.2)', border: '1px solid rgba(200,150,46,0.4)', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
            <KeyRound size={14} color="#C8962E" />
            <span style={{ color: '#C8962E', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>PENDAFTARAN AKUN</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20 }}>
            Daftar dengan<br />
            <span style={{ color: '#C8962E' }}>Invite Key</span><br />
            dari Admin
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7, maxWidth: 320 }}>
            Minta invite key dari Super Admin AL-WILDAN HR System sebelum mendaftar. Gunakan email yang sama dengan yang tertera pada invite key.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>Sudah punya akun?</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6 }}>
            Hubungi Super Admin untuk mendapatkan invite key, atau gunakan halaman login jika sudah memiliki akun.
          </p>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 32 }}>© 2026 AL-WILDAN Islamic School</p>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1A3B8F', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/src/assets/logo.png" style={{ width: 36, height: 36, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:white;font-weight:800;font-size:12px">AW</span>' }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#0a0b0d' }}>AL-WILDAN HR System</p>
              <p style={{ fontSize: 12, color: '#9BA5C0' }}>Sistem Data Karyawan Terpadu</p>
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF1FA', border: '1px solid #C7D2F0', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
            <KeyRound size={13} color="#1A3B8F" />
            <span style={{ color: '#1A3B8F', fontSize: 12, fontWeight: 700 }}>Daftar dengan Invite Key</span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0a0b0d', letterSpacing: '-0.5px', marginBottom: 6 }}>Buat Akun</h2>
          <p style={{ fontSize: 14, color: '#9BA5C0', marginBottom: 32 }}>Masukkan invite key yang diberikan Super Admin</p>

          <form onSubmit={handleSubmit}>
            {/* Invite Key */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Invite Key</label>
              <input type="text" value={form.invite_key} onChange={e => setForm(f => ({ ...f, invite_key: e.target.value }))}
                placeholder="AW-XXXXXXXXXXXXXXXXXXXX" required
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box', letterSpacing: '0.5px' }}
                onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
            </div>

            {/* Nama */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Nama Lengkap</label>
              <input type="text" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                placeholder="Nama sesuai gelar" required
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Harus cocok dengan email pada invite key" required
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimal 6 karakter" required
                  style={{ width: '100%', padding: '13px 48px 13px 16px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                  onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
                <button type="button" onClick={() => setShowPass(s => !s)} aria-label={showPass ? 'Sembunyikan password' : 'Lihat password'}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9BA5C0', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0a0b0d', marginBottom: 8 }}>Konfirmasi Password</label>
              <input type="password" value={form.konfirmasi} onChange={e => setForm(f => ({ ...f, konfirmasi: e.target.value }))}
                placeholder="Ulangi password" required
                style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #E8EBF4', fontSize: 14, color: '#0a0b0d', background: 'white', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#1A3B8F'}
                onBlur={e => e.target.style.borderColor = '#E8EBF4'} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="hover-darken"
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: loading ? '#9BA5C0' : '#1A3B8F', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {loading
                ? <div style={{ width: 18, height: 18, border: '2.5px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <><span>Buat Akun</span><ArrowRight size={17} /></>}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#9BA5C0', marginTop: 20 }}>
              Sudah punya akun?{' '}
              <a href="/" style={{ color: '#1A3B8F', fontWeight: 700, textDecoration: 'none' }}>Masuk di sini</a>
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){ .hidden-mobile{ display:none!important; } }
      `}</style>
    </div>
  )
}
