import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, ArrowRight, RotateCcw, Save, CloudUpload, AlertTriangle, X, Sparkles, Trash2, ChevronDown, Eye, EyeOff } from 'lucide-react'

const authHeaders = () => {
  const t = localStorage.getItem('aw_token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}

const C = { primary:'#1A3B8F', gold:'#C8962E', ink:'#0a0b0d', muted:'#9BA5C0', hairline:'#E8EBF4', bg:'#F0F2F8' }
const HR_COLUMNS = ['NO','NU','NAMA','JABATAN','GENDER','GELAR','THN AKTIF','NO ACC','JUMLAH GAJI','GAPOK','PENDDK','JABATAN_TUNJ','TRANSPORT','BPJS KS','LAINS','POT THR','POT BPJS TK','Deposit ITBA','Jml Diterima','Punishment','Pinjaman','(abaikan)']
const STEPS = ['Upload File','Konfirmasi Mapping','Selesai']

export default function UploadData() {
  const [step, setStep]           = useState(0)
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [mapping, setMapping]     = useState({})
  const [cabangList, setCabangList] = useState([])
  const [cabangId, setCabangId]   = useState('')
  const [periode, setPeriode]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })
  const [saving, setSaving]         = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [diffResult, setDiffResult] = useState(null)
  const [showDiff, setShowDiff]     = useState(false)
  const [autoDetected, setAutoDetected] = useState({ periode: false, cabang: false })
  const fileRef = useRef()

  useEffect(() => {
    axios.get('/api/cabang', { headers: authHeaders() })
      .then(r => setCabangList(r.data.data))
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx','xls','csv'].includes(ext)) return alert('Format harus .xlsx, .xls, atau .csv')
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post('/api/upload/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() }
      })
      const data = res.data.data
      setResult(data)
      setMapping(data.mapping)

      // Auto-fill periode jika terdeteksi
      const detected = { periode: false, cabang: false }
      if (data.suggested_periode) {
        setPeriode(data.suggested_periode)
        detected.periode = true
      }
      // Auto-fill cabang jika terdeteksi
      if (data.suggested_cabang?.id) {
        setCabangId(String(data.suggested_cabang.id))
        detected.cabang = true
      }
      setAutoDetected(detected)
      setStep(1)
    } catch(e) { alert(e.response?.data?.message || 'Gagal menganalisis file') }
    finally { setLoading(false) }
  }

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const res = await axios.post('/api/upload/check-diff', {
        filepath: result.filepath, mapping, cabang_id: parseInt(cabangId), periode
      }, { headers: authHeaders() })
      setDiffResult(res.data)
      setShowDiff(true)
    } catch(e) { alert(e.response?.data?.message || 'Gagal memeriksa data') }
    finally { setSaving(false) }
  }

  const handleConfirmFinal = async () => {
    setSaving(true)
    try {
      const res = await axios.post('/api/upload/confirm', {
        filepath: result.filepath, mapping, cabang_id: parseInt(cabangId), periode
      }, { headers: authHeaders() })
      setSaveResult(res.data)
      setShowDiff(false)
      setStep(2)
    } catch(e) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  const reset = () => { setStep(0); setResult(null); setMapping({}); setSaveResult(null); setDiffResult(null); setShowDiff(false); setCabangId(''); setAutoDetected({ periode:false, cabang:false }) }
  const mappedCount = Object.values(mapping).filter(v => v && v !== '(abaikan)').length

  const card = { background:'white', borderRadius:16, border:`1px solid ${C.hairline}`, overflow:'hidden' }

  // Hapus data periode state
  const [showHapus, setShowHapus]         = useState(false)
  const [hapusForm, setHapusForm]         = useState({ cabang_id: '', periode: '' })
  const [hapusPreview, setHapusPreview]   = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showHapusModal, setShowHapusModal] = useState(false)
  const [hapusPassword, setHapusPassword] = useState('')
  const [showHapusPass, setShowHapusPass] = useState(false)
  const [hapusLoading, setHapusLoading]   = useState(false)
  const [hapusMsg, setHapusMsg]           = useState(null)

  const fetchPreview = async () => {
    if (!hapusForm.cabang_id || !hapusForm.periode) return
    setPreviewLoading(true)
    setHapusPreview(null)
    setHapusMsg(null)
    try {
      const res = await axios.get('/api/gaji/preview-hapus', {
        params: { cabang_id: hapusForm.cabang_id, periode: hapusForm.periode },
        headers: authHeaders()
      })
      setHapusPreview(res.data)
    } catch(e) {
      setHapusMsg({ type:'error', text: e.response?.data?.message || 'Gagal mengambil preview' })
    } finally { setPreviewLoading(false) }
  }

  const handleHapusPeriode = async () => {
    if (!hapusPassword) return
    setHapusLoading(true)
    setHapusMsg(null)
    try {
      const res = await axios.delete('/api/gaji/periode', {
        data: { cabang_id: parseInt(hapusForm.cabang_id), periode: hapusForm.periode, password: hapusPassword },
        headers: authHeaders()
      })
      setHapusMsg({ type:'ok', text: res.data.message })
      setShowHapusModal(false)
      setHapusPassword('')
      setHapusPreview(null)
      setHapusForm({ cabang_id:'', periode:'' })
    } catch(e) {
      setHapusMsg({ type:'error', text: e.response?.data?.message || 'Gagal menghapus data' })
    } finally { setHapusLoading(false) }
  }

  return (
    <div style={{ maxWidth:960, display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Upload Data Karyawan</h2>
        <p style={{ fontSize:13, color:C.muted, marginTop:3 }}>Upload file Excel dari cabang — AI akan bantu mapping kolom otomatis</p>
      </div>

      {/* Stepper */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {STEPS.map((s,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:100, fontSize:12, fontWeight:700, transition:'all 0.2s',
              background: step===i ? C.primary : step>i ? '#ECFDF5' : C.hairline,
              color: step===i ? 'white' : step>i ? '#059669' : C.muted }}>
              {step>i ? <CheckCircle size={13}/> : <span style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${step===i?'rgba(255,255,255,0.5)':C.muted}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>{i+1}</span>}
              {s}
            </div>
            {i<STEPS.length-1 && <ArrowRight size={13} color={C.muted}/>}
          </div>
        ))}
      </div>

      {/* STEP 0 */}
      {step===0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Info hint */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'#EEF1FA', borderRadius:12, border:`1px solid ${C.hairline}` }}>
            <Sparkles size={16} color={C.primary}/>
            <p style={{ fontSize:12, color:C.primary, fontWeight:600 }}>
              Cabang & periode akan <strong>terdeteksi otomatis</strong> dari nama file atau isi Excel. Anda tetap bisa mengubahnya setelah upload.
            </p>
          </div>

          {/* Dropzone */}
          <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
            onDrop={handleDrop} onClick={()=>fileRef.current?.click()}
            style={{ background:dragging?'#EEF1FA':'white', borderRadius:20, border:`2px dashed ${dragging?C.primary:C.hairline}`,
              padding:'64px 40px', textAlign:'center', cursor:'pointer', transition:'all 0.2s' }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
              onChange={e=>handleFile(e.target.files[0])}/>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:28, height:28, border:`3px solid ${C.primary}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                </div>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color:C.ink }}>AI sedang menganalisis kolom...</p>
                  <p style={{ fontSize:13, color:C.muted, marginTop:4 }}>Harap tunggu sebentar</p>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                <div style={{ width:72, height:72, borderRadius:20, background:dragging?C.primary:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                  {dragging
                    ? <CloudUpload size={36} color="white"/>
                    : <FileSpreadsheet size={36} color={C.primary}/>}
                </div>
                <div>
                  <p style={{ fontSize:18, fontWeight:700, color:C.ink }}>{dragging?'Lepaskan file di sini':'Drop file Excel di sini'}</p>
                  <p style={{ fontSize:13, color:C.muted, marginTop:6 }}>atau <span style={{ color:C.primary, fontWeight:700 }}>klik untuk pilih file</span> · .xlsx, .xls, .csv · maks 10MB</p>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  {['.xlsx','.xls','.csv'].map(ext=>(
                    <span key={ext} style={{ background:C.hairline, color:C.muted, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100 }}>{ext}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step===1 && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Panel Cabang & Periode — auto-detect */}
          <div style={{ ...card, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Sparkles size={15} color={C.primary}/>
              <p style={{ fontSize:13, fontWeight:700, color:C.ink }}>Informasi Penggajian</p>
              {(autoDetected.cabang || autoDetected.periode) && (
                <span style={{ fontSize:10, fontWeight:700, background:'#ECFDF5', color:'#059669', padding:'2px 8px', borderRadius:100, marginLeft:4 }}>
                  Terdeteksi otomatis
                </span>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                  Cabang {autoDetected.cabang && <span style={{ color:'#059669', fontSize:10 }}>✓ auto</span>}
                </label>
                <select value={cabangId} onChange={e=>{ setCabangId(e.target.value); setAutoDetected(a=>({...a,cabang:false})) }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${cabangId?C.primary:C.hairline}`, fontSize:13, color:C.ink, background:cabangId?'#F0F6FF':'white', fontFamily:'Plus Jakarta Sans, sans-serif', cursor:'pointer' }}>
                  <option value="">— Pilih Cabang —</option>
                  {cabangList.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                  Periode {autoDetected.periode && <span style={{ color:'#059669', fontSize:10 }}>✓ auto</span>}
                </label>
                <input type="month" value={periode} onChange={e=>{ setPeriode(e.target.value); setAutoDetected(a=>({...a,periode:false})) }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${periode?C.primary:C.hairline}`, fontSize:13, color:C.ink, background:periode?'#F0F6FF':'white', fontFamily:'Plus Jakarta Sans, sans-serif' }}/>
              </div>
            </div>
            {(!cabangId || !periode) && (
              <p style={{ fontSize:12, color:'#D97706', marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={13}/> {!cabangId && !periode ? 'Pilih cabang dan periode' : !cabangId ? 'Pilih cabang' : 'Pilih periode'} — tidak terdeteksi dari file
              </p>
            )}
          </div>

          {/* File info */}
          <div style={{ ...card, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <FileSpreadsheet size={24} color={C.primary}/>
                </div>
                <div>
                  <p style={{ fontWeight:700, color:C.ink, fontSize:15 }}>{result.filename}</p>
                  <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>{result.total_rows} baris · {result.headers?.length} kolom ditemukan</p>
                </div>
              </div>
              <div style={{ background:'#EEF1FA', borderRadius:14, padding:'12px 20px', textAlign:'center' }}>
                <p style={{ fontSize:22, fontWeight:800, color:C.primary }}>{mappedCount}<span style={{ fontSize:14, color:C.muted }}>/{result.headers?.length}</span></p>
                <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>kolom terpetakan</p>
              </div>
            </div>
            <div style={{ marginTop:16, height:6, background:C.hairline, borderRadius:100, overflow:'hidden' }}>
              <div style={{ width:`${result.headers?.length?(mappedCount/result.headers.length)*100:0}%`, height:'100%', background:C.primary, borderRadius:100, transition:'width 0.3s' }}/>
            </div>
          </div>

          {/* Mapping table */}
          <div style={card}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.hairline}` }}>
              <p style={{ fontSize:14, fontWeight:700, color:C.ink }}>Pemetaan Kolom</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Periksa dan koreksi mapping AI — kolom cabang → standar HR Pusat</p>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F8F9FC' }}>
                    {[['KOLOM FILE','left'],['CONTOH DATA','left'],['→ STANDAR HR','left'],['STATUS','center']].map(([h,a])=>(
                      <th key={h} style={{ padding:'10px 16px', textAlign:a, fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.headers?.map((col,i)=>{
                    const mapped = mapping[col]
                    const isOk   = mapped && mapped !== '(abaikan)'
                    return (
                      <tr key={i} style={{ borderTop:`1px solid ${C.hairline}` }}>
                        <td style={{ padding:'12px 16px', fontWeight:700, color:C.ink, fontFamily:'monospace', fontSize:12 }}>{col}</td>
                        <td style={{ padding:'12px 16px', color:C.muted, fontSize:12, maxWidth:120 }}>
                          <span style={{ background:'#F8F9FC', padding:'2px 8px', borderRadius:6, fontSize:11 }}>{String(result.sample[0]?.[col]??'-').slice(0,20)}</span>
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <select value={mapped||''} onChange={e=>setMapping(m=>({...m,[col]:e.target.value||null}))}
                            style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${isOk?'#BBDEFB':mapped==='(abaikan)'?C.hairline:'#FCD34D'}`,
                              fontSize:12, background:isOk?'#EEF1FA':mapped==='(abaikan)'?'#F8F9FC':'#FFFBEB',
                              color:isOk?C.primary:C.ink, fontFamily:'Plus Jakarta Sans, sans-serif', cursor:'pointer', minWidth:160 }}>
                            <option value="">— Tidak dipetakan —</option>
                            {HR_COLUMNS.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center' }}>
                          {isOk ? <CheckCircle size={16} color="#22C55E"/> : mapped==='(abaikan)' ? <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>SKIP</span> : <XCircle size={16} color="#F59E0B"/>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={reset} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              <RotateCcw size={15}/> Upload Ulang
            </button>
            <button onClick={handleConfirm} disabled={saving || !cabangId || !periode}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:100, border:'none', background:(saving||!cabangId||!periode)?C.muted:C.primary, color:'white', fontSize:14, fontWeight:700, cursor:(saving||!cabangId||!periode)?'not-allowed':'pointer' }}>
              {saving ? <><div style={{ width:16, height:16, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Memeriksa...</> : <><Save size={15}/> Konfirmasi & Simpan</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2 && saveResult && (
        <div style={{ ...card, padding:64, textAlign:'center' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <CheckCircle size={36} color="#22C55E"/>
          </div>
          <h3 style={{ fontSize:22, fontWeight:800, color:C.ink }}>Data Berhasil Diimport!</h3>
          <p style={{ fontSize:14, color:C.muted, marginTop:8 }}>{saveResult.message}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:28, margin:'28px 0', flexWrap:'wrap' }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:36, fontWeight:800, color:C.primary }}>{saveResult.inserted ?? 0}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Karyawan baru</p>
            </div>
            <div style={{ width:1, background:C.hairline }}/>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:36, fontWeight:800, color:C.gold }}>{saveResult.updated ?? 0}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Data diperbarui</p>
            </div>
            <div style={{ width:1, background:C.hairline }}/>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:36, fontWeight:800, color:'#9BA5C0' }}>{saveResult.skipped ?? 0}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:4 }}>Baris dilewati</p>
            </div>
          </div>
          <button onClick={reset}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:100, border:'none', background:C.primary, color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            <Upload size={16}/> Upload File Lain
          </button>
        </div>
      )}

      {/* Modal Diff Preview */}
      {showDiff && diffResult && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:640, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:`1px solid ${C.hairline}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <AlertTriangle size={18} color="#D97706"/>
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Konfirmasi Perubahan Data</p>
                  <p style={{ fontSize:11, color:C.muted, marginTop:1 }}>Periksa sebelum data diimport</p>
                </div>
              </div>
              <button onClick={()=>setShowDiff(false)} style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
                <X size={16}/>
              </button>
            </div>

            {/* Summary chips */}
            <div style={{ display:'flex', gap:10, padding:'14px 24px', borderBottom:`1px solid ${C.hairline}` }}>
              {[
                { label:'Karyawan Baru', count: diffResult.new?.length || 0, bg:'#ECFDF5', color:'#059669' },
                { label:'Data Diperbarui', count: diffResult.update?.length || 0, bg:'#FFFBEB', color:'#D97706' },
                { label:'Tidak Berubah', count: diffResult.unchanged?.length || 0, bg:'#F0F2F8', color:C.muted },
              ].map(({ label, count, bg, color }) => (
                <div key={label} style={{ background:bg, borderRadius:10, padding:'8px 14px', textAlign:'center', flex:1 }}>
                  <p style={{ fontSize:20, fontWeight:800, color }}>{count}</p>
                  <p style={{ fontSize:10, fontWeight:600, color, marginTop:2 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY:'auto', flex:1, padding:'16px 24px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Baru */}
              {diffResult.new?.length > 0 && (
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#059669', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#059669', display:'inline-block' }}/>
                    KARYAWAN BARU ({diffResult.new.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {diffResult.new.map((r,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#F0FDF4', borderRadius:8, fontSize:12 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#059669', flexShrink:0 }}>
                          {r.nama?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.nama}</p>
                          <p style={{ color:C.muted, marginTop:1 }}>{r.jabatan || '-'}</p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, background:'#DCFCE7', color:'#059669', padding:'2px 8px', borderRadius:100 }}>BARU</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diperbarui */}
              {diffResult.update?.length > 0 && (
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:'#D97706', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#D97706', display:'inline-block' }}/>
                    DATA DIPERBARUI ({diffResult.update.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {diffResult.update.map((r,i) => (
                      <div key={i} style={{ padding:'10px 12px', background:'#FFFBEB', borderRadius:8, fontSize:12 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                          <p style={{ fontWeight:700, color:C.ink }}>{r.nama}</p>
                          <span style={{ fontSize:10, fontWeight:700, background:'#FEF3C7', color:'#D97706', padding:'2px 8px', borderRadius:100 }}>UPDATE</span>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {r.changed?.map(field => (
                            <div key={field} style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <span style={{ fontSize:10, fontWeight:700, color:C.muted, width:70, flexShrink:0 }}>{field.toUpperCase()}</span>
                              <span style={{ fontSize:11, color:'#EF4444', textDecoration:'line-through', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.old?.[field] || '—'}</span>
                              <span style={{ fontSize:10, color:C.muted }}>→</span>
                              <span style={{ fontSize:11, color:'#059669', fontWeight:600, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[field] || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tidak berubah */}
              {diffResult.unchanged?.length > 0 && (
                <details style={{ cursor:'pointer' }}>
                  <summary style={{ fontSize:12, fontWeight:700, color:C.muted, padding:'6px 0', userSelect:'none' }}>
                    Tidak Berubah ({diffResult.unchanged.length} karyawan) — klik untuk lihat
                  </summary>
                  <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                    {diffResult.unchanged.map((r,i) => (
                      <div key={i} style={{ padding:'7px 12px', background:'#F8F9FC', borderRadius:7, fontSize:12, color:C.muted }}>
                        {r.nama} <span style={{ fontSize:11 }}>· {r.jabatan || '-'}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <button onClick={()=>setShowDiff(false)}
                style={{ padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Periksa Ulang
              </button>
              <button onClick={handleConfirmFinal} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 28px', borderRadius:100, border:'none', background:saving?C.muted:C.primary, color:'white', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer' }}>
                {saving ? <><div style={{ width:16, height:16, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Menyimpan...</> : <><Save size={15}/> Ya, Import Sekarang</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section: Hapus Data Periode */}
      <div style={{ background:'white', borderRadius:16, border:`1px solid #FECACA`, overflow:'hidden' }}>
        <button onClick={() => { setShowHapus(s=>!s); setHapusMsg(null) }}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Trash2 size={17} color="#EF4444"/>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'#991B1B' }}>Hapus Data Gaji Per Periode</p>
              <p style={{ fontSize:12, color:'#EF4444', marginTop:1 }}>Hapus semua record gaji cabang tertentu pada satu periode</p>
            </div>
          </div>
          <ChevronDown size={18} color="#EF4444" style={{ transform: showHapus ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}/>
        </button>

        {showHapus && (
          <div style={{ padding:'0 20px 20px', display:'flex', flexDirection:'column', gap:16, borderTop:'1px solid #FECACA' }}>

            <div style={{ paddingTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#991B1B', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>Cabang</label>
                <select value={hapusForm.cabang_id}
                  onChange={e => { setHapusForm(f=>({...f, cabang_id:e.target.value})); setHapusPreview(null); setHapusMsg(null) }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${hapusForm.cabang_id?'#EF4444':'#FECACA'}`, fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', cursor:'pointer' }}>
                  <option value="">— Pilih Cabang —</option>
                  {cabangList.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#991B1B', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>Periode (YYYY-MM)</label>
                <input type="month" value={hapusForm.periode}
                  onChange={e => { setHapusForm(f=>({...f, periode:e.target.value})); setHapusPreview(null); setHapusMsg(null) }}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${hapusForm.periode?'#EF4444':'#FECACA'}`, fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', boxSizing:'border-box' }}/>
              </div>
            </div>

            <button onClick={fetchPreview} disabled={previewLoading || !hapusForm.cabang_id || !hapusForm.periode}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:100, border:`1.5px solid #FECACA`, background:'white', color:'#991B1B', fontSize:13, fontWeight:700, cursor:(!hapusForm.cabang_id||!hapusForm.periode)?'not-allowed':'pointer', alignSelf:'flex-start', opacity:(!hapusForm.cabang_id||!hapusForm.periode)?0.5:1 }}>
              {previewLoading
                ? <div style={{ width:14, height:14, border:'2px solid #EF4444', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                : <Eye size={14}/>}
              {previewLoading ? 'Mengambil preview...' : 'Lihat Preview'}
            </button>

            {/* Preview result */}
            {hapusPreview && (
              <div style={{ borderRadius:12, border:'1.5px solid #FECACA', overflow:'hidden' }}>
                <div style={{ padding:'14px 16px', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#991B1B' }}>
                      {hapusPreview.count > 0 ? `${hapusPreview.count} record gaji akan dihapus` : 'Tidak ada data ditemukan'}
                    </p>
                    <p style={{ fontSize:12, color:'#EF4444', marginTop:2 }}>
                      {hapusPreview.cabang?.nama} · Periode {hapusForm.periode}
                    </p>
                  </div>
                  {hapusPreview.count > 0 && (
                    <div style={{ background:'#EF4444', borderRadius:100, padding:'4px 14px' }}>
                      <span style={{ fontSize:18, fontWeight:800, color:'white' }}>{hapusPreview.count}</span>
                    </div>
                  )}
                </div>
                {hapusPreview.count > 0 && (
                  <div style={{ padding:'12px 16px', background:'#FFFBEB', borderTop:'1px solid #FECACA' }}>
                    <p style={{ fontSize:12, color:'#92400E', display:'flex', alignItems:'center', gap:6 }}>
                      <AlertTriangle size={13}/> Tindakan ini tidak dapat dibatalkan. Semua data gaji untuk cabang dan periode ini akan dihapus permanen.
                    </p>
                  </div>
                )}
              </div>
            )}

            {hapusMsg && (
              <div style={{ padding:'12px 16px', borderRadius:10, background: hapusMsg.type==='ok'?'#F0FDF4':'#FEF2F2', border:`1px solid ${hapusMsg.type==='ok'?'#BBF7D0':'#FECACA'}` }}>
                <p style={{ fontSize:13, fontWeight:600, color: hapusMsg.type==='ok'?'#166534':'#DC2626' }}>{hapusMsg.text}</p>
              </div>
            )}

            {hapusPreview?.count > 0 && (
              <button onClick={() => { setShowHapusModal(true); setHapusPassword(''); setHapusMsg(null) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:100, border:'none', background:'#EF4444', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', alignSelf:'flex-start' }}>
                <Trash2 size={15}/> Hapus {hapusPreview.count} Record
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      {showHapusModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:420, boxShadow:'0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #FECACA' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Trash2 size={18} color="#EF4444"/>
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:'#991B1B' }}>Konfirmasi Hapus</p>
                  <p style={{ fontSize:11, color:'#EF4444', marginTop:1 }}>Masukkan password untuk melanjutkan</p>
                </div>
              </div>
              <button onClick={() => setShowHapusModal(false)}
                style={{ width:32, height:32, borderRadius:8, border:'none', background:'#F0F2F8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ padding:'12px 16px', background:'#FEF2F2', borderRadius:10, border:'1px solid #FECACA' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#991B1B', marginBottom:4 }}>
                  {hapusPreview?.count} record gaji akan dihapus
                </p>
                <p style={{ fontSize:12, color:'#EF4444' }}>
                  {hapusPreview?.cabang?.nama} · Periode {hapusForm.periode}
                </p>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>Password Anda</label>
                <div style={{ position:'relative' }}>
                  <input type={showHapusPass?'text':'password'} value={hapusPassword}
                    onChange={e => setHapusPassword(e.target.value)}
                    placeholder="Masukkan password untuk konfirmasi"
                    onKeyDown={e => e.key==='Enter' && hapusPassword && handleHapusPeriode()}
                    style={{ width:'100%', padding:'11px 44px 11px 14px', borderRadius:10, border:'1.5px solid #FECACA', fontSize:13, color:C.ink, background:'white', fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor='#EF4444'}
                    onBlur={e=>e.target.style.borderColor='#FECACA'}
                    autoFocus/>
                  <button type="button" onClick={() => setShowHapusPass(s=>!s)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:C.muted, display:'flex', alignItems:'center' }}>
                    {showHapusPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {hapusMsg?.type === 'error' && (
                <div style={{ padding:'10px 14px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA' }}>
                  <p style={{ fontSize:13, color:'#DC2626', fontWeight:600 }}>{hapusMsg.text}</p>
                </div>
              )}

              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => setShowHapusModal(false)}
                  style={{ padding:'10px 20px', borderRadius:100, border:`1.5px solid ${C.hairline}`, background:'white', color:C.ink, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Batal
                </button>
                <button onClick={handleHapusPeriode} disabled={hapusLoading || !hapusPassword}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:100, border:'none', background:(hapusLoading||!hapusPassword)?C.muted:'#EF4444', color:'white', fontSize:13, fontWeight:700, cursor:(hapusLoading||!hapusPassword)?'not-allowed':'pointer' }}>
                  {hapusLoading
                    ? <div style={{ width:14, height:14, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                    : <Trash2 size={14}/>}
                  {hapusLoading ? 'Menghapus...' : 'Ya, Hapus Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
