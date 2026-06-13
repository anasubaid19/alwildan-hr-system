import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Save, Wifi, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Settings2, Upload, FileSpreadsheet, Trash2, Users, KeyRound, Copy, Check, Plus, ShieldCheck } from 'lucide-react'

const authHeaders = () => {
  const t = localStorage.getItem('aw_token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}

const C = { primary:'#1A3B8F', gold:'#C8962E', ink:'#0a0b0d', muted:'#9BA5C0', hairline:'#E8EBF4', bg:'#F0F2F8', green:'#22C55E', red:'#EF4444' }

const PROVIDERS = [
  { id:'ollama',       label:'Ollama Lokal',        url:'http://localhost:11434/v1',            desc:'Gratis, data tidak keluar server' },
  { id:'ollama-cloud', label:'Ollama Cloud',         url:'https://api.ollama.com/v1',           desc:'Cloud, free tier terbatas' },
  { id:'groq',         label:'Groq',                 url:'https://api.groq.com/openai/v1',      desc:'Free tier generous, cepat' },
  { id:'anthropic',    label:'Anthropic (Claude)',   url:'https://api.anthropic.com/v1',        desc:'Akurasi terbaik' },
  { id:'openai',       label:'OpenAI',               url:'https://api.openai.com/v1',           desc:'GPT models' },
  { id:'nvidia',       label:'NVIDIA NIM',           url:'https://integrate.api.nvidia.com/v1', desc:'NVIDIA AI models' },
  { id:'custom',       label:'Custom',               url:'',                                    desc:'OpenAI-compatible endpoint' },
]

const Field = ({ label, hint, children }) => (
  <div>
    <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize:11, color:C.muted, marginTop:5 }}>{hint}</p>}
  </div>
)

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', pegawai: 'Pegawai' }
const ROLE_COLOR = { superadmin: { bg:'#FEF3C7', text:'#B45309', border:'#FDE68A' }, admin: { bg:'#EEF1FA', text:'#1A3B8F', border:'#C7D2F0' }, pegawai: { bg:'#F0FDF4', text:'#166534', border:'#BBF7D0' } }

function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || ROLE_COLOR.admin
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>
      {ROLE_LABEL[role] || role}
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={handleCopy}
      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:`1px solid ${copied ? '#BBF7D0' : C.hairline}`, background: copied ? '#F0FDF4' : 'white', color: copied ? '#166534' : C.muted, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
      {copied ? <><Check size={12}/> Disalin</> : <><Copy size={12}/> Salin</>}
    </button>
  )
}

export default function Settings() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('aw_user') || '{}') } catch { return {} } })()
  const isSuperAdmin = currentUser.role === 'superadmin'

  const [form, setForm]           = useState({ ai_provider:'groq', ai_base_url:'https://api.groq.com/openai/v1', ai_api_key:'', ai_model:'' })
  const [showKey, setShowKey]     = useState(false)
  const [models, setModels]       = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [testStatus, setTestStatus] = useState(null)
  const [testMsg, setTestMsg]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [master, setMaster]       = useState(null)
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterUploading, setMasterUploading] = useState(false)
  const masterRef = useRef()

  // User management state
  const [users, setUsers]           = useState([])
  const [invites, setInvites]       = useState([])
  const [inviteForm, setInviteForm] = useState({ email:'', role:'admin' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg]   = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => {
    axios.get('/api/master', { headers: authHeaders() })
      .then(r => setMaster(r.data.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    axios.get('/api/auth/users', { headers: authHeaders() })
      .then(r => setUsers(r.data.data || [])).catch(() => {})
    axios.get('/api/auth/invites', { headers: authHeaders() })
      .then(r => setInvites(r.data.data || [])).catch(() => {})
  }, [isSuperAdmin])

  useEffect(() => {
    axios.get('/api/settings', { headers: authHeaders() }).then(r => {
      setForm(f => ({ ...f, ...r.data.data }))
    })
  }, [])

  const handleProvider = (id) => {
    const p = PROVIDERS.find(p => p.id === id)
    setForm(f => ({ ...f, ai_provider: id, ai_base_url: p?.url || '' }))
    setModels([])
    setTestStatus(null)
  }

  const fetchModels = async () => {
    setLoadingModels(true)
    try {
      const res = await axios.post('/api/settings/models', form, { headers: authHeaders() })
      setModels(res.data.data || [])
    } catch { setModels([]) }
    finally { setLoadingModels(false) }
  }

  const testConnection = async () => {
    setTestStatus('loading'); setTestMsg('')
    try {
      const res = await axios.post('/api/settings/test-ai', form, { headers: authHeaders() })
      setTestStatus('ok'); setTestMsg(res.data.message)
    } catch(e) {
      setTestStatus('error'); setTestMsg(e.response?.data?.message || 'Koneksi gagal')
    }
  }

  const handleMasterUpload = async (file) => {
    if (!file) return
    setMasterUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post('/api/master/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() }
      })
      setMaster(res.data.data)
      alert(`✓ Master data berhasil diupload: ${res.data.data.total_employees} karyawan, ${res.data.data.columns.length} kolom`)
    } catch(e) { alert(e.response?.data?.message || 'Gagal upload') }
    finally { setMasterUploading(false) }
  }

  const handleMasterDelete = async () => {
    if (!confirm('Hapus master data? AI mapping akan kembali ke mode default.')) return
    await axios.delete('/api/master', { headers: authHeaders() })
    setMaster(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.put('/api/settings', form, { headers: authHeaders() })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { alert('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const handleGenerateInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email) return
    setInviteLoading(true)
    setInviteMsg(null)
    try {
      const res = await axios.post('/api/auth/invite', inviteForm, { headers: authHeaders() })
      setInviteMsg({ type:'ok', key: res.data.key, email: res.data.email, role: res.data.role })
      setInviteForm(f => ({ ...f, email:'' }))
      // Refresh list
      const r = await axios.get('/api/auth/invites', { headers: authHeaders() })
      setInvites(r.data.data || [])
    } catch(e) {
      setInviteMsg({ type:'error', text: e.response?.data?.message || 'Gagal generate key' })
    } finally { setInviteLoading(false) }
  }

  const inputStyle = { width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${C.hairline}`, fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none' }

  return (
    <div style={{ maxWidth:640, display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Pengaturan</h2>
        <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>Konfigurasi AI provider untuk analisis data karyawan</p>
      </div>

      {/* AI Provider Card */}
      <div style={{ background:'white', borderRadius:20, border:`1px solid ${C.hairline}`, overflow:'hidden' }}>

        {/* Card Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Settings2 size={20} color={C.primary}/>
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>AI Provider</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Pilih platform dan masukkan kredensial API</p>
          </div>
        </div>

        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>

          {/* Provider Grid */}
          <Field label="Platform AI">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10 }}>
              {PROVIDERS.map(p => (
                <button key={p.id} onClick={() => handleProvider(p.id)}
                  style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${form.ai_provider===p.id?C.primary:C.hairline}`,
                    background: form.ai_provider===p.id ? '#EEF1FA' : 'white',
                    cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                  <p style={{ fontSize:13, fontWeight:700, color: form.ai_provider===p.id?C.primary:C.ink }}>{p.label}</p>
                  <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{p.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          {/* Base URL */}
          <Field label="Base URL">
            <input type="text" value={form.ai_base_url} onChange={e=>setForm(f=>({...f,ai_base_url:e.target.value}))}
              placeholder="https://api.example.com/v1" style={{ ...inputStyle, fontFamily:'monospace' }}
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.hairline}/>
          </Field>

          {/* API Key */}
          <Field label="API Key" hint="Kosongkan jika tidak diperlukan (misal Ollama lokal)">
            <div style={{ position:'relative' }}>
              <input type={showKey?'text':'password'} value={form.ai_api_key}
                onChange={e=>setForm(f=>({...f,ai_api_key:e.target.value}))}
                placeholder="Masukkan API key..." style={{ ...inputStyle, fontFamily:'monospace', paddingRight:44 }}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.hairline}/>
              <button onClick={()=>setShowKey(s=>!s)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:C.muted, display:'flex' }}>
                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </Field>

          {/* Model */}
          <Field label="Model">
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ flex:1 }}>
                {models.length > 0 ? (
                  <select value={form.ai_model} onChange={e=>setForm(f=>({...f,ai_model:e.target.value}))}
                    style={{ ...inputStyle, cursor:'pointer' }}>
                    <option value="">— Pilih model —</option>
                    {models.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.ai_model} onChange={e=>setForm(f=>({...f,ai_model:e.target.value}))}
                    placeholder="contoh: llama-3.1-8b-instant" style={{ ...inputStyle, fontFamily:'monospace' }}
                    onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.hairline}/>
                )}
              </div>
              <button onClick={fetchModels} disabled={loadingModels}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 18px', borderRadius:10, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                <RefreshCw size={14} style={{ animation: loadingModels?'spin 0.8s linear infinite':'none' }}/>
                Fetch Model
              </button>
            </div>
            {models.length > 0 && <p style={{ fontSize:11, color:C.green, marginTop:5, fontWeight:600 }}>✓ {models.length} model tersedia</p>}
          </Field>

          {/* Test Connection */}
          <div style={{ borderRadius:12, padding:'14px 16px', border:`1.5px solid ${testStatus==='ok'?'#BBF7D0':testStatus==='error'?'#FECACA':C.hairline}`,
            background: testStatus==='ok'?'#F0FDF4':testStatus==='error'?'#FEF2F2':'#F8F9FC' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {testStatus==='ok'      && <CheckCircle size={16} color={C.green}/>}
                {testStatus==='error'   && <XCircle size={16} color={C.red}/>}
                {testStatus==='loading' && <div style={{ width:16, height:16, border:`2px solid ${C.primary}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>}
                {!testStatus            && <Wifi size={16} color={C.muted}/>}
                <p style={{ fontSize:13, color: testStatus==='ok'?'#166534':testStatus==='error'?C.red:C.muted }}>
                  {testMsg || 'Test koneksi sebelum menyimpan'}
                </p>
              </div>
              <button onClick={testConnection} disabled={testStatus==='loading'}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                <Wifi size={13}/> Test Koneksi
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', background:'#F8F9FC', borderTop:`1px solid ${C.hairline}`, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:100, border:'none',
              background: saved ? '#22C55E' : saving ? C.muted : C.primary,
              color:'white', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', transition:'background 0.2s' }}>
            {saved ? <><CheckCircle size={16}/> Tersimpan!</> : saving ? 'Menyimpan...' : <><Save size={16}/> Simpan Settings</>}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:16, padding:'16px 20px' }}>
        <p style={{ fontSize:13, fontWeight:700, color:'#92400E', marginBottom:8 }}>💡 Panduan Pemilihan Provider</p>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            ['Ollama Lokal','Data tidak keluar server, gratis, butuh server yang cukup kuat'],
            ['Groq','Free tier paling generous, cocok untuk development dan testing'],
            ['Ollama Cloud','Mudah setup, ada free tier namun terbatas'],
            ['Claude (Anthropic)','Akurasi terbaik untuk mapping dan name matching'],
          ].map(([name, desc]) => (
            <div key={name} style={{ display:'flex', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#B45309', minWidth:120 }}>{name}</span>
              <span style={{ fontSize:12, color:'#92400E' }}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Utama Section */}
      <div style={{ background:'white', borderRadius:20, border:`1px solid ${C.hairline}`, overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileSpreadsheet size={20} color={C.primary}/>
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Data Utama HR Pusat</p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>File Excel standar sebagai referensi AI saat mapping data cabang</p>
          </div>
        </div>

        <div style={{ padding:24 }}>
          {master ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {/* Status uploaded */}
              <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <CheckCircle size={20} color={C.green}/>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#166534' }}>{master.filename}</p>
                    <p style={{ fontSize:12, color:'#16a34a', marginTop:2 }}>
                      {master.total_employees || master.employee_list?.length} karyawan · {master.columns?.length} kolom terdeteksi
                    </p>
                  </div>
                </div>
                <button onClick={handleMasterDelete}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:'#FEF2F2', color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  <Trash2 size={13}/> Hapus
                </button>
              </div>

              {/* Kolom yang terdeteksi */}
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:10 }}>Kolom Terdeteksi ({master.columns?.length})</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {master.columns?.map(col => (
                    <span key={col} style={{ background:'#EEF1FA', color:C.primary, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100 }}>{col}</span>
                  ))}
                </div>
              </div>

              {/* Preview nama karyawan */}
              {master.employee_list?.length > 0 && (
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:C.ink, marginBottom:10 }}>
                    <Users size={13} style={{ display:'inline', marginRight:4 }}/> 
                    Preview Nama Karyawan (10 pertama)
                  </p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {master.employee_list.slice(0,10).map((n,i) => (
                      <span key={i} style={{ background:'#F8F9FC', border:`1px solid ${C.hairline}`, color:C.ink, fontSize:12, padding:'4px 10px', borderRadius:8 }}>{n}</span>
                    ))}
                    {master.total_employees > 10 && (
                      <span style={{ background:'#F8F9FC', color:C.muted, fontSize:12, padding:'4px 10px', borderRadius:8 }}>+{master.total_employees - 10} lainnya</span>
                    )}
                  </div>
                </div>
              )}

              {/* Re-upload */}
              <div>
                <input ref={masterRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
                  onChange={e => handleMasterUpload(e.target.files[0])}/>
                <button onClick={() => masterRef.current?.click()} disabled={masterUploading}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  <RefreshCw size={14}/> Upload Ulang
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input ref={masterRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
                onChange={e => handleMasterUpload(e.target.files[0])}/>
              <div onClick={() => masterRef.current?.click()}
                style={{ border:`2px dashed ${C.hairline}`, borderRadius:14, padding:'40px 24px', textAlign:'center', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=C.primary; e.currentTarget.style.background='#F8F9FC' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=C.hairline; e.currentTarget.style.background='transparent' }}>
                {masterUploading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, border:`3px solid ${C.primary}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                    <p style={{ fontSize:13, color:C.muted }}>Menganalisis file...</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Upload size={24} color={C.primary}/>
                    </div>
                    <div>
                      <p style={{ fontSize:14, fontWeight:700, color:C.ink }}>Upload File Excel HR Pusat</p>
                      <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>File ini menjadi referensi AI saat mapping data dari cabang</p>
                      <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Format: .xlsx, .xls, .csv</p>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop:12, padding:'12px 16px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10 }}>
                <p style={{ fontSize:12, color:'#92400E' }}>
                  💡 Upload file Excel standar HR Pusat yang berisi nama-nama kolom dan contoh data karyawan. 
                  AI akan menggunakan ini sebagai panduan saat mencocokkan data dari masing-masing cabang.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manajemen User — Super Admin only */}
      {isSuperAdmin && (
        <div style={{ background:'white', borderRadius:20, border:`1px solid ${C.hairline}`, overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ShieldCheck size={20} color={C.primary}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Manajemen User</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Kelola akun dan undang user baru dengan invite key</p>
            </div>
            <button onClick={() => { setShowInviteForm(s=>!s); setInviteMsg(null) }}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:100, border:'none', background: showInviteForm ? '#F0F2F8' : C.primary, color: showInviteForm ? C.ink : 'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              <Plus size={15}/> Invite User
            </button>
          </div>

          <div style={{ padding:24, display:'flex', flexDirection:'column', gap:20 }}>

            {/* Form Generate Invite Key */}
            {showInviteForm && (
              <div style={{ background:'#F8F9FC', borderRadius:14, border:`1px solid ${C.hairline}`, padding:20 }}>
                <p style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>Generate Invite Key</p>
                <form onSubmit={handleGenerateInvite} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:7 }}>Email Tujuan</label>
                    <input type="email" value={inviteForm.email} required
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@alwildan.sch.id"
                      style={{ ...inputStyle, width:'100%', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor=C.primary}
                      onBlur={e=>e.target.style.borderColor=C.hairline}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:7 }}>Role</label>
                    <div style={{ display:'flex', gap:10 }}>
                      {['admin','pegawai'].map(r => (
                        <button key={r} type="button" onClick={() => setInviteForm(f => ({ ...f, role:r }))}
                          style={{ flex:1, padding:'10px 16px', borderRadius:10, border:`1.5px solid ${inviteForm.role===r ? C.primary : C.hairline}`, background: inviteForm.role===r ? '#EEF1FA' : 'white', cursor:'pointer' }}>
                          <p style={{ fontSize:13, fontWeight:700, color: inviteForm.role===r ? C.primary : C.ink }}>
                            {r === 'admin' ? 'Admin' : 'Pegawai'}
                          </p>
                          <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                            {r === 'admin' ? 'Lihat & ubah data' : 'Hanya data diri sendiri'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {inviteMsg?.type === 'error' && (
                    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 14px' }}>
                      <p style={{ fontSize:13, color:C.red, fontWeight:600 }}>{inviteMsg.text}</p>
                    </div>
                  )}

                  {inviteMsg?.type === 'ok' && (
                    <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'14px 16px' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:8 }}>Invite key berhasil dibuat!</p>
                      <p style={{ fontSize:11, color:'#16a34a', marginBottom:10 }}>Untuk: {inviteMsg.email} · {ROLE_LABEL[inviteMsg.role]}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:10, background:'white', borderRadius:8, border:'1px solid #BBF7D0', padding:'10px 14px' }}>
                        <code style={{ flex:1, fontSize:13, fontWeight:700, color:C.ink, fontFamily:'monospace', wordBreak:'break-all' }}>{inviteMsg.key}</code>
                        <CopyButton text={inviteMsg.key}/>
                      </div>
                      <p style={{ fontSize:11, color:'#16a34a', marginTop:8 }}>Berlaku 7 hari · Bagikan ke penerima melalui jalur yang aman</p>
                    </div>
                  )}

                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <button type="submit" disabled={inviteLoading}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:100, border:'none', background: inviteLoading ? C.muted : C.primary, color:'white', fontSize:13, fontWeight:700, cursor: inviteLoading ? 'not-allowed' : 'pointer' }}>
                      {inviteLoading
                        ? <div style={{ width:14, height:14, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                        : <><KeyRound size={14}/> Generate Key</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Daftar User */}
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Akun Terdaftar ({users.length})</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12, border:`1px solid ${C.hairline}`, background:'#F8F9FC' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background: u.role==='superadmin' ? '#FEF3C7' : '#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: u.role==='superadmin' ? '#B45309' : C.primary, flexShrink:0 }}>
                      {u.inisial || u.nama?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.nama}</p>
                      <p style={{ fontSize:11, color:C.muted, marginTop:1 }}>{u.email}</p>
                    </div>
                    <RoleBadge role={u.role}/>
                    {u.id === currentUser.id && (
                      <span style={{ fontSize:10, fontWeight:700, color:C.muted, background:'#F0F2F8', padding:'2px 8px', borderRadius:100 }}>Saya</span>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p style={{ fontSize:13, color:C.muted, textAlign:'center', padding:'20px 0' }}>Belum ada user</p>
                )}
              </div>
            </div>

            {/* Daftar Invite Key */}
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Invite Key yang Dibuat ({invites.length})</p>
              {invites.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:C.muted, fontSize:13 }}>
                  Belum ada invite key. Klik <strong>Invite User</strong> untuk membuat yang pertama.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {invites.map(inv => {
                    const used = !!inv.used_at
                    const expired = !used && inv.expired_at && new Date(inv.expired_at) < new Date()
                    const status = used ? 'Sudah dipakai' : expired ? 'Kadaluarsa' : 'Belum dipakai'
                    const statusColor = used ? C.muted : expired ? C.red : '#16a34a'
                    const statusBg = used ? '#F0F2F8' : expired ? '#FEF2F2' : '#F0FDF4'
                    return (
                      <div key={inv.id} style={{ borderRadius:12, border:`1px solid ${C.hairline}`, background:'#F8F9FC', overflow:'hidden' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
                          <KeyRound size={16} color={used||expired ? C.muted : C.primary}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <code style={{ fontSize:12, fontWeight:700, color: used||expired ? C.muted : C.ink, fontFamily:'monospace', wordBreak:'break-all' }}>{inv.key}</code>
                            <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>
                              Untuk: {inv.email} · <RoleBadge role={inv.role}/>
                            </p>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100, background:statusBg, color:statusColor }}>
                              {status}
                            </span>
                            {!used && !expired && <CopyButton text={inv.key}/>}
                          </div>
                        </div>
                        <div style={{ padding:'6px 16px 10px', display:'flex', gap:16 }}>
                          <span style={{ fontSize:11, color:C.muted }}>
                            Dibuat: {new Date(inv.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                          </span>
                          {inv.expired_at && (
                            <span style={{ fontSize:11, color: expired ? C.red : C.muted }}>
                              Exp: {new Date(inv.expired_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                            </span>
                          )}
                          {inv.used_at && (
                            <span style={{ fontSize:11, color:C.muted }}>
                              Dipakai: {new Date(inv.used_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
