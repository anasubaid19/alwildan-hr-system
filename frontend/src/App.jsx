import { useState, useEffect } from 'react'
import Login from './pages/Login'
import FirstSetup from './pages/FirstSetup'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Karyawan from './pages/Karyawan'
import Settings from './pages/Settings'
import UploadData from './pages/Upload'
import Cabang from './pages/Cabang'
import Laporan from './pages/Laporan'
import Profile from './pages/Profile'
import SearchModal from './components/SearchModal'
import NotificationPanel from './components/NotificationPanel'
import {
  LayoutDashboard, Users, Building2, Upload,
  FileText, Settings as Gear, LogOut,
  Bell, Search, ChevronDown
} from 'lucide-react'
import axios from 'axios'

// Set token synchronously setiap kali module diload
// Interceptor — selalu inject token dari localStorage pada setiap request
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('aw_token')
  if (token) config.headers['Authorization'] = 'Bearer ' + token
  return config
})




const SIDEBAR_ICONS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'karyawan',  icon: Users,           label: 'Data Karyawan' },
  { id: 'laporan',   icon: FileText,        label: 'Laporan' },
  { id: 'upload',    icon: Upload,          label: 'Upload Data' },
  { id: 'cabang',    icon: Building2,       label: 'Cabang' },
  { id: 'settings',  icon: Gear,            label: 'Pengaturan' },
]

const PAGES = {
  dashboard: <Dashboard />,
  karyawan:  <Karyawan />,
  upload:    <UploadData />,
  cabang:    <Cabang />,
  laporan:   <Laporan />,
  settings:  <Settings />,
}

// Set token synchronously setiap render
const _t = localStorage.getItem('aw_token')
if (_t) axios.defaults.headers.common['Authorization'] = `Bearer ${_t}`

export default function App() {
  const [user, setUser]       = useState(null)
  const [active, setActive]   = useState('dashboard')
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [isSignupPage, setIsSignupPage] = useState(false)
  const [isForgotPage, setIsForgotPage] = useState(false)
  const [isResetPage, setIsResetPage] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [mobile, setMobile]   = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showSearch, setShowSearch]       = useState(false)
  const [showNotif, setShowNotif]         = useState(false)
  const [unreadCount, setUnreadCount]     = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showGantiPass, setShowGantiPass] = useState(false)
  const [passForm, setPassForm] = useState({ lama:'', baru:'', konfirmasi:'' })
  const [passMsg, setPassMsg] = useState(null)
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    // Deteksi signup page dari URL
    if (window.location.pathname === '/signup') {
      setIsSignupPage(true)
      setChecking(false)
      return
    }

    // Deteksi forgot password page
    if (window.location.pathname === '/lupa-password') {
      setIsForgotPage(true)
      setChecking(false)
      return
    }

    // Deteksi reset password page dengan token
    const rpMatch = window.location.pathname.match(/^\/reset-password\/(.+)$/)
    if (rpMatch) {
      setResetToken(rpMatch[1])
      setIsResetPage(true)
      setChecking(false)
      return
    }

    const token = localStorage.getItem('aw_token')
    const u = localStorage.getItem('aw_user')
    if (token && u) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const parsed = JSON.parse(u)
      setUser(parsed)
      axios.get('/api/auth/profile', { headers: { Authorization: 'Bearer ' + token } })
        .then(r => {
          const updated = { ...parsed, ...r.data.data }
          setUser(updated)
          localStorage.setItem('aw_user', JSON.stringify(updated))
        }).catch(() => {})
      setChecking(false)
    } else {
      // Cek apakah perlu first setup
      axios.get('/api/auth/setup-status')
        .then(r => { setNeedsSetup(r.data.needsSetup) })
        .catch(() => {})
        .finally(() => setChecking(false))
    }
  }, [])

  const login = (u) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('aw_token')}`
    setNeedsSetup(false)
    setIsSignupPage(false)
    setIsForgotPage(false)
    setIsResetPage(false)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('aw_token')
    localStorage.removeItem('aw_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const navigate = (id) => { setActive(id); setMobileMenu(false); setShowDropdown(false) }

  useEffect(() => {
    const fetchUnread = () => {
      const token = localStorage.getItem('aw_token')
      if (!token) return
      axios.get('/api/notifications', { headers: { Authorization: 'Bearer ' + token } })
        .then(r => setUnreadCount(r.data.unread)).catch(()=>{})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000) // poll tiap 15 detik
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(s=>!s) }
      if (e.key === 'Escape') { setShowSearch(false); setShowDropdown(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleGantiPassword = async () => {
    if (passForm.baru !== passForm.konfirmasi) return setPassMsg({ type:'error', text:'Password baru tidak cocok' })
    if (passForm.baru.length < 6) return setPassMsg({ type:'error', text:'Password minimal 6 karakter' })
    setSavingPass(true)
    try {
      const token = localStorage.getItem('aw_token')
      await axios.post('/api/auth/change-password',
        { password_lama: passForm.lama, password_baru: passForm.baru },
        { headers: { Authorization: 'Bearer ' + token } }
      )
      setPassMsg({ type:'ok', text:'Password berhasil diubah!' })
      setPassForm({ lama:'', baru:'', konfirmasi:'' })
      setTimeout(() => { setShowGantiPass(false); setPassMsg(null) }, 2000)
    } catch(e) {
      setPassMsg({ type:'error', text: e.response?.data?.message || 'Gagal mengubah password' })
    } finally { setSavingPass(false) }
  }

  if (checking) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F8' }}>
      <div style={{ width:28, height:28, border:'2.5px solid #1A3B8F', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  if (isSignupPage) return <Signup onSignup={login} />
  if (isForgotPage) return <ForgotPassword onBack={() => window.location.href = '/'} />
  if (isResetPage) return <ResetPassword token={resetToken} onDone={() => window.location.href = '/'} />
  if (needsSetup) return <FirstSetup onSetup={login} />
  if (!user) return <Login onLogin={login} />

  const firstName = user.nama?.split(' ')[0] || 'HR'

  /* ── MOBILE ── */
  if (mobile) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#F0F2F8' }}>
      {/* Mobile header */}
      <header style={{ height:56, background:'#1A3B8F', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', flexShrink:0, position:'relative', zIndex:30 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/src/assets/logo.png" style={{ width:32, height:32, borderRadius:8, objectFit:'contain', background:'white' }} onError={e=>e.target.style.display='none'} />
          <span style={{ color:'white', fontWeight:700, fontSize:14 }}>AL-WILDAN HR</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, pointerEvents:'all', position:'relative', zIndex:30 }}>
          {/* Search mobile */}
          <button
            onClick={()=>setShowSearch(true)}
            style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
            <Search size={16}/>
          </button>
          {/* Bell mobile */}
          <div style={{ position:'relative' }}>
            <button
              onClick={()=>setShowNotif(s=>!s)}
              style={{ width:34, height:34, borderRadius:10, border:'1px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
              <Bell size={16}/>
            </button>
            {unreadCount > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:100, background:'#EF4444', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'white', padding:'0 3px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
            {showNotif && (
              <NotificationPanel
                onClose={()=>setShowNotif(false)}
                onNavigate={navigate}
                onUnreadChange={setUnreadCount}
              />
            )}
          </div>
          {/* Avatar mobile */}
          <div style={{ position:'relative' }}>
            <button
              onClick={()=>setShowDropdown(s=>!s)}
              style={{ width:34, height:34, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.4)', cursor:'pointer', overflow:'hidden', padding:0, WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
              {user.avatar
                ? <img src={user.avatar} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                : <div style={{ width:'100%', height:'100%', background:'#1A3B8F', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{user.inisial}</div>
              }
            </button>
            {showDropdown && (
              <>
                <div onClick={()=>setShowDropdown(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'white', borderRadius:16, border:'1px solid #E8EBF4', boxShadow:'0 8px 32px rgba(26,59,143,0.15)', width:200, zIndex:50, overflow:'hidden' }}>
                  <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid #E8EBF4', background:'#F8F9FC' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#0a0b0d' }}>{user.nama}</p>
                    <p style={{ fontSize:11, color:'#9BA5C0', marginTop:2 }}>{user.email}</p>
                  </div>
                  <div style={{ padding:8 }}>
                    <button onClick={()=>{ navigate('profile'); setShowDropdown(false) }}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#0a0b0d', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:500, textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F0F2F8'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      👤 Profil & Pengaturan
                    </button>
                    <button onClick={()=>{ navigate('settings'); setShowDropdown(false) }}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#0a0b0d', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:500, textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F0F2F8'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      ⚙️ Pengaturan
                    </button>
                    <div style={{ height:1, background:'#E8EBF4', margin:'4px 0' }}/>
                    <button onClick={logout}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#EF4444', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:600, textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      🚪 Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex:1, overflowY:'auto', padding:16, paddingBottom:80 }}>
        {PAGES[active] || null}
      </main>
      {/* Mobile bottom nav */}
      <nav style={{ height:64, background:'white', borderTop:'1px solid #E8EBF4', display:'flex', alignItems:'center', flexShrink:0 }}>
        {[...SIDEBAR_ICONS.slice(0,4), SIDEBAR_ICONS[4]].map(({ id, icon:Icon, label }) => (
          <button key={id} onClick={()=>navigate(id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, border:'none', background:'transparent', cursor:'pointer', color:active===id?'#1A3B8F':'#9BA5C0' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:active===id?'#EEF1FA':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={19}/>
            </div>
            <span style={{ fontSize:9, fontWeight:active===id?700:400 }}>{label?.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* Search modal — harus di luar header agar muncul di mobile */}
      {showSearch && (
        <SearchModal
          onClose={()=>setShowSearch(false)}
          onNavigate={(page) => { navigate(page); setShowSearch(false) }}
        />
      )}
    </div>
  )

  /* ── DESKTOP ── */
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#F0F2F8' }}>

      {/* Icon Sidebar */}
      <aside style={{ width:72, background:'white', display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0', borderRight:'1px solid #E8EBF4', flexShrink:0, zIndex:10 }}>
        {/* Logo */}
        <div style={{ width:44, height:44, borderRadius:12, background:'#1A3B8F', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:32, overflow:'hidden' }}>
          <img src="/src/assets/logo.png" style={{ width:36, height:36, objectFit:'contain' }}
            onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="color:white;font-weight:800;font-size:11px">AW</span>' }}/>
        </div>

        {/* Nav icons */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1 }}>
          {SIDEBAR_ICONS.slice(0,5).map(({ id, icon:Icon }) => (
            <button key={id} onClick={()=>navigate(id)} title={SIDEBAR_ICONS.find(n=>n.id===id)?.label}
              style={{ width:48, height:48, borderRadius:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s',
                background: active===id ? '#1A3B8F' : 'transparent',
                color: active===id ? 'white' : '#9BA5C0' }}
              onMouseEnter={e=>{ if(active!==id){ e.currentTarget.style.background='#F0F2F8'; e.currentTarget.style.color='#1A3B8F' }}}
              onMouseLeave={e=>{ if(active!==id){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#9BA5C0' }}}>
              <Icon size={20}/>
            </button>
          ))}
        </div>

        {/* Bottom icons */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <button onClick={()=>navigate('settings')} title="Pengaturan"
            style={{ width:48, height:48, borderRadius:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:active==='settings'?'#1A3B8F':'transparent', color:active==='settings'?'white':'#9BA5C0' }}
            onMouseEnter={e=>{ if(active!=='settings'){ e.currentTarget.style.background='#F0F2F8'; e.currentTarget.style.color='#1A3B8F' }}}
            onMouseLeave={e=>{ if(active!=='settings'){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#9BA5C0' }}}>
            <Gear size={20}/>
          </button>
          <button onClick={logout} title="Keluar"
            style={{ width:48, height:48, borderRadius:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#E05C5C', background:'transparent' }}
            onMouseEnter={e=>{ e.currentTarget.style.background='#FEF0F0' }}
            onMouseLeave={e=>{ e.currentTarget.style.background='transparent' }}>
            <LogOut size={20}/>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Top Navigation */}
        <header style={{ height:64, background:'white', borderBottom:'1px solid #E8EBF4', display:'flex', alignItems:'center', padding:'0 24px', gap:0, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:16, fontWeight:700, color:'#0a0b0d' }}>{active === 'settings' ? 'Pengaturan' : SIDEBAR_ICONS.find(n=>n.id===active)?.label || ''}</p>
            <p style={{ fontSize:12, color:'#9BA5C0' }}>AL-WILDAN Islamic School · HR Pusat</p>
          </div>

          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setShowSearch(true)} title="Cari (⌘K)"
              style={{ width:38, height:38, borderRadius:10, border:'1px solid #E8EBF4', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#9BA5C0', transition:'all 0.15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#1A3B8F'; e.currentTarget.style.color='#1A3B8F' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E8EBF4'; e.currentTarget.style.color='#9BA5C0' }}>
              <Search size={17}/>
            </button>
            <div style={{ position:'relative' }}>
              <button onClick={()=>setShowNotif(s=>!s)}
                style={{ width:38, height:38, borderRadius:10, border:'1px solid #E8EBF4', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#9BA5C0', transition:'all 0.15s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#1A3B8F'; e.currentTarget.style.color='#1A3B8F' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='#E8EBF4'; e.currentTarget.style.color='#9BA5C0' }}>
                <Bell size={17}/>
              </button>
              {unreadCount > 0 && (
                <div style={{ position:'absolute', top:-4, right:-4, minWidth:18, height:18, borderRadius:100, background:'#EF4444', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white', padding:'0 4px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
              {showNotif && (
                <NotificationPanel
                  onClose={()=>setShowNotif(false)}
                  onNavigate={navigate}
                  onUnreadChange={setUnreadCount}
                />
              )}
            </div>
            <div style={{ position:'relative' }}>
              <div onClick={()=>setShowDropdown(s=>!s)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 12px', borderRadius:12, border:'1px solid #E8EBF4', cursor:'pointer', background:'white', userSelect:'none' }}>
                {user.avatar
                ? <img src={user.avatar} style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover' }}/>
                : <div style={{ width:30, height:30, borderRadius:'50%', background:'#1A3B8F', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{user.inisial}</div>
              }
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#0a0b0d', lineHeight:1.2 }}>{firstName}</p>
                  <p style={{ fontSize:11, color:'#9BA5C0' }}>HR Pusat</p>
                </div>
                <ChevronDown size={14} color="#9BA5C0" style={{ transform: showDropdown?'rotate(180deg)':'none', transition:'transform 0.2s' }}/>
              </div>

              {showDropdown && (
                <>
                  <div onClick={()=>setShowDropdown(false)} style={{ position:'fixed', inset:0, zIndex:40 }}/>
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'white', borderRadius:16, border:'1px solid #E8EBF4', boxShadow:'0 8px 32px rgba(26,59,143,0.12)', width:220, zIndex:50, overflow:'hidden' }}>
                    <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #E8EBF4', background:'#F8F9FC' }}>
                      {user.avatar
                    ? <img src={user.avatar} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', marginBottom:8 }}/>
                    : <div style={{ width:40, height:40, borderRadius:'50%', background:'#1A3B8F', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, marginBottom:8 }}>{user.inisial}</div>
                  }
                      <p style={{ fontSize:13, fontWeight:700, color:'#0a0b0d' }}>{user.nama}</p>
                      <p style={{ fontSize:11, color:'#9BA5C0', marginTop:2 }}>{user.email}</p>
                    </div>
                    <div style={{ padding:8 }}>
                      <button onClick={()=>{ navigate('profile'); setShowDropdown(false) }}
                        style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#0a0b0d', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:500, textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F2F8'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        👤 Profil & Pengaturan
                      </button>
                      <button onClick={()=>{ navigate('settings'); setShowDropdown(false) }}
                        style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#0a0b0d', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:500, textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F2F8'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        ⚙️ Pengaturan
                      </button>
                      <div style={{ height:1, background:'#E8EBF4', margin:'6px 0' }}/>
                      <button onClick={logout}
                        style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#EF4444', fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:600, textAlign:'left' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        🚪 Keluar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }} className="fade-in">
          {active === 'profile'
            ? <Profile onUpdate={u => setUser(prev => ({...prev, ...u}))}/>
            : (PAGES[active] || (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#9BA5C0', fontSize:14 }}>
                  Halaman sedang dikembangkan
                </div>
              ))
          }
        </main>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          onClose={()=>setShowSearch(false)}
          onNavigate={(page) => { navigate(page); setShowSearch(false) }}
        />
      )}

      {/* Modal Ganti Password */}
      {showGantiPass && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #E8EBF4' }}>
              <p style={{ fontSize:16, fontWeight:700, color:'#0a0b0d' }}>🔑 Ganti Password</p>
              <button onClick={()=>{ setShowGantiPass(false); setPassMsg(null); setPassForm({lama:'',baru:'',konfirmasi:''}) }}
                style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
              {['lama','baru','konfirmasi'].map(key => (
                <div key={key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#0a0b0d', marginBottom:6 }}>
                    {key==='lama'?'Password Lama':key==='baru'?'Password Baru':'Konfirmasi Password Baru'}
                  </label>
                  <input type="password" value={passForm[key]}
                    onChange={e=>setPassForm(f=>({...f,[key]:e.target.value}))}
                    placeholder="••••••••"
                    style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #E8EBF4', fontSize:13, fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor='#1A3B8F'}
                    onBlur={e=>e.target.style.borderColor='#E8EBF4'}/>
                </div>
              ))}
              {passMsg && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:passMsg.type==='ok'?'#F0FDF4':'#FEF2F2', border:`1px solid ${passMsg.type==='ok'?'#BBF7D0':'#FECACA'}` }}>
                  <p style={{ fontSize:13, fontWeight:600, color:passMsg.type==='ok'?'#166534':'#DC2626' }}>{passMsg.text}</p>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:4 }}>
                <button onClick={()=>{ setShowGantiPass(false); setPassMsg(null) }}
                  style={{ padding:'10px 20px', borderRadius:100, border:'1.5px solid #E8EBF4', background:'white', color:'#0a0b0d', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Batal
                </button>
                <button onClick={handleGantiPassword} disabled={savingPass}
                  style={{ padding:'10px 24px', borderRadius:100, border:'none', background:savingPass?'#9BA5C0':'#1A3B8F', color:'white', fontSize:13, fontWeight:700, cursor:savingPass?'not-allowed':'pointer' }}>
                  {savingPass ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
