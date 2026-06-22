import { useEffect, useState } from 'react'
import axios from 'axios'
import { FileText, Download, Filter, FileSpreadsheet, File, Users } from 'lucide-react'
import { C, authHeaders } from '../utils/constants'

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const s = { card:{ background:'#fff', border:'1px solid #dee1e6', borderRadius:16, overflow:'hidden' }, head:{ padding:'16px 20px', borderBottom:'1px solid #eef0f3' } }
const fmtFull = v => 'Rp '+Number(v||0).toLocaleString('id-ID')

export default function Laporan() {
  const now = new Date()
  const [filterType, setFilterType]     = useState('bulan')
  const [filterBulan, setFilterBulan]   = useState(String(now.getMonth()+1).padStart(2,'0'))
  const [filterTahun, setFilterTahun]   = useState(String(now.getFullYear()))
  const [filterCabang, setFilterCabang] = useState('')
  const [cabangList, setCabangList]     = useState([])
  const [preview, setPreview]           = useState([])
  const [rekap, setRekap]               = useState({ data:[], cabangCols:[] })
  const [activeView, setActiveView]     = useState('detail')
  const [loading, setLoading]           = useState(false)
  const [exporting, setExporting]       = useState('')

  const tahunOptions = Array.from({length:5},(_,i)=>String(now.getFullYear()-i))

  useEffect(() => { axios.get('/api/cabang').then(r=>setCabangList(r.data.data)) }, [])

  const buildParams = () => {
    const p = new URLSearchParams()
    if (filterType==='bulan') p.set('periode',`${filterTahun}-${filterBulan}`)
    else p.set('tahun', filterTahun)
    if (filterCabang) {
      p.set('cabang_id', filterCabang)
      p.set('cabang_nama', cabangList.find(c=>c.id==filterCabang)?.nama||'')
    }
    return p
  }

  const loadData = () => {
    setLoading(true)
    const p = buildParams()
    const h = authHeaders()
    Promise.all([
      axios.get(`/api/laporan/preview?${p}`, { headers: h }),
      axios.get(`/api/laporan/rekap?${p}`, { headers: h }),
    ])
      .then(([r1, r2]) => {
        setPreview(r1.data.data)
        setRekap(r2.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [filterType, filterBulan, filterTahun, filterCabang])

  const exportFile = async (format) => {
    setExporting(format)
    try {
      const endpoint = format === 'rekap-xlsx' ? '/api/laporan/export/rekap-xlsx' : `/api/laporan/export/${format}`
      const res = await axios.get(`${endpoint}?${buildParams()}`, { responseType:'blob', headers: authHeaders() })
      const isRekap = format === 'rekap-xlsx'
      const ext  = (format==='csv') ? 'csv' : (format==='pdf') ? 'pdf' : 'xlsx'
      const mime = format==='csv'  ? 'text/csv'
                 : format==='pdf'  ? 'application/pdf'
                 : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const url  = URL.createObjectURL(new Blob([res.data], { type:mime }))
      const a    = document.createElement('a')
      const label = filterType==='bulan' ? `${filterTahun}-${filterBulan}` : filterTahun
      a.href = url; a.download = `${isRekap?'rekap-karyawan':'laporan-gaji'}-${label}.${ext}`; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert('Gagal export: '+e.message) }
    finally { setExporting('') }
  }

  const labelPeriode = filterType==='bulan'
    ? `${MONTHS[parseInt(filterBulan)-1]} ${filterTahun}`
    : `Tahun ${filterTahun}`

  const totalGaji     = preview.reduce((a,b)=>a+(b.jumlah_gaji||0),0)
  const totalDiterima = preview.reduce((a,b)=>a+(b.jml_diterima||0),0)
  const totalPotongan = preview.reduce((a,b)=>a+Math.max(0,(b.jumlah_gaji||0)-(b.jml_diterima||0)),0)

  const ExportBtn = ({ format, label, icon:Icon, bg }) => (
    <button onClick={()=>exportFile(format)} disabled={!!exporting||preview.length===0}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:100, border:'none', background:exporting===format?'#dee1e6':bg, color:'#fff', fontSize:13, fontWeight:600, cursor:exporting||preview.length===0?'not-allowed':'pointer', opacity:preview.length===0?0.5:1, transition:'all 0.15s' }}>
      {exporting===format
        ? <div style={{ width:14, height:14, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        : <Icon size={15}/>}
      {exporting===format ? 'Mengekspor...' : label}
    </button>
  )

  return (
    <div style={{ maxWidth:1200, display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@media(max-width:640px){.lap-table td,.lap-table th{padding:8px 10px!important;font-size:11px!important;}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:C.ink }}>Laporan Penggajian</h2>
          <p style={{ fontSize:12, color:C.muted, marginTop:3 }}>{labelPeriode} · {filterCabang ? cabangList.find(c=>c.id==filterCabang)?.nama : 'Semua Cabang'} · {preview.length} karyawan</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {activeView === 'rekap' ? (
            <ExportBtn format="rekap-xlsx" label="Export Rekap Excel" icon={FileSpreadsheet} bg='#059669'/>
          ) : (<>
            <ExportBtn format="xlsx" label="Export Excel" icon={FileSpreadsheet} bg='#059669'/>
            <ExportBtn format="csv"  label="Export CSV"   icon={FileText}        bg="#2563eb"/>
            <ExportBtn format="pdf"  label="Export PDF"   icon={File}            bg='#dc2626'/>
          </>)}
        </div>
      </div>

      {/* Filter */}
      <div style={{ background:'#fff', border:'1px solid #dee1e6', borderRadius:12, padding:'12px 16px' }}>
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, color:C.muted, fontSize:12 }}><Filter size={13}/> Filter Laporan</div>
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid #dee1e6' }}>
            {['bulan','tahun'].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{ padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background:filterType===t?C.navy:'#fff', color:filterType===t?'#fff':C.muted }}>
                {t==='bulan'?'Per Bulan':'Per Tahun'}
              </button>
            ))}
          </div>
          {filterType==='bulan' && (
            <select value={filterBulan} onChange={e=>setFilterBulan(e.target.value)}
              style={{ padding:'6px 10px', fontSize:12, border:'1px solid #dee1e6', borderRadius:8, background:'#fff', color:C.ink, cursor:'pointer' }}>
              {MONTHS.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </select>
          )}
          <select value={filterTahun} onChange={e=>setFilterTahun(e.target.value)}
            style={{ padding:'6px 10px', fontSize:12, border:'1px solid #dee1e6', borderRadius:8, background:'#fff', color:C.ink, cursor:'pointer' }}>
            {tahunOptions.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterCabang} onChange={e=>setFilterCabang(e.target.value)}
            style={{ padding:'6px 10px', fontSize:12, border:'1px solid #dee1e6', borderRadius:8, background:'#fff', color:C.ink, cursor:'pointer' }}>
            <option value="">Semua Cabang</option>
            {cabangList.map(c=><option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Total Penggajian', value:fmtFull(totalGaji),     color:C.navy },
          { label:'Total Potongan',   value:fmtFull(totalPotongan), color:'#dc2626'  },
          { label:'Total Diterima',   value:fmtFull(totalDiterima), color:'#059669'  },
        ].map(item=>(
          <div key={item.label} style={{ background:'#fff', border:'1px solid #dee1e6', borderRadius:14, padding:'16px 20px' }}>
            <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{item.label}</p>
            <p style={{ fontSize:18, fontWeight:700, color:item.color, marginTop:6, fontFamily:'monospace' }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div style={{ display:'flex', gap:8 }}>
        {[['detail','Detail per Karyawan',FileText],['rekap','Rekap per Karyawan',Users]].map(([v,label,Icon])=>(
          <button key={v} onClick={()=>setActiveView(v)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:100, border:`1.5px solid ${activeView===v?C.navy:C.hairline}`, background:activeView===v?C.navy:'white', color:activeView===v?'white':C.muted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div style={s.card}>
        <div style={{ ...s.head, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, color:C.ink }}>
              {activeView==='rekap' ? 'Rekap Per Karyawan' : 'Preview Laporan'}
            </p>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>
              {activeView==='rekap' ? 'Total diterima per karyawan per cabang pembayar' : 'Data akan diexport sesuai filter yang dipilih'}
            </p>
          </div>
          {(activeView==='detail'?preview:rekap.data).length>0 && (
            <span style={{ fontSize:12, fontWeight:600, color:C.navy, background:'#EEF2FB', padding:'4px 12px', borderRadius:100 }}>
              {(activeView==='detail'?preview:rekap.data).length} {activeView==='rekap'?'karyawan':'baris'}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
            <div style={{ width:28, height:28, border:`2px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : activeView === 'detail' ? (
          preview.length===0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <FileText size={32} color={C.muted} style={{ margin:'0 auto 12px' }}/>
              <p style={{ color:C.muted, fontSize:14 }}>Tidak ada data untuk periode ini</p>
              <p style={{ color:'#a8acb3', fontSize:12, marginTop:4 }}>Upload data cabang terlebih dahulu</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="lap-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f7f7f7', position:'sticky', top:0 }}>
                    {[['NO','center',32],['NU','center',45],['NAMA','left',140],['JABATAN','left',100],
                      ['CABANG','left',120],['PERIODE','center',80],['GAPOK','right',95],
                      ['TRANSPORT','right',85],['BPJS KS','right',75],['LAINS','right',65],
                      ['POT THR','right',70],['POT BPJS TK','right',80],['TOTAL GAJI','right',100],['DITERIMA','right',100]
                    ].map(([h,a,w])=>(
                      <th key={h} style={{ padding:'10px 12px', textAlign:a, fontSize:10, fontWeight:700, color:C.muted, letterSpacing:'0.5px', whiteSpace:'nowrap', minWidth:w }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r,i)=>(
                    <tr key={i} style={{ borderTop:'1px solid #eef0f3' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f7f7f7'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 12px', textAlign:'center', color:C.muted }}>{i+1}</td>
                      <td style={{ padding:'11px 12px', textAlign:'center', fontFamily:'monospace', fontSize:11, color:C.muted }}>{r.nu||'-'}</td>
                      <td style={{ padding:'11px 12px', fontWeight:600, color:C.ink, whiteSpace:'nowrap' }}>{r.nama}</td>
                      <td style={{ padding:'11px 12px', color:C.muted, whiteSpace:'nowrap' }}>{r.jabatan||'-'}</td>
                      <td style={{ padding:'11px 12px', color:C.muted, whiteSpace:'nowrap' }}>
                        <span style={{ fontSize:10, fontWeight:600, background:'#eef0f3', padding:'2px 8px', borderRadius:100 }}>{r.kode_cabang}</span>
                      </td>
                      <td style={{ padding:'11px 12px', textAlign:'center', fontFamily:'monospace', fontSize:11 }}>{r.periode}</td>
                      {[r.gapok,r.transport,r.bpjs_ks,r.lains,r.pot_thr,r.pot_bpjs_tk].map((v,j)=>(
                        <td key={j} style={{ padding:'11px 12px', textAlign:'right', fontFamily:'monospace', fontSize:11, color:C.ink }}>
                          {Number(v||0).toLocaleString('id-ID')}
                        </td>
                      ))}
                      <td style={{ padding:'11px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:600, color:C.ink }}>
                        {Number(r.jumlah_gaji||0).toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding:'11px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:C.navy }}>
                        {Number(r.jml_diterima||0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:C.navy }}>
                    <td colSpan={12} style={{ padding:'12px', fontWeight:700, color:'#fff', fontSize:12 }}>Total Keseluruhan</td>
                    <td style={{ padding:'12px', textAlign:'right', fontWeight:700, color:'#fff', fontFamily:'monospace' }}>
                      {fmtFull(totalGaji)}
                    </td>
                    <td style={{ padding:'12px', textAlign:'right', fontWeight:700, color:'#C8962E', fontFamily:'monospace' }}>
                      {fmtFull(totalDiterima)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          /* Rekap Per Karyawan */
          rekap.data.length===0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <Users size={32} color={C.muted} style={{ margin:'0 auto 12px' }}/>
              <p style={{ color:C.muted, fontSize:14 }}>Tidak ada data rekap untuk periode ini</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="lap-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f7f7f7' }}>
                    <th style={{ padding:'10px 12px', textAlign:'center', fontSize:10, fontWeight:700, color:C.muted, minWidth:36 }}>NO</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.muted, minWidth:160 }}>NAMA</th>
                    <th style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.muted, minWidth:110 }}>JABATAN</th>
                    {rekap.cabangCols.map(k=>(
                      <th key={k} style={{ padding:'10px 12px', textAlign:'right', fontSize:10, fontWeight:700, color:C.muted, minWidth:110 }}>{k}</th>
                    ))}
                    <th style={{ padding:'10px 12px', textAlign:'right', fontSize:10, fontWeight:700, color:C.navy, minWidth:120 }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {rekap.data.map((r,i)=>(
                    <tr key={i} style={{ borderTop:'1px solid #eef0f3' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#f7f7f7'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 12px', textAlign:'center', color:C.muted }}>{i+1}</td>
                      <td style={{ padding:'11px 12px', fontWeight:600, color:C.ink }}>{r.nama}</td>
                      <td style={{ padding:'11px 12px', color:C.muted }}>{r.jabatan||'-'}</td>
                      {rekap.cabangCols.map(k=>(
                        <td key={k} style={{ padding:'11px 12px', textAlign:'right', fontFamily:'monospace', fontSize:11, color:r[k]?C.ink:'#ccc' }}>
                          {r[k] ? Number(r[k]).toLocaleString('id-ID') : '-'}
                        </td>
                      ))}
                      <td style={{ padding:'11px 12px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:C.navy }}>
                        {Number(r.total||0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:C.navy }}>
                    <td colSpan={3} style={{ padding:'12px', fontWeight:700, color:'#fff', fontSize:12 }}>Total</td>
                    {rekap.cabangCols.map(k=>(
                      <td key={k} style={{ padding:'12px', textAlign:'right', fontWeight:700, color:'#fff', fontFamily:'monospace', fontSize:11 }}>
                        {Number(rekap.data.reduce((s,r)=>s+(r[k]||0),0)).toLocaleString('id-ID')}
                      </td>
                    ))}
                    <td style={{ padding:'12px', textAlign:'right', fontWeight:700, color:'#C8962E', fontFamily:'monospace' }}>
                      {Number(rekap.data.reduce((s,r)=>s+(r.total||0),0)).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
