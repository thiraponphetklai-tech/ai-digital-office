'use client'

import React, { useEffect, useState } from 'react'

type User = { id: string; username: string; displayName: string; systemRole: string; mustChangePassword: boolean }

export function LocalAuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { void fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(data => setUser(data?.user ?? null)).catch(() => setUser(null)) }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError('')
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setError(data.error ?? 'Unable to sign in.')
    setPassword(''); setUser(data.user)
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setError('')
    const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setError(data.error ?? 'Unable to change password.')
    setUser(null); setUsername(user?.username ?? ''); setCurrentPassword(''); setNewPassword('')
  }

  if (user === undefined) return <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', color:'#667085', fontFamily:'Arial,sans-serif' }}>Loading Digital Office...</div>
  if (!user) return <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'linear-gradient(135deg,#EEF2FF,#FAF5FF)', padding:20, fontFamily:'Arial,sans-serif' }}><form onSubmit={login} style={{ width:'min(390px,100%)', background:'#fff', border:'1px solid #E0E7FF', borderRadius:18, padding:28, boxShadow:'0 18px 45px rgba(79,70,229,.15)' }}><div style={{ width:42,height:42,borderRadius:12,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'#fff',fontWeight:800 }}>AI</div><h1 style={{ margin:'16px 0 6px', fontSize:23, color:'#172033' }}>Digital Office</h1><p style={{ margin:'0 0 22px', color:'#667085', fontSize:13 }}>Sign in with your local system account.</p><label style={labelStyle}>Username<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} style={inputStyle} /></label>{error && <p style={{ color:'#B91C1C', fontSize:12 }}>{error}</p>}<button style={primaryButton}>Sign in</button></form></main>
  if (user.mustChangePassword) return <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'#F8FAFC', padding:20, fontFamily:'Arial,sans-serif' }}><form onSubmit={changePassword} style={{ width:'min(430px,100%)', background:'#fff', border:'1px solid #E0E7FF', borderRadius:18, padding:28, boxShadow:'0 18px 45px rgba(79,70,229,.1)' }}><div style={{ fontSize:11,fontWeight:800,color:'#4F46E5',letterSpacing:'.08em' }}>SECURITY SETUP</div><h1 style={{ margin:'9px 0', fontSize:22,color:'#172033' }}>Change your temporary password</h1><p style={{ margin:'0 0 20px',color:'#667085',fontSize:13,lineHeight:1.5 }}>Welcome, {user.displayName}. You must set a new password before using the system.</p><label style={labelStyle}>Temporary password<input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>New password (minimum 12 characters)<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} style={inputStyle} /></label>{error && <p style={{ color:'#B91C1C',fontSize:12 }}>{error}</p>}<button style={primaryButton}>Change password and sign in again</button></form></main>
  return <>{children}</>
}

const labelStyle = { display:'block', fontSize:12, fontWeight:700, color:'#475467', marginBottom:14 }
const inputStyle = { display:'block', width:'100%', marginTop:6, border:'1px solid #D8DEE9', borderRadius:9, padding:'10px 11px', fontSize:14, outline:'none' }
const primaryButton = { width:'100%', border:'none', borderRadius:9, padding:'11px 14px', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', fontWeight:800, cursor:'pointer', marginTop:6 }
