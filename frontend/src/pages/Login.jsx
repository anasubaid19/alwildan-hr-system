import { useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      localStorage.setItem('aw_token', res.data.token)
      localStorage.setItem('aw_user', JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Email atau password salah')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#F0F2F8', fontFamily:'Plus Jakarta Sans, sans-serif' }}>

      {/* Left Panel */}
      <div style={{ width:480, background:'#1A3B8F', display:'flex', flexDirection:'column', padding:48, flexShrink:0 }}
        className="hidden-mobile">
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:'auto' }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'white', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            <img src="/src/assets/logo.png" style={{ width:40, height:40, objectFit:'contain' }}
              onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="color:#1A3B8F;font-weight:800;font-size:14px">AW</span>' }}/>
          </div>
          <div>
            <p style={{ color:'white', fontWeight:800, fontSize:16, letterSpacing:'-0.3px' }}>AL-WILDAN</p>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>HR System</p>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginBottom:'auto', paddingTop:80 }}>
          <div style={{ display:'inline-block', background:'rgba(200,150,46,0.2)', border:'1px solid rgba(200,150,46,0.4)', borderRadius:100, padding:'6px 16px', marginBottom:24 }}>
            <span style={{ color:'#C8962E', fontSize:12, fontWeight:700, letterSpacing:'0.5px' }}>AL-WILDAN ISLAMIC SCHOOL</span>
          </div>
          <h1 style={{ fontSize:40, fontWeight:800, color:'white', lineHeight:1.15, letterSpacing:'-1px', marginBottom:20 }}>
            Sistem Data<br/>
            <span style={{ color:'#C8962E' }}>Karyawan</span><br/>
            Terpadu
          </h1>
          <p style={{ color:'rgba(255,255,255,0.55)', fontSize:15, lineHeight:1.7, maxWidth:320 }}>
            Kelola data karyawan seluruh 33 cabang AL-WILDAN dengan efisien, akurat, dan terintegrasi.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[['33', 'Cabang Aktif'],['1200+','Karyawan'],['Otomatis','Rekap Gaji'],['Realtime','Dashboard']].map(([v,l])=>(
            <div key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:14, padding:'16px 18px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color:'white', fontWeight:800, fontSize:20, letterSpacing:'-0.5px' }}>{v}</p>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:3 }}>{l}</p>
            </div>
          ))}
        </div>

        <p style={{ color:'rgba(255,255,255,0.25)', fontSize:12, marginTop:32 }}>© 2026 AL-WILDAN Islamic School</p>
      </div>

      {/* Right Panel */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'#1A3B8F', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              <img src="/src/assets/logo.png" style={{ width:36, height:36, objectFit:'contain' }}
                onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="color:white;font-weight:800;font-size:12px">AW</span>' }}/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:'#0a0b0d' }}>AL-WILDAN HR System</p>
              <p style={{ fontSize:12, color:'#9BA5C0' }}>Sistem Data Karyawan Terpadu</p>
            </div>
          </div>

          <h2 style={{ fontSize:26, fontWeight:800, color:'#0a0b0d', letterSpacing:'-0.5px', marginBottom:6 }}>Masuk</h2>
          <p style={{ fontSize:14, color:'#9BA5C0', marginBottom:32 }}>Gunakan akun HR yang telah didaftarkan</p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#0a0b0d', marginBottom:8 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="nama@alwildan.sch.id" required
                style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px solid #E8EBF4', fontSize:14, color:'#0a0b0d', background:'white', outline:'none', fontFamily:'Plus Jakarta Sans, sans-serif', transition:'border-color 0.15s' }}
                onFocus={e=>e.target.style.borderColor='#1A3B8F'}
                onBlur={e=>e.target.style.borderColor='#E8EBF4'}/>
            </div>

            {/* Password */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:700, color:'#0a0b0d' }}>Password</label>
                <span style={{ fontSize:12, color:'#1A3B8F', cursor:'pointer', fontWeight:600 }} onClick={() => window.location.href='/lupa-password'}>Lupa password?</span>
              </div>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width:'100%', padding:'13px 48px 13px 16px', borderRadius:12, border:'1.5px solid #E8EBF4', fontSize:14, color:'#0a0b0d', background:'white', outline:'none', fontFamily:'Plus Jakarta Sans, sans-serif', transition:'border-color 0.15s' }}
                  onFocus={e=>e.target.style.borderColor='#1A3B8F'}
                  onBlur={e=>e.target.style.borderColor='#E8EBF4'}/>
                <button type="button" onClick={()=>setShowPass(s=>!s)}
                  style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:'#9BA5C0', display:'flex', alignItems:'center' }}>
                  {showPass ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                <p style={{ fontSize:13, color:'#DC2626', fontWeight:600 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:loading?'#9BA5C0':'#1A3B8F', color:'white', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.15s', fontFamily:'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background='#152E6E' }}
              onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background='#1A3B8F' }}>
              {loading
                ? <div style={{ width:18, height:18, border:'2.5px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                : <><span>Masuk ke Sistem</span><ArrowRight size={17}/></>}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:12, color:'#9BA5C0', marginTop:32 }}>
            Hubungi admin jika mengalami kendala akses
          </p>
        </div>
      </div>

      <style>{`
        @media(max-width:768px){ .hidden-mobile{ display:none!important; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}
