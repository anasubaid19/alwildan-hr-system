import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Camera, Save, Eye, EyeOff, CheckCircle, XCircle, User, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import Cropper from 'react-easy-crop'

const authHeaders = () => {
  const t = localStorage.getItem('aw_token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}

const C = { primary:'#1A3B8F', gold:'#C8962E', ink:'#0a0b0d', muted:'#9BA5C0', hairline:'#E8EBF4', green:'#22C55E', red:'#EF4444' }

export default function Profile({ onUpdate }) {
  const [profile, setProfile]   = useState(null)
  const [nama, setNama]         = useState('')
  const [avatar, setAvatar]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [cropSrc, setCropSrc]   = useState(null)
  const [crop, setCrop]         = useState({ x:0, y:0 })
  const [zoom, setZoom]         = useState(1)
  const [croppedArea, setCroppedArea] = useState(null)
  const [showCrop, setShowCrop] = useState(false)
  const [msg, setMsg]           = useState(null)
  const [passForm, setPassForm] = useState({ lama:'', baru:'', konfirmasi:'' })
  const [passMsg, setPassMsg]   = useState(null)
  const [savingPass, setSavingPass] = useState(false)
  const [showPass, setShowPass] = useState({ lama:false, baru:false, konfirmasi:false })
  const fileRef = useRef()

  useEffect(() => {
    axios.get('/api/auth/profile', { headers: authHeaders() }).then(r => {
      setProfile(r.data.data)
      setNama(r.data.data.nama)
      setAvatar(r.data.data.avatar)
    })
  }, [])

  const handlePhoto = (file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return alert('Foto maksimal 10MB')
    const reader = new FileReader()
    reader.onload = e => {
      setCropSrc(e.target.result)
      setCrop({ x:0, y:0 })
      setZoom(1)
      setShowCrop(true)
    }
    reader.readAsDataURL(file)
  }

  const getCroppedImg = async () => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 300
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(
          img,
          croppedArea.x, croppedArea.y,
          croppedArea.width, croppedArea.height,
          0, 0, size, size
        )
        resolve(canvas.toDataURL('image/jpeg', 0.88))
      }
      img.src = cropSrc
    })
  }

  const handleCropConfirm = async () => {
    const cropped = await getCroppedImg()
    setAvatar(cropped)
    setShowCrop(false)
    setCropSrc(null)
  }

  const handleSaveProfile = async () => {
    setSaving(true); setMsg(null)
    try {
      const res = await axios.put('/api/auth/profile', { nama, avatar }, { headers: authHeaders() })
      setProfile(res.data.data)
      // Update localStorage dan state
      const u = JSON.parse(localStorage.getItem('aw_user') || '{}')
      const updated = { ...u, nama: res.data.data.nama, avatar: res.data.data.avatar }
      localStorage.setItem('aw_user', JSON.stringify(updated))
      setMsg({ type:'ok', text:'Profil berhasil disimpan!' })
      if (onUpdate) onUpdate(updated)
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg({ type:'error', text:'Gagal menyimpan profil' }) }
    finally { setSaving(false) }
  }

  const handleGantiPass = async () => {
    if (passForm.baru !== passForm.konfirmasi) return setPassMsg({ type:'error', text:'Password baru tidak cocok' })
    if (passForm.baru.length < 6) return setPassMsg({ type:'error', text:'Password minimal 6 karakter' })
    setSavingPass(true); setPassMsg(null)
    try {
      await axios.post('/api/auth/change-password',
        { password_lama: passForm.lama, password_baru: passForm.baru },
        { headers: authHeaders() }
      )
      setPassMsg({ type:'ok', text:'Password berhasil diubah!' })
      setPassForm({ lama:'', baru:'', konfirmasi:'' })
      setTimeout(() => setPassMsg(null), 3000)
    } catch(e) {
      setPassMsg({ type:'error', text: e.response?.data?.message || 'Gagal mengubah password' })
    } finally { setSavingPass(false) }
  }

  const card = { background:'white', borderRadius:20, border:`1px solid ${C.hairline}`, overflow:'hidden' }
  const inputStyle = { width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${C.hairline}`, fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }

  if (!profile) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${C.primary}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ maxWidth:600, display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Profil Saya</h2>
        <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>Kelola informasi akun dan keamanan</p>
      </div>

      {/* Foto & Nama */}
      <div style={card}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <User size={20} color={C.primary}/>
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Informasi Profil</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Foto dan nama tampil di seluruh sistem</p>
          </div>
        </div>

        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>
          {/* Avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              {avatar ? (
                <img src={avatar} style={{ width:88, height:88, borderRadius:'50%', objectFit:'cover', border:`3px solid ${C.hairline}` }}/>
              ) : (
                <div style={{ width:88, height:88, borderRadius:'50%', background:'#1A3B8F', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'white', border:`3px solid ${C.hairline}` }}>
                  {profile.inisial}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:C.primary, border:'2px solid white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Camera size={13} color="white"/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => handlePhoto(e.target.files[0])}/>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:C.ink }}>{profile.nama}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>{profile.email}</p>
              <button onClick={() => fileRef.current?.click()}
                style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <Camera size={13}/> Ganti Foto
              </button>
            </div>
          </div>

          {/* Nama */}
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>Nama Lengkap</label>
            <input value={nama} onChange={e => setNama(e.target.value)} style={inputStyle}
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.hairline}/>
          </div>

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>Email</label>
            <input value={profile.email} disabled style={{ ...inputStyle, background:'#F8F9FC', color:C.muted }}/>
            <p style={{ fontSize:11, color:C.muted, marginTop:5 }}>Email tidak dapat diubah</p>
          </div>

          {msg && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:msg.type==='ok'?'#F0FDF4':'#FEF2F2', border:`1px solid ${msg.type==='ok'?'#BBF7D0':'#FECACA'}`, display:'flex', alignItems:'center', gap:8 }}>
              {msg.type==='ok' ? <CheckCircle size={15} color={C.green}/> : <XCircle size={15} color={C.red}/>}
              <p style={{ fontSize:13, fontWeight:600, color:msg.type==='ok'?'#166534':C.red }}>{msg.text}</p>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', background:'#F8F9FC', borderTop:`1px solid ${C.hairline}`, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={handleSaveProfile} disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:100, border:'none', background:saving?C.muted:C.primary, color:'white', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
            <Save size={14}/> {saving?'Menyimpan...':'Simpan Profil'}
          </button>
        </div>
      </div>

      {/* Ganti Password */}
      <div style={card}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🔑</div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Ganti Password</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Gunakan password yang kuat dan unik</p>
          </div>
        </div>

        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { key:'lama', label:'Password Lama' },
            { key:'baru', label:'Password Baru' },
            { key:'konfirmasi', label:'Konfirmasi Password Baru' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>{label}</label>
              <div style={{ position:'relative' }}>
                <input type={showPass[key]?'text':'password'} value={passForm[key]}
                  onChange={e => setPassForm(f => ({...f, [key]:e.target.value}))}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight:44 }}
                  onFocus={e=>e.target.style.borderColor=C.primary}
                  onBlur={e=>e.target.style.borderColor=C.hairline}/>
                <button onClick={() => setShowPass(s => ({...s, [key]:!s[key]}))}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:C.muted, display:'flex' }}>
                  {showPass[key] ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
          ))}

          {passMsg && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:passMsg.type==='ok'?'#F0FDF4':'#FEF2F2', border:`1px solid ${passMsg.type==='ok'?'#BBF7D0':'#FECACA'}`, display:'flex', alignItems:'center', gap:8 }}>
              {passMsg.type==='ok' ? <CheckCircle size={15} color={C.green}/> : <XCircle size={15} color={C.red}/>}
              <p style={{ fontSize:13, fontWeight:600, color:passMsg.type==='ok'?'#166534':C.red }}>{passMsg.text}</p>
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', background:'#F8F9FC', borderTop:`1px solid ${C.hairline}`, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={handleGantiPass} disabled={savingPass}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:100, border:'none', background:savingPass?C.muted:C.primary, color:'white', fontSize:13, fontWeight:700, cursor:savingPass?'not-allowed':'pointer' }}>
            🔑 {savingPass?'Menyimpan...':'Ganti Password'}
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      {showCrop && cropSrc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
          <div style={{ background:'white', borderRadius:20, overflow:'hidden', width:'90%', maxWidth:480 }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Sesuaikan Foto</p>
              <button onClick={()=>setShowCrop(false)}
                style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', fontSize:16, color:C.muted }}>✕</button>
            </div>

            {/* Crop area */}
            <div style={{ position:'relative', width:'100%', height:320, background:'#000' }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
              />
            </div>

            {/* Zoom control */}
            <div style={{ padding:'16px 24px', display:'flex', alignItems:'center', gap:12, borderTop:`1px solid ${C.hairline}` }}>
              <ZoomOut size={16} color={C.muted}/>
              <input type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex:1, accentColor:C.primary }}/>
              <ZoomIn size={16} color={C.muted}/>
            </div>

            {/* Actions */}
            <div style={{ padding:'0 24px 20px', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowCrop(false)}
                style={{ padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Batal
              </button>
              <button onClick={handleCropConfirm}
                style={{ padding:'10px 24px', borderRadius:100, border:'none', background:C.primary, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Gunakan Foto
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
