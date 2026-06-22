import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Search, Users, Building2, X, ArrowRight, Loader } from 'lucide-react'
import { C, authHeaders } from '../utils/constants'

export default function SearchModal({ onClose, onNavigate }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ karyawan:[], cabang:[] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.length < 2) { setResults({ karyawan:[], cabang:[] }); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() })
        setResults(res.data.data)
      } catch { setResults({ karyawan:[], cabang:[] }) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const total = results.karyawan.length + results.cabang.length
  const hasResults = total > 0
  const searched = query.length >= 2

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'env(safe-area-inset-top, 16px)', justifyContent:'flex-start' }}
      onClick={onClose}>

      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(10,11,13,0.5)', backdropFilter:'blur(6px)' }}/>

      {/* Modal */}
      <div onClick={e=>e.stopPropagation()}
        style={{ position:'relative', width:'calc(100% - 24px)', maxWidth:560, background:'white', borderRadius:16, boxShadow:'0 24px 64px rgba(26,59,143,0.2)', overflow:'hidden', marginTop:12 }}>

        {/* Input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderBottom: searched ? `1px solid ${C.hairline}` : 'none' }}>
          <Search size={18} color={C.navy}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Cari karyawan, jabatan, atau cabang..."
            style={{ flex:1, border:'none', outline:'none', fontSize:16, color:C.ink, fontFamily:'Plus Jakarta Sans, sans-serif', background:'transparent' }}/>
          {loading
            ? <Loader size={16} color={C.muted} style={{ animation:'spin 0.8s linear infinite' }}/>
            : query && <button onClick={()=>setQuery('')} aria-label="Bersihkan pencarian" style={{ border:'none', background:'transparent', cursor:'pointer', color:C.muted, display:'flex' }}><X size={16}/></button>
          }
        </div>

        {/* Results */}
        {searched && (
          <div style={{ maxHeight:420, overflowY:'auto' }}>
            {!hasResults && !loading ? (
              <div style={{ padding:'32px 20px', textAlign:'center' }}>
                <p style={{ fontSize:14, color:C.muted }}>Tidak ada hasil untuk <strong style={{color:C.ink}}>"{query}"</strong></p>
              </div>
            ) : (<>

              {/* Karyawan */}
              {results.karyawan.length > 0 && (
                <div>
                  <div style={{ padding:'10px 20px 6px', display:'flex', alignItems:'center', gap:8 }}>
                    <Users size={12} color={C.muted}/>
                    <p style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.5px' }}>KARYAWAN</p>
                  </div>
                  {results.karyawan.map(k => (
                    <button key={k.id} onClick={()=>{ onNavigate('karyawan', k); onClose() }} className="hover-bg-blue"
                      style={{ width:'100%', padding:'12px 20px', border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', transition:'background 0.1s' }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:C.navy, flexShrink:0 }}>
                        {k.nama?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:700, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{k.nama}</p>
                        <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                          {k.jabatan} · <span style={{ color:C.navy, fontWeight:600 }}>{k.kode_cabang}</span>
                        </p>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100,
                          background: k.status==='aktif'?'#ECFDF5':'#FEF2F2',
                          color: k.status==='aktif'?'#059669':'#EF4444' }}>
                          {k.status==='aktif'?'Aktif':'Nonaktif'}
                        </span>
                        <ArrowRight size={13} color={C.muted}/>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Cabang */}
              {results.cabang.length > 0 && (
                <div style={{ borderTop: results.karyawan.length ? `1px solid ${C.hairline}` : 'none' }}>
                  <div style={{ padding:'10px 20px 6px', display:'flex', alignItems:'center', gap:8 }}>
                    <Building2 size={12} color={C.muted}/>
                    <p style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.5px' }}>CABANG</p>
                  </div>
                  {results.cabang.map(c => (
                    <button key={c.id} onClick={()=>{ onNavigate('cabang', c); onClose() }} className="hover-bg-blue"
                      style={{ width:'100%', padding:'12px 20px', border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:14, textAlign:'left', transition:'background 0.1s' }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Building2 size={18} color={C.navy}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:700, color:C.ink }}>{c.nama}</p>
                        <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>{c.kode} · {c.total_karyawan} karyawan</p>
                      </div>
                      <ArrowRight size={13} color={C.muted}/>
                    </button>
                  ))}
                </div>
              )}

            </>)}
          </div>
        )}

        {/* Empty state */}
        {!searched && (
          <div style={{ padding:'20px', display:'flex', flexWrap:'wrap', gap:8 }}>
            {['Ahmad Fauzi','Guru','AW-01','Kepala Sekolah','Mataram'].map(s => (
              <button key={s} onClick={()=>setQuery(s)}
                style={{ padding:'6px 14px', borderRadius:100, border:`1px solid ${C.hairline}`, background:'#F8F9FC', color:C.muted, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'10px 20px', borderTop:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:11, color:C.muted }}>{searched && hasResults ? `${total} hasil ditemukan` : 'Ketik minimal 2 karakter'}</p>
          <div style={{ display:'flex', gap:12 }}>
            {[['↵','Pilih'],['Esc','Tutup']].map(([k,l])=>(
              <div key={k} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <kbd style={{ padding:'2px 6px', borderRadius:4, border:`1px solid ${C.hairline}`, fontSize:10, color:C.muted, background:'#F8F9FC' }}>{k}</kbd>
                <span style={{ fontSize:11, color:C.muted }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
