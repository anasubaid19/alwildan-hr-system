import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Bell, Upload, FileSpreadsheet, Info, CheckCheck, X, LogIn } from 'lucide-react'
import { C, authHeaders } from '../utils/constants'

const ICONS = {
  upload: { icon: Upload,          bg:'#ECFDF5', color:'#059669' },
  master: { icon: FileSpreadsheet, bg:'#EEF1FA', color:'#1A3B8F' },
  login:  { icon: LogIn,           bg:'#F0FDF4', color:'#16A34A' },
  info:   { icon: Info,            bg:'#FFFBEB', color:'#D97706' },
}

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff/60000)
  const h = Math.floor(diff/3600000)
  const d = Math.floor(diff/86400000)
  if (m < 1)  return 'Baru saja'
  if (m < 60) return m + ' menit lalu'
  if (h < 24) return h + ' jam lalu'
  return d + ' hari lalu'
}

export default function NotificationPanel({ onClose, onNavigate, onUnreadChange }) {
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef()

  const fetchNotifs = async () => {
    try {
      const res = await axios.get('/api/notifications', { headers: authHeaders() })
      setNotifs(res.data.data)
      setUnread(res.data.unread)
      if (onUnreadChange) onUnreadChange(res.data.unread)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchNotifs() }, [])

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id) => {
    await axios.put('/api/notifications/' + id + '/read', {}, { headers: authHeaders() })
    fetchNotifs()
  }

  const markAllRead = async () => {
    await axios.put('/api/notifications/read-all', {}, { headers: authHeaders() })
    fetchNotifs()
  }

  const deleteNotif = async (e, id) => {
    e.stopPropagation()
    await axios.delete('/api/notifications/' + id, { headers: authHeaders() })
    fetchNotifs()
  }

  const clearRead = async () => {
    await axios.delete('/api/notifications/clear/read', { headers: authHeaders() })
    fetchNotifs()
  }

  const clearAll = async () => {
    await axios.delete('/api/notifications/clear/all', { headers: authHeaders() })
    fetchNotifs()
  }

  return (
    <div ref={panelRef} style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:360, background:'white', borderRadius:20, border:'1px solid ' + C.hairline, boxShadow:'0 8px 32px rgba(26,59,143,0.15)', zIndex:100, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid ' + C.hairline, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>Notifikasi</p>
          {unread > 0 && (
            <span style={{ background:C.navy, color:'white', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100 }}>{unread}</span>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', gap:6 }}>
            {unread > 0 && (
              <button onClick={markAllRead}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', background:'#EEF1FA', color:C.navy, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <CheckCheck size={12}/> Tandai dibaca
              </button>
            )}
            {notifs.length > 0 && (
              <button onClick={clearAll}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', background:'#FEF2F2', color:'#EF4444', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                <X size={12}/> Hapus semua
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight:400, overflowY:'auto' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
            <div style={{ width:24, height:24, border:'2.5px solid ' + C.navy, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'#F0F2F8', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
              <Bell size={22} color={C.muted}/>
            </div>
            <p style={{ fontSize:14, color:C.muted }}>Belum ada notifikasi</p>
          </div>
        ) : (
          notifs.map(n => {
            const typeConf = ICONS[n.type] || ICONS.info
            const Icon = typeConf.icon
            return (
              <div key={n.id}
                onClick={() => { markRead(n.id); if(n.link_page) { onNavigate(n.link_page); onClose() } }}
                style={{ padding:'14px 20px', display:'flex', gap:14, cursor:n.link_page?'pointer':'default', transition:'background 0.1s', background: n.is_read ? 'white' : '#F8F9FF', borderBottom:'1px solid ' + C.hairline }}
                onMouseEnter={e => e.currentTarget.style.background='#F8F9FC'}
                onMouseLeave={e => e.currentTarget.style.background=n.is_read?'white':'#F8F9FF'}>
                <div style={{ width:40, height:40, borderRadius:12, background:typeConf.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={18} color={typeConf.color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                    <p style={{ fontSize:13, fontWeight: n.is_read ? 600 : 700, color:C.ink, lineHeight:1.4 }}>{n.title}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      {!n.is_read && <div style={{ width:8, height:8, borderRadius:'50%', background:C.navy, marginTop:4 }}/>}
                      <button onClick={e=>deleteNotif(e,n.id)}
                        style={{ width:24, height:24, borderRadius:6, border:'none', background:'#F0F2F8', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, transition:'all 0.15s', flexShrink:0 }}
                        onMouseEnter={e=>{ e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.color='#EF4444' }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='#F0F2F8'; e.currentTarget.style.color=C.muted }}>
                        <X size={12}/>
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:C.muted, marginTop:3, lineHeight:1.5 }}>{n.message}</p>
                  <p style={{ fontSize:11, color:C.muted, marginTop:5, opacity:0.7 }}>{timeAgo(n.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
