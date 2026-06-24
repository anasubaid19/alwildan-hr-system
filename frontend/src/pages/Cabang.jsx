import { useEffect, useState } from 'react'
import axios from 'axios'
import { Building2, Plus, Pencil, Trash2, X, Save, Users } from 'lucide-react'
import { C, authHeaders } from '../utils/constants'

const s = { card:{ background:'#fff', border:'1px solid #dee1e6', borderRadius:16, overflow:'hidden' } }

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #eef0f3' }}>
          <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>{title}</p>
          <button onClick={onClose} aria-label="Tutup" style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:'none', background:'#eef0f3', cursor:'pointer', color:C.muted }}><X size={16}/></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.ink, marginBottom:6 }}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #dee1e6', fontSize:13, color:C.ink, background:'#fff', outline:'none' }}
        onFocus={e=>e.target.style.borderColor=C.navy}
        onBlur={e=>e.target.style.borderColor='#dee1e6'} />
      {hint && <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>{hint}</p>}
    </div>
  )
}

export default function Cabang() {
  const currentUser  = (() => { try { return JSON.parse(localStorage.getItem('aw_user') || '{}') } catch { return {} } })()
  const isSuperAdmin = currentUser.role === 'superadmin'
  const canEdit      = ['admin','superadmin'].includes(currentUser.role)

  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm]       = useState({ kode:'', nama:'' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [hapusPass, setHapusPass]     = useState('')
  const [hapusPassErr, setHapusPassErr] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/cabang', { headers: authHeaders() }),
      axios.get('/api/karyawan', { headers: authHeaders() })
    ]).then(([c, k]) => {
      const karyawanPerCabang = {}
      k.data.data.forEach(kr => {
        karyawanPerCabang[kr.cabang_id] = (karyawanPerCabang[kr.cabang_id]||0)+1
      })
      setList(c.data.data.map(cb => ({ ...cb, total_karyawan: karyawanPerCabang[cb.id]||0 })))
    }).finally(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [])

  const openTambah = () => { setForm({ kode:'', nama:'' }); setError(''); setModal('tambah') }
  const openEdit   = (c) => { setSelected(c); setForm({ kode:c.kode, nama:c.nama }); setError(''); setModal('edit') }
  const openHapus  = (c) => { setSelected(c); setHapusPass(''); setHapusPassErr(''); setModal('hapus') }
  const close      = () => { setModal(null); setSelected(null); setError(''); setHapusPass(''); setHapusPassErr('') }

  const handleSave = async () => {
    if (!form.kode.trim()||!form.nama.trim()) return setError('Kode dan nama wajib diisi')
    setSaving(true); setError('')
    try {
      if (modal==='tambah') await axios.post('/api/cabang', form, { headers: authHeaders() })
      else await axios.put(`/api/cabang/${selected.id}`, form, { headers: authHeaders() })
      load(); close()
    } catch(e) { setError(e.response?.data?.message||'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const handleHapusStep2 = async () => {
    if (!hapusPass) return setHapusPassErr('Masukkan password terlebih dahulu')
    setSaving(true); setHapusPassErr('')
    try {
      await axios.delete(`/api/cabang/${selected.id}`, {
        data: { password: hapusPass },
        headers: authHeaders()
      })
      load(); close()
    } catch(e) {
      if (e.response?.status === 401) setHapusPassErr('Password salah, coba lagi')
      else setHapusPassErr(e.response?.data?.message || 'Gagal menghapus')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth:900, display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Manajemen Cabang</h2>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{list.length} cabang terdaftar</p>
        </div>
        {canEdit && (
        <button onClick={openTambah}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:100, border:'none', background:C.navy, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Plus size={15}/> Tambah Cabang
        </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div style={{ width:28, height:28, border:`2px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : list.length===0 ? (
        <div style={{ ...s.card, padding:60, textAlign:'center' }}>
          <Building2 size={32} color={C.muted} style={{ margin:'0 auto 12px' }}/>
          <p style={{ color:C.muted, fontSize:14 }}>Belum ada cabang terdaftar</p>
          {canEdit && (
          <button onClick={openTambah} style={{ marginTop:16, padding:'9px 20px', borderRadius:100, border:'none', background:C.navy, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Tambah Cabang Pertama
          </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
          {list.map((c) => (
            <div key={c.id} style={{ background:'#fff', border:'1px solid #dee1e6', borderRadius:16, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#EEF2FB', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Building2 size={20} color={C.navy}/>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {canEdit && (
                  <button onClick={()=>openEdit(c)} aria-label="Edit cabang"
                    style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:'none', background:'#eff6ff', cursor:'pointer', color:'#2563eb' }}>
                    <Pencil size={14}/>
                  </button>
                  )}
                  {isSuperAdmin && (
                    <button onClick={()=>openHapus(c)} aria-label="Hapus cabang"
                      style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:'none', background:'#fff5f5', cursor:'pointer', color:C.red }}>
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>{c.nama}</p>
                <div style={{ display:'inline-block', marginTop:6, padding:'2px 10px', borderRadius:100, background:'#eef0f3', fontSize:11, fontWeight:600, color:C.muted, fontFamily:'monospace' }}>{c.kode}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#f7f7f7', borderRadius:10 }}>
                <Users size={14} color={C.muted}/>
                <span style={{ fontSize:12, color:C.muted }}>
                  <strong style={{ color:C.ink, fontWeight:700 }}>{c.total_karyawan}</strong> karyawan terdaftar
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      {(modal==='tambah'||modal==='edit') && (
        <Modal title={modal==='tambah'?'Tambah Cabang Baru':'Edit Cabang'} onClose={close}>
          <Field label="Kode Cabang" value={form.kode} onChange={v=>setForm(f=>({...f,kode:v}))}
            placeholder="contoh: AW-04" hint="Kode unik untuk identifikasi cabang" />
          <Field label="Nama Cabang" value={form.nama} onChange={v=>setForm(f=>({...f,nama:v}))}
            placeholder="contoh: AL-WILDAN 4 - Lombok Tengah" />
          {error && <p style={{ fontSize:12, color:C.red, marginBottom:12, padding:'8px 12px', background:'#fff5f5', borderRadius:8 }}>{error}</p>}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:8 }}>
            <button onClick={close} style={{ padding:'9px 18px', borderRadius:100, border:'1px solid #dee1e6', background:'#fff', color:C.muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:100, border:'none', background:saving?'#dee1e6':C.navy, color:'#fff', fontSize:13, fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
              <Save size={14}/>{saving?'Menyimpan...':'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Hapus — Step 1: Peringatan */}
      {modal==='hapus' && (
        <Modal title="Hapus Cabang" onClose={close}>
          <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
            <div style={{ width:64, height:64, borderRadius:20, background:'#fff5f5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Trash2 size={28} color={C.red}/>
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:C.ink }}>Hapus <span style={{color:C.red}}>{selected?.nama}</span>?</p>
          </div>
          <div style={{ background:'#fff5f5', borderRadius:12, padding:'14px 18px', margin:'12px 0 20px', display:'flex', flexDirection:'column', gap:8 }}>
            {[
              `${selected?.total_karyawan || 0} karyawan terdaftar di cabang ini akan terpengaruh`,
              'Seluruh data gaji cabang ini akan ikut terhapus',
              'Tindakan ini tidak dapat dibatalkan',
            ].map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:C.red, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  <span style={{ color:'white', fontSize:9, fontWeight:800 }}>!</span>
                </div>
                <p style={{ fontSize:12, color:'#991B1B', lineHeight:1.5 }}>{t}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={close} style={{ padding:'9px 18px', borderRadius:100, border:'1px solid #dee1e6', background:'#fff', color:C.muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>Batal</button>
            <button onClick={() => setModal('hapus2')}
              style={{ padding:'9px 24px', borderRadius:100, border:'none', background:C.red, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Lanjutkan →
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Hapus — Step 2: Konfirmasi Password */}
      {modal==='hapus2' && (
        <Modal title="Konfirmasi Penghapusan" onClose={close}>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#FFFBEB', borderRadius:12, marginBottom:16, border:'1px solid #FDE68A' }}>
              <span style={{ fontSize:18 }}>🔐</span>
              <p style={{ fontSize:12, color:'#92400E', lineHeight:1.5 }}>Masukkan password akun HR Pusat untuk mengkonfirmasi penghapusan cabang <strong>{selected?.nama}</strong>.</p>
            </div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={hapusPass}
              onChange={e=>{ setHapusPass(e.target.value); setHapusPassErr('') }}
              onKeyDown={e=>e.key==='Enter' && handleHapusStep2()}
              placeholder="Masukkan password Anda..."
              autoFocus
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${hapusPassErr?C.red:'#dee1e6'}`, fontSize:13, color:C.ink, background:'#fff', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=hapusPassErr?C.red:C.navy}
              onBlur={e=>e.target.style.borderColor=hapusPassErr?C.red:'#dee1e6'}
            />
            {hapusPassErr && (
              <p style={{ fontSize:12, color:C.red, marginTop:6, fontWeight:600 }}>⚠ {hapusPassErr}</p>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button onClick={()=>setModal('hapus')}
              style={{ padding:'9px 16px', borderRadius:100, border:'1px solid #dee1e6', background:'#fff', color:C.muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ← Kembali
            </button>
            <button onClick={handleHapusStep2} disabled={saving || !hapusPass}
              style={{ padding:'9px 24px', borderRadius:100, border:'none', background:saving||!hapusPass?'#dee1e6':C.red, color:'#fff', fontSize:13, fontWeight:700, cursor:saving||!hapusPass?'not-allowed':'pointer' }}>
              {saving ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}
