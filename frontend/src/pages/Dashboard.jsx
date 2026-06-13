import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Users, Wallet, TrendingUp, Building2, UserPlus, UserMinus, ArrowUpRight, ArrowDownRight, Calendar, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
const FULL_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const C = {
  navy:   '#1A3B8F',
  gold:   '#C8962E',
  ink:    '#0a0b0d',
  muted:  '#9BA5C0',
  hairline:'#E8EBF4',
  bg:     '#F0F2F8',
  white:  '#ffffff',
  green:  '#22C55E',
  red:    '#EF4444',
}

const fmt    = v => { const n=Number(v||0); return Math.abs(n)>=1000000?'Rp '+(n/1000000).toFixed(1)+'jt':'Rp '+n.toLocaleString('id-ID') }
const fmtFull= v => 'Rp '+Number(v||0).toLocaleString('id-ID')

// Custom rounded bar shape
const RoundedBar = (props) => {
  const { x, y, width, height, fill } = props
  const r = Math.min(8, width/2)
  if (!height || height <= 0) return null
  return <path d={`M${x+r},${y} h${width-2*r} a${r},${r} 0 0 1 ${r},${r} v${height-r} h-${width} v-${height-r} a${r},${r} 0 0 1 ${r},-${r}z`} fill={fill}/>
}

const TTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:'white', border:'1px solid #E8EBF4', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 24px rgba(26,59,143,0.12)', minWidth:150 }}>
      <p style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</p>
      {payload.map((p,i)=>(
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:i<payload.length-1?4:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:p.fill||p.stroke }}/>
            <span style={{ fontSize:12, color:C.muted }}>{p.name}</span>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:C.ink, fontFamily:'monospace' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function KPICard({ title, value, sub, icon:Icon, trend, trendVal, bgColor, iconBg }) {
  const isUp = trend === 'up'
  return (
    <div style={{ background:'white', borderRadius:20, padding:'22px 24px', border:'1px solid #E8EBF4', display:'flex', flexDirection:'column', gap:16, transition:'box-shadow 0.2s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 8px 32px rgba(26,59,143,0.1)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ width:44, height:44, borderRadius:14, background:iconBg||'#EEF1FA', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} color={bgColor||C.navy}/>
        </div>
        {trendVal !== undefined && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:isUp?C.green:C.red, background:isUp?'#F0FDF4':'#FEF2F2', padding:'4px 10px', borderRadius:100 }}>
            {isUp ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
            {trendVal}
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize:26, fontWeight:800, color:C.ink, letterSpacing:'-0.5px', fontFamily:'JetBrains Mono, monospace', lineHeight:1.1 }}>{value}</p>
        <p style={{ fontSize:13, color:C.muted, marginTop:4, fontWeight:500 }}>{title}</p>
        {sub && <p style={{ fontSize:11, color:C.muted, marginTop:2, opacity:0.7 }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const now = new Date()
  const [filterType,   setFilterType]   = useState('tahun')
  const [filterBulan,  setFilterBulan]  = useState(String(now.getMonth()+1).padStart(2,'0'))
  const [filterTahun,  setFilterTahun]  = useState(String(now.getFullYear()))
  const [filterCabang, setFilterCabang] = useState('')
  const [cabangList,   setCabangList]   = useState([])
  const [summary,      setSummary]      = useState([])
  const [stats,        setStats]        = useState({ masuk:0, keluar:0, aktif:0 })
  const [loading,      setLoading]      = useState(true)
  const [trendData,    setTrendData]    = useState([])

  // Fetch real trend data
  useEffect(() => {
    const token = localStorage.getItem('aw_token')
    const h = token ? { Authorization: 'Bearer ' + token } : {}
    const p = new URLSearchParams()
    p.set('tahun', filterTahun)
    if (filterCabang) p.set('cabang_id', filterCabang)
    axios.get('/api/gaji/trend?' + p, { headers: h })
      .then(r => {
        const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
        // Aggregate by periode (multiple paying_cabang rows per bulan)
        const byPeriode = {}
        r.data.data.forEach(d => {
          const m = d.periode
          if (!byPeriode[m]) byPeriode[m] = { month: BULAN[parseInt(m.split('-')[1]) - 1], total: 0, gaji: 0 }
          byPeriode[m].total += d.total_diterima || 0
          byPeriode[m].gaji  += d.total_gaji || 0
        })
        setTrendData(Object.values(byPeriode))
      }).catch(() => setTrendData([]))
  }, [filterTahun, filterCabang])

  const user = JSON.parse(localStorage.getItem('aw_user')||'{}')
  const nameParts = user.nama?.split(' ') || []
  const firstName = nameParts.length > 1 && nameParts[0].toLowerCase() === 'pak' ? nameParts.slice(0,2).join(' ') : nameParts[0] || 'HR'
  const tahunOptions = Array.from({length:5},(_,i)=>String(now.getFullYear()-i))

  const authHeaders = () => {
    const t = localStorage.getItem('aw_token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  useEffect(()=>{
    axios.get('/api/cabang', { headers: authHeaders() })
      .then(r=>setCabangList(r.data.data))
      .catch(()=>{})
  },[])

  useEffect(()=>{
    setLoading(true)
    const p = new URLSearchParams()
    if(filterType==='bulan') p.set('periode',`${filterTahun}-${filterBulan}`)
    else p.set('tahun', filterTahun)
    if(filterCabang) p.set('cabang_id', filterCabang)
    const h = authHeaders()
    Promise.all([
      axios.get(`/api/gaji/summary?${p}`, { headers: h }),
      axios.get(`/api/karyawan/stats?tahun=${filterTahun}`, { headers: h })
    ]).then(([g,k])=>{ setSummary(g.data.data); setStats(k.data.data) })
    .catch(err=>console.error('Dashboard fetch error:', err))
    .finally(()=>setLoading(false))
  },[filterType,filterBulan,filterTahun,filterCabang])

  const totalKaryawan = summary.reduce((a,b)=>a+b.total_karyawan,0)
  const totalGaji     = summary.reduce((a,b)=>a+(b.total_gaji||0),0)
  const totalDiterima = summary.reduce((a,b)=>a+(b.total_diterima||0),0)
  const totalPotongan = summary.reduce((a,b)=>a+Math.max(0,(b.total_gaji||0)-(b.total_diterima||0)),0)

  const labelPeriode = filterType==='bulan'
    ? `${FULL_MONTHS[parseInt(filterBulan)-1]} ${filterTahun}`
    : `Tahun ${filterTahun}`

  const barData = summary.map(c=>({ name:c.kode?.replace('AL-WILDAN ','AW '), gaji:c.total_gaji||0, diterima:c.total_diterima||0 }))

  // trendData sekarang dari state (data real)

  if(loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:28, height:28, border:`2.5px solid ${C.navy}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ maxWidth:1300, display:'flex', flexDirection:'column', gap:20 }}>
      <style>{`
        .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .kpi-sub  { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .chart-grid { display:grid; grid-template-columns:3fr 2fr; gap:16px; }
        @media(max-width:1100px){ .chart-grid{grid-template-columns:1fr;} }
        @media(max-width:768px){ .kpi-grid,.kpi-sub{grid-template-columns:repeat(2,1fr);gap:12px;} .chart-grid{grid-template-columns:1fr;} }
      `}</style>

      {/* Welcome Header */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:4 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:C.ink, letterSpacing:'-0.5px' }}>
            Selamat Datang, <span style={{ color:C.navy }}>{firstName}</span>
          </h1>
          <p style={{ fontSize:14, color:C.muted, marginTop:4 }}>{labelPeriode} · {filterCabang ? cabangList.find(c=>c.id==filterCabang)?.nama : 'Semua Cabang'}</p>
        </div>

        {/* Filter pill */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:'1px solid #E8EBF4', borderRadius:14, padding:'10px 16px' }}>
          <Calendar size={15} color={C.navy}/>
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid #E8EBF4' }}>
            {['bulan','tahun'].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{ padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
                background:filterType===t?C.navy:'transparent', color:filterType===t?'white':C.muted }}>
                {t==='bulan'?'Bulan':'Tahun'}
              </button>
            ))}
          </div>
          {filterType==='bulan' && (
            <select value={filterBulan} onChange={e=>setFilterBulan(e.target.value)}
              style={{ padding:'5px 8px', fontSize:12, border:'1px solid #E8EBF4', borderRadius:8, background:'white', color:C.ink, cursor:'pointer', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
              {FULL_MONTHS.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
            </select>
          )}
          <select value={filterTahun} onChange={e=>setFilterTahun(e.target.value)}
            style={{ padding:'5px 8px', fontSize:12, border:'1px solid #E8EBF4', borderRadius:8, background:'white', color:C.ink, cursor:'pointer', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
            {tahunOptions.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterCabang} onChange={e=>setFilterCabang(e.target.value)}
            style={{ padding:'5px 8px', fontSize:12, border:'1px solid #E8EBF4', borderRadius:8, background:'white', color:C.ink, cursor:'pointer', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
            <option value="">Semua Cabang</option>
            {cabangList.map(c=><option key={c.id} value={c.id}>{c.kode}</option>)}
          </select>
        </div>
      </div>

      {summary.length===0 ? (
        <div style={{ background:'white', borderRadius:20, padding:64, textAlign:'center', border:'1px solid #E8EBF4' }}>
          <p style={{ color:C.muted, fontSize:14 }}>Tidak ada data untuk <strong style={{color:C.ink}}>{labelPeriode}</strong></p>
          <p style={{ color:C.muted, fontSize:12, marginTop:4, opacity:0.7 }}>Upload data cabang terlebih dahulu</p>
        </div>
      ) : (<>

        {/* KPI Row 1 */}
        <div className="kpi-grid">
          <KPICard title="Total Cabang"     value={cabangList.length}      sub={`${totalKaryawan} karyawan aktif`}    icon={Building2}  iconBg="#EEF1FA" bgColor={C.navy}  trendVal={`${cabangList.length} cabang`} trend="up"/>
          <KPICard title="Total Penggajian" value={fmt(totalGaji)}         sub="Sebelum potongan"                     icon={TrendingUp} iconBg="#FDF6E8" bgColor={C.gold}  trendVal={labelPeriode} trend="up"/>
          <KPICard title="Total Diterima"   value={fmt(totalDiterima)}     sub={`Potongan ${fmt(totalPotongan)}`}     icon={Wallet}     iconBg="#ECFDF5" bgColor="#22C55E" trendVal={`${totalKaryawan} org`} trend="up"/>
        </div>

        {/* KPI Row 2 */}
        <div className="kpi-sub">
          <KPICard title="Karyawan Aktif"  value={stats.aktif}  sub="Seluruh cabang"             icon={Users}     iconBg="#EEF1FA" bgColor={C.navy}  trendVal={`${stats.aktif} aktif`} trend="up"/>
          <KPICard title="Karyawan Masuk"  value={stats.masuk}  sub={`Bergabung ${filterTahun}`} icon={UserPlus}  iconBg="#ECFDF5" bgColor="#22C55E" trendVal={`+${stats.masuk}`} trend="up"/>
          <KPICard title="Karyawan Keluar" value={stats.keluar} sub={`Keluar ${filterTahun}`}    icon={UserMinus} iconBg={stats.keluar>0?"#FEF2F2":"#ECFDF5"} bgColor={stats.keluar>0?C.red:"#22C55E"} trendVal={stats.keluar>0?`-${stats.keluar}`:'Nihil'} trend={stats.keluar>0?'down':'up'}/>
        </div>

        {/* Charts */}
        <div className="chart-grid">

          {/* Bar Chart */}
          <div style={{ background:'white', borderRadius:20, padding:'24px', border:'1px solid #E8EBF4' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <p style={{ fontSize:16, fontWeight:800, color:C.ink }}>Gaji per Cabang</p>
                <p style={{ fontSize:13, color:C.muted, marginTop:2 }}>Total gaji vs jumlah diterima</p>
              </div>
              <div style={{ display:'flex', gap:12 }}>
                {[['Gaji',C.navy],['Diterima',C.gold]].map(([l,c])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.muted }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:c }}/>{l}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F8"/>
                <XAxis dataKey="name" tick={{ fontSize:12, fill:C.muted, fontFamily:'Plus Jakarta Sans' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>(v/1000000).toFixed(0)+'jt'} tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} width={38}/>
                <Tooltip content={<TTip/>} cursor={{ fill:'#F0F2F8', radius:8 }}/>
                <Bar dataKey="gaji"     name="Total Gaji" fill={C.navy} shape={<RoundedBar/>} />
                <Bar dataKey="diterima" name="Diterima"   fill={C.gold} shape={<RoundedBar/>} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div style={{ background:C.navy, borderRadius:20, padding:'24px', border:'1px solid #E8EBF4' }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <p style={{ fontSize:16, fontWeight:800, color:'white' }}>Total Diterima</p>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>
                  {filterCabang ? cabangList.find(c=>c.id==filterCabang)?.kode : 'Semua Cabang'}
                </span>
              </div>
              <p style={{ fontSize:28, fontWeight:800, color:'white', marginTop:8, fontFamily:'JetBrains Mono, monospace', letterSpacing:'-0.5px' }}>{fmt(totalDiterima)}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:C.gold, background:'rgba(200,150,46,0.2)', padding:'3px 10px', borderRadius:100 }}>
                  <ArrowUpRight size={13}/> {labelPeriode}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={trendData} margin={{top:5,right:5,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.gold} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={C.gold} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false}/>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, padding:'8px 12px' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'white', fontFamily:'monospace' }}>{fmt(payload[0]?.value)}</p>
                  </div>
                ) : null} cursor={false}/>
                <Area type="monotone" dataKey="total" stroke={C.gold} strokeWidth={2.5} fill="url(#areaGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <div style={{ flex:1, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'12px 16px' }}>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>Total Cabang</p>
                <p style={{ fontSize:18, fontWeight:800, color:'white', marginTop:4 }}>{cabangList.length}</p>
              </div>
              <div style={{ flex:1, background:'rgba(200,150,46,0.25)', borderRadius:10, padding:'12px 16px' }}>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>Karyawan</p>
                <p style={{ fontSize:18, fontWeight:800, color:'white', marginTop:4 }}>{stats.aktif}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background:'white', borderRadius:20, border:'1px solid #E8EBF4', overflow:'hidden' }}>
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #F0F2F8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:16, fontWeight:800, color:C.ink }}>Rekap per Cabang</p>
              <p style={{ fontSize:13, color:C.muted, marginTop:2 }}>Detail penggajian {labelPeriode}</p>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:C.navy, background:'#EEF1FA', padding:'5px 14px', borderRadius:100 }}>{summary.length} Cabang</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F8F9FC' }}>
                  {[['CABANG','left'],['KARYAWAN','center'],['TOTAL GAJI','right'],['POTONGAN','right'],['DITERIMA','right'],['REALISASI','center']].map(([h,a])=>(
                    <th key={h} style={{ padding:'12px 20px', textAlign:a, fontSize:11, fontWeight:700, color:C.muted, letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((c,i)=>{
                  const pot = Math.max(0,(c.total_gaji||0)-(c.total_diterima||0))
                  const pct = c.total_gaji>0?Math.min(100,Math.round((c.total_diterima/c.total_gaji)*100)):0
                  return (
                    <tr key={i} style={{ borderTop:'1px solid #F0F2F8', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F8F9FC'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'16px 20px' }}>
                        <p style={{ fontWeight:700, color:C.ink }}>{c.nama}</p>
                        <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>{c.kode}</p>
                      </td>
                      <td style={{ padding:'16px 20px', textAlign:'center' }}>
                        <span style={{ background:'#EEF1FA', color:C.navy, fontWeight:700, fontSize:11, padding:'4px 12px', borderRadius:100 }}>{c.total_karyawan} org</span>
                      </td>
                      <td style={{ padding:'16px 20px', textAlign:'right', color:C.ink, fontWeight:600, fontFamily:'monospace' }}>{fmtFull(c.total_gaji)}</td>
                      <td style={{ padding:'16px 20px', textAlign:'right', color:'#EF4444', fontWeight:600, fontFamily:'monospace' }}>-{fmtFull(pot)}</td>
                      <td style={{ padding:'16px 20px', textAlign:'right', color:C.navy, fontWeight:800, fontFamily:'monospace' }}>{fmtFull(c.total_diterima)}</td>
                      <td style={{ padding:'16px 20px' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                          <div style={{ flex:1, maxWidth:80, height:5, background:'#F0F2F8', borderRadius:100, overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:C.gold, borderRadius:100 }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:'monospace', minWidth:30 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:C.navy }}>
                  <td style={{ padding:'14px 20px', fontWeight:800, color:'white', fontSize:13 }}>Total</td>
                  <td style={{ padding:'14px 20px', textAlign:'center', fontWeight:800, color:'white' }}>{totalKaryawan} org</td>
                  <td style={{ padding:'14px 20px', textAlign:'right', fontWeight:800, color:'white', fontFamily:'monospace' }}>{fmtFull(totalGaji)}</td>
                  <td style={{ padding:'14px 20px', textAlign:'right', fontWeight:800, color:'#fca5a5', fontFamily:'monospace' }}>-{fmtFull(totalPotongan)}</td>
                  <td style={{ padding:'14px 20px', textAlign:'right', fontWeight:800, color:C.gold, fontFamily:'monospace' }}>{fmtFull(totalDiterima)}</td>
                  <td style={{ padding:'14px 20px', textAlign:'center', fontWeight:800, color:'white', fontFamily:'monospace' }}>
                    {totalGaji>0?Math.min(100,Math.round((totalDiterima/totalGaji)*100)):0}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </>)}
    </div>
  )
}
