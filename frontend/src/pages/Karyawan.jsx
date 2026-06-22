import { useEffect, useState } from 'react'
import axios from 'axios'
import { Search, Plus, Pencil, Trash2, X, Save, Users, Filter, Eye, Wallet } from 'lucide-react'
import { C, authHeaders } from '../utils/constants'

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:`1px solid ${C.hairline}` }}>
          <p style={{ fontSize:16, fontWeight:700, color:C.ink }}>{title}</p>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
            <X size={16}/>
          </button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

const emptyForm = { no:'', nu:'', nama:'', jabatan:'', gender:'L', gelar:'', thn_aktif:'', no_acc:'', cabang_id:'', status:'aktif' }

const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.hairline}`, fontSize:13, color:'#0a0b0d', background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }

export default function Karyawan() {
  const [karyawan, setKaryawan]   = useState([])
  const [cabang, setCabang]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterCabang, setFilterCabang] = useState('')
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [gajiDetail, setGajiDetail] = useState(null)
  const [loadingGaji, setLoadingGaji] = useState(false)
  const [hapusPass, setHapusPass]   = useState('')
  const [hapusPassErr, setHapusPassErr] = useState('')

  const fetchAll = (cabang_id = filterCabang) => {
    setLoading(true)
    const h = authHeaders()
    Promise.all([
      axios.get('/api/karyawan' + (cabang_id ? `?cabang_id=${cabang_id}` : ''), { headers: h }),
      axios.get('/api/cabang', { headers: h })
    ]).then(([k, c]) => {
      setKaryawan(k.data.data)
      setCabang(c.data.data)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [filterCabang])

  const filtered = karyawan.filter(k =>
    k.nama?.toLowerCase().includes(search.toLowerCase()) ||
    k.jabatan?.toLowerCase().includes(search.toLowerCase()) ||
    k.nu?.includes(search)
  )

  const openTambah = () => { setForm(emptyForm); setModal('tambah') }
  const openEdit   = (k) => { setSelected(k); setForm({ no:k.no||'', nu:k.nu||'', nama:k.nama||'', jabatan:k.jabatan||'', gender:k.gender||'L', gelar:k.gelar||'', thn_aktif:k.thn_aktif||'', no_acc:k.no_acc||'', cabang_id:k.cabang_id||'', status:k.status||'aktif' }); setModal('edit') }
  const openHapus  = (k) => { setSelected(k); setHapusPass(''); setHapusPassErr(''); setModal('hapus') }
  const closeModal = () => { setModal(null); setSelected(null); setGajiDetail(null); setHapusPass(''); setHapusPassErr('') }

  const openDetail = (k) => {
    setSelected(k)
    setModal('detail')
    setLoadingGaji(true)
    axios.get(`/api/gaji/karyawan/${k.id}`, { headers: authHeaders() })
      .then(r => setGajiDetail(r.data))
      .catch(() => setGajiDetail(null))
      .finally(() => setLoadingGaji(false))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal === 'tambah') await axios.post('/api/karyawan', form, { headers: authHeaders() })
      else await axios.put(`/api/karyawan/${selected.id}`, form, { headers: authHeaders() })
      fetchAll(); closeModal()
    } catch(e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const handleHapusStep2 = async () => {
    if (!hapusPass) return setHapusPassErr('Masukkan password terlebih dahulu')
    setSaving(true); setHapusPassErr('')
    try {
      await axios.post('/api/auth/verify-password', { password: hapusPass }, { headers: authHeaders() })
      await axios.delete(`/api/karyawan/${selected.id}`, { headers: authHeaders() })
      fetchAll(); closeModal()
    } catch(e) {
      const msg = e.response?.data?.message || ''
      if (e.response?.status === 401) setHapusPassErr('Password salah, coba lagi')
      else setHapusPassErr(msg || 'Gagal menghapus')
    } finally { setSaving(false) }
  }

  const F = ({ label, name, type='text', options, half }) => (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:6 }}>{label}</label>
      {options ? (
        <select value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} style={{ ...inputStyle, cursor:'pointer' }}>
          <option value="">— Pilih —</option>
          {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={form[name]} onChange={e=>setForm(f=>({...f,[name]:e.target.value}))} style={inputStyle}
          onFocus={e=>e.target.style.borderColor=C.navy} onBlur={e=>e.target.style.borderColor=C.hairline}/>
      )}
    </div>
  )

  const genderBadge = (g) => ({
    background: g==='P' ? '#FDF4FF' : '#EFF6FF',
    color: g==='P' ? '#A855F7' : '#3B82F6',
    padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700
  })

  const jabatanBadge = { background:'#EEF1FA', color:C.navy, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700 }

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Data Karyawan</h2>
          <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>{filtered.length} karyawan ditemukan</p>
        </div>
        <button onClick={openTambah}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:100, border:'none', background:C.navy, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={16}/> Tambah Karyawan
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ background:'white', borderRadius:14, border:`1px solid ${C.hairline}`, padding:'14px 16px', display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:220 }}>
          <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, jabatan, atau NU..."
            style={{ ...inputStyle, paddingLeft:38 }}
            onFocus={e=>e.target.style.borderColor=C.navy} onBlur={e=>e.target.style.borderColor=C.hairline}/>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Filter size={14} color={C.muted}/>
          <select value={filterCabang} onChange={e=>setFilterCabang(e.target.value)}
            style={{ ...inputStyle, width:'auto', cursor:'pointer', paddingRight:32 }}>
            <option value="">Semua Cabang</option>
            {cabang.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'white', borderRadius:20, border:`1px solid ${C.hairline}`, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:200 }}>
            <div style={{ width:28, height:28, border:`2.5px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'#F0F2F8', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={24} color={C.muted}/>
            </div>
            <p style={{ color:C.muted, fontSize:14 }}>Tidak ada data karyawan</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F8F9FC' }}>
                  {[['NO URUT','center',70],['NAMA','left',180],['JABATAN','left',140],['CABANG','left',160],['GENDER','center',100],['NO. REKENING','left',130],['AKSI','center',80]].map(([h,a,w])=>(
                    <th key={h} style={{ padding:'12px 16px', textAlign:a, fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.5px', minWidth:w }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((k,i) => (
                  <tr key={k.id} style={{ borderTop:`1px solid ${C.hairline}` }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F8F9FC'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'14px 16px', textAlign:'center', fontFamily:'monospace', fontSize:12, color:C.muted, fontWeight:600 }}>{k.nu||'-'}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <p style={{ fontWeight:700, color:C.ink }}>{k.nama}</p>
                      {k.gelar && <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{k.gelar}</p>}
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <span style={jabatanBadge}>{k.jabatan||'-'}</span>
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:C.ink }}>{k.kode_cabang}</p>
                      <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{k.nama_cabang}</p>
                    </td>
                    <td style={{ padding:'14px 16px', textAlign:'center' }}>
                      <span style={genderBadge(k.gender)}>{k.gender==='P'?'Perempuan':'Laki-laki'}</span>
                    </td>
                    <td style={{ padding:'14px 16px', fontFamily:'monospace', fontSize:12, color:C.muted }}>{k.no_acc||'-'}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <button onClick={()=>openDetail(k)} title="Riwayat Gaji"
                          style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0FDF4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#16a34a' }}>
                          <Eye size={14}/>
                        </button>
                        <button onClick={()=>openEdit(k)}
                          style={{ width:32, height:32, borderRadius:8, border:'none', background:'#EEF1FA', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.navy }}>
                          <Pencil size={14}/>
                        </button>
                        <button onClick={()=>openHapus(k)}
                          style={{ width:32, height:32, borderRadius:8, border:'none', background:'#FEF2F2', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.red }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {(modal==='tambah'||modal==='edit') && (
        <Modal title={modal==='tambah'?'Tambah Karyawan Baru':'Edit Data Karyawan'} onClose={closeModal}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <F label="No" name="no" half/>
            <F label="NU" name="nu" half/>
            <div style={{ gridColumn:'span 2' }}>
              <F label="Nama Lengkap" name="nama"/>
            </div>
            <F label="Gelar" name="gelar" half/>
            <F label="Tahun Aktif" name="thn_aktif" half/>
            <F label="Jabatan" name="jabatan" half/>
            <F label="Gender" name="gender" half options={[{value:'L',label:'Laki-laki'},{value:'P',label:'Perempuan'}]}/>
            <div style={{ gridColumn:'span 2' }}>
              <F label="Cabang" name="cabang_id" options={cabang.map(c=>({value:c.id,label:c.nama}))}/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <F label="No. Rekening" name="no_acc"/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <F label="Status" name="status" options={[{value:'aktif',label:'Aktif'},{value:'nonaktif',label:'Tidak Aktif'}]}/>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
            <button onClick={closeModal}
              style={{ padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:100, border:'none', background:saving?C.muted:C.navy, color:'white', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
              <Save size={14}/>{saving?'Menyimpan...':'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Hapus — Step 1: Peringatan */}
      {modal==='hapus' && (
        <Modal title="Hapus Data Karyawan" onClose={closeModal}>
          <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
            <div style={{ width:64, height:64, borderRadius:20, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <Trash2 size={28} color={C.red}/>
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:C.ink }}>Hapus <span style={{color:C.red}}>{selected?.nama}</span>?</p>
            <p style={{ fontSize:13, color:C.muted, marginTop:8, lineHeight:1.7 }}>Tindakan ini akan menghapus permanen:</p>
          </div>
          <div style={{ background:'#FEF2F2', borderRadius:12, padding:'14px 18px', margin:'12px 0 20px', display:'flex', flexDirection:'column', gap:8 }}>
            {[
              'Data profil karyawan (nama, jabatan, dll)',
              'Seluruh riwayat data gaji karyawan ini',
              'Tidak dapat dibatalkan setelah dikonfirmasi',
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
            <button onClick={closeModal}
              style={{ padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Batal
            </button>
            <button onClick={() => setModal('hapus2')}
              style={{ padding:'10px 24px', borderRadius:100, border:'none', background:C.red, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Lanjutkan →
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Hapus — Step 2: Konfirmasi Password */}
      {modal==='hapus2' && (
        <Modal title="Konfirmasi Penghapusan" onClose={closeModal}>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#FFFBEB', borderRadius:12, marginBottom:16, border:'1px solid #FDE68A' }}>
              <span style={{ fontSize:18 }}>🔐</span>
              <p style={{ fontSize:12, color:'#92400E', lineHeight:1.5 }}>Masukkan password akun HR Pusat Anda untuk mengkonfirmasi penghapusan <strong>{selected?.nama}</strong>.</p>
            </div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={hapusPass}
              onChange={e => { setHapusPass(e.target.value); setHapusPassErr('') }}
              onKeyDown={e => e.key==='Enter' && handleHapusStep2()}
              placeholder="Masukkan password Anda..."
              autoFocus
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${hapusPassErr?C.red:C.hairline}`, fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=hapusPassErr?C.red:C.navy}
              onBlur={e=>e.target.style.borderColor=hapusPassErr?C.red:C.hairline}
            />
            {hapusPassErr && (
              <p style={{ fontSize:12, color:C.red, marginTop:6, fontWeight:600 }}>⚠ {hapusPassErr}</p>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button onClick={() => setModal('hapus')}
              style={{ padding:'10px 16px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.muted, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              ← Kembali
            </button>
            <button onClick={handleHapusStep2} disabled={saving || !hapusPass}
              style={{ padding:'10px 24px', borderRadius:100, border:'none', background:saving||!hapusPass?C.muted:C.red, color:'white', fontSize:13, fontWeight:700, cursor:saving||!hapusPass?'not-allowed':'pointer' }}>
              {saving ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Detail Gaji Lintas Cabang */}
      {modal==='detail' && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:`1px solid ${C.hairline}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Wallet size={18} color="#16a34a"/>
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>{selected.nama}</p>
                  <p style={{ fontSize:11, color:C.muted, marginTop:1 }}>{selected.jabatan||''} · {selected.kode_cabang||''}</p>
                </div>
              </div>
              <button onClick={closeModal} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
                <X size={16}/>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding:24, overflowY:'auto', flex:1 }}>
              {loadingGaji ? (
                <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
                  <div style={{ width:28, height:28, border:`2.5px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                </div>
              ) : !gajiDetail ? (
                <p style={{ textAlign:'center', color:C.muted, padding:40 }}>Gagal memuat data gaji</p>
              ) : gajiDetail.pembayaran.length === 0 ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <Wallet size={32} color={C.muted} style={{ margin:'0 auto 12px' }}/>
                  <p style={{ color:C.muted }}>Belum ada data pembayaran</p>
                </div>
              ) : (
                <>
                  {/* Total */}
                  <div style={{ background:'#EEF1FA', borderRadius:14, padding:'14px 18px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Total Diterima (semua cabang)</p>
                      <p style={{ fontSize:22, fontWeight:800, color:C.navy, fontFamily:'monospace', marginTop:4 }}>
                        Rp {Number(gajiDetail.total||0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:C.navy, background:'white', padding:'5px 14px', borderRadius:100 }}>
                      {gajiDetail.pembayaran.length} transaksi
                    </span>
                  </div>

                  {/* Tabel pembayaran */}
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'#F8F9FC' }}>
                        {[['PERIODE','center'],['CABANG PEMBAYAR','left'],['JUMLAH GAJI','right'],['DITERIMA','right']].map(([h,a])=>(
                          <th key={h} style={{ padding:'9px 12px', textAlign:a, fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gajiDetail.pembayaran.map((p,i)=>(
                        <tr key={i} style={{ borderTop:`1px solid ${C.hairline}` }}>
                          <td style={{ padding:'10px 12px', textAlign:'center', fontFamily:'monospace', fontSize:11, color:C.muted }}>{p.periode}</td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ fontSize:11, fontWeight:700, background:'#EEF1FA', color:C.navy, padding:'3px 10px', borderRadius:100 }}>
                              {p.kode_cabang||'-'}
                            </span>
                            {p.nama_cabang && <span style={{ fontSize:11, color:C.muted, marginLeft:6 }}>{p.nama_cabang}</span>}
                          </td>
                          <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace', fontSize:11, color:C.ink }}>
                            {Number(p.jumlah_gaji||0).toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding:'10px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:C.navy }}>
                            {Number(p.jml_diterima||0).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:C.navy }}>
                        <td colSpan={2} style={{ padding:'10px 12px', fontWeight:700, color:'white', fontSize:12 }}>Total</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'white', fontFamily:'monospace', fontSize:11 }}>
                          {Number(gajiDetail.pembayaran.reduce((s,p)=>s+(p.jumlah_gaji||0),0)).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, color:'#C8962E', fontFamily:'monospace' }}>
                          {Number(gajiDetail.total||0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
