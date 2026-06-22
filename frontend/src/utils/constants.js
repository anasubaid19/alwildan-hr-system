export const C = {
  navy: '#1A3B8F',
  gold: '#C8962E',
  ink: '#0a0b0d',
  muted: '#9BA5C0',
  hairline: '#E8EBF4',
  bg: '#F0F2F8',
  white: '#ffffff',
  green: '#22C55E',
  red: '#EF4444',
}

export const authHeaders = () => {
  const t = localStorage.getItem('aw_token')
  return t ? { Authorization: 'Bearer ' + t } : {}
}
