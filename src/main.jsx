import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import { parseMetricsCsv, rangeStart } from '../lib/dashboard.mjs'
import './style.css'

const defaults = {
  error_rate: { label: 'Error rate', operator: 'Greater than', value: 0.5, unit: '%' },
  response_time: { label: 'Response time', operator: 'Greater than', value: 500, unit: ' ms' },
  availability: { label: 'Availability', operator: 'Less than', value: 99.5, unit: '%' },
  incidents: { label: 'Incidents', operator: 'Greater than', value: 5, unit: '' },
}

const average = (rows, key) => rows.length ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length : 0

function Auth({ reset, onAuthenticated, onResetComplete }) {
  const [mode, setMode] = useState(reset ? 'reset' : 'sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const isReset = mode === 'reset'

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return setMessage('Unable to sign in with those details.')
      onAuthenticated()
      return
    }
    if (mode === 'recover') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setMessage(error ? 'We could not send a recovery link. Please try again.' : 'If this email is registered, a recovery link is on its way.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setMessage('We could not update your password. Please request a new recovery link.')
    onResetComplete?.()
  }

  return <main className="auth-page"><section className="auth-art"><div className="brand"><b>✦</b> Northstar</div><h1>Make operational health clear.</h1><p>A secure, shared view of the performance data that matters to your organization.</p></section><section className="auth-panel"><form className="auth-card" onSubmit={submit}><div className="brand dark"><b>✦</b> Northstar</div><span className="eyebrow">{isReset || mode === 'recover' ? 'Account recovery' : 'Welcome back'}</span><h2>{isReset ? 'Set a new password' : mode === 'recover' ? 'Reset your password' : 'Sign in to your account'}</h2><p>{isReset ? 'Use at least 12 characters.' : mode === 'recover' ? 'We’ll send a recovery link if the account exists.' : 'Use your work email to continue.'}</p>{!isReset && <label>Email address<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>}<label>{isReset ? 'New password' : 'Password'}<input type="password" required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isReset ? 'Create a new password' : 'Enter your password'} /></label><button className="primary">{isReset ? 'Save password' : mode === 'recover' ? 'Send recovery link' : 'Sign in'}</button>{message && <div className="message">{message}</div>}<div className="auth-links">{mode === 'sign-in' && <button type="button" onClick={() => setMode('recover')}>Forgot password?</button>}{mode === 'recover' && <button type="button" onClick={() => setMode('sign-in')}>← Return to sign in</button>}</div></form></section></main>
}

function MetricsImport({ organizationId, onImported }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function importFile(event) {
    const [file] = event.target.files
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a CSV file.')
      const rows = parseMetricsCsv(await file.text(), organizationId)
      const { error } = await supabase.from('performance_metrics').insert(rows)
      if (error) throw error
      await onImported()
      setMessage(`Imported ${rows.length} metric row${rows.length === 1 ? '' : 's'}.`)
      event.target.value = ''
    } catch (error) {
      setMessage(error.message || 'We could not import that CSV.')
    } finally {
      setBusy(false)
    }
  }

  return <article className="panel import-panel"><div><h2>Import performance data</h2><p>Append CSV metrics for this organization.</p></div><label>CSV file<input type="file" accept=".csv,text/csv" onChange={importFile} disabled={busy} /></label>{message && <div className="message" role="status">{message}</div>}</article>
}

function DashboardView({ admin, organizationId, range, setRange, status, error, reload, rows }) {
  const latest = rows.at(-1)
  const metrics = latest ? [{ label: 'Uptime', value: `${Number(latest.uptime).toFixed(2)}%`, note: 'Current reading', tone: 'good' }, { label: 'Response time', value: `${Math.round(average(rows, 'response_time'))} ms`, note: 'Average in range', tone: 'good' }, { label: 'Error rate', value: `${average(rows, 'error_rate').toFixed(2)}%`, note: 'Average in range', tone: 'good' }, { label: 'Transactions', value: Math.round(rows.reduce((sum, row) => sum + Number(row.transaction_volume), 0)).toLocaleString(), note: 'In selected range', tone: 'good' }, { label: 'Availability', value: `${Number(latest.availability).toFixed(2)}%`, note: 'Current reading', tone: 'good' }, { label: 'Incidents', value: String(latest.incidents), note: 'Latest recorded count', tone: latest.incidents ? 'warn' : 'good' }] : []
  return <><div className="title"><div><span className="eyebrow">Customer dashboard</span><h1>Performance overview</h1><p>Live operational health across your customer-facing applications.</p></div><div><div className="periods">{[['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days']].map(([key, label]) => <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{label}</button>)}</div><small>RLS-scoped to your organization</small></div></div>{admin && <MetricsImport organizationId={organizationId} onImported={reload} />}{status === 'loading' && <div className="state">Loading performance data…</div>}{status === 'error' && <div className="state error">{error}<button onClick={reload}>Try again</button></div>}{status === 'ready' && !rows.length && <div className="state">No performance data exists for this range yet.</div>}{status === 'ready' && rows.length > 0 && <><div className="metric-grid">{metrics.map((metric) => <article className="metric" key={metric.label}><span>{metric.label}</span><b>{metric.value}</b><small className={metric.tone}>{metric.note}</small></article>)}</div><div className="dashboard-grid"><article className="panel"><h2>Availability & uptime</h2><p>Recorded availability through the selected range.</p><div className="chart">{rows.slice(-18).map((row) => <i key={row.id} style={{ height: `${Math.max(18, Number(row.availability))}%` }} title={`${row.recorded_at}: ${row.availability}%`} />)}</div><div className="chart-labels"><span>Earlier</span><span>Now</span></div></article><article className="panel"><h2>Latest operational signal</h2><p>{latest.incidents ? `${latest.incidents} incident${latest.incidents === 1 ? '' : 's'} recorded in the latest sample.` : 'No incidents recorded in the latest sample.'}</p><dl><div><dt>Last update</dt><dd>{new Date(latest.recorded_at).toLocaleString()}</dd></div><div><dt>Transactions</dt><dd>{Number(latest.transaction_volume).toLocaleString()}</dd></div></dl></article></div></>}</>
}

function UsersView({ users }) { return <><div className="title"><div><span className="eyebrow">Customer administration</span><h1>Users</h1><p>People with access to your organization’s data.</p></div></div><article className="panel table"><table><thead><tr><th>User</th><th>Email</th><th>Role</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.display_name || 'Unnamed user'}</td><td>{user.email}</td><td><span className="pill">{user.role.replace('_', ' ')}</span></td></tr>)}</tbody></table>{!users.length && <p>No users are available yet.</p>}</article></> }

function ThresholdRow({ metric, setting, threshold, save }) {
  const [value, setValue] = useState(String(threshold?.value ?? setting.value))
  useEffect(() => setValue(String(threshold?.value ?? setting.value)), [threshold?.value, setting.value])
  return <div className="threshold"><div><strong>{setting.label}</strong><small>{threshold ? 'Organization override' : 'Platform default'}</small></div><span>{setting.operator}</span><label><input value={value} inputMode="decimal" onChange={(event) => setValue(event.target.value)} />{setting.unit}</label><button className="secondary" onClick={() => save(metric, value)}>Save</button></div>
}

function ThresholdsView({ thresholds, save }) { const byMetric = Object.fromEntries(thresholds.map((threshold) => [threshold.metric, threshold])); return <><div className="title"><div><span className="eyebrow">Customer administration</span><h1>Alert thresholds</h1><p>Organization overrides take priority over platform defaults.</p></div></div><article className="panel thresholds">{Object.entries(defaults).map(([metric, setting]) => <ThresholdRow key={metric} metric={metric} setting={setting} threshold={byMetric[metric]} save={save} />)}</article></> }

function Dashboard({ profile, onSignOut }) {
  const [view, setView] = useState('dashboard')
  const [range, setRange] = useState('24h')
  const [rows, setRows] = useState([])
  const [thresholds, setThresholds] = useState([])
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const admin = profile.role === 'customer_admin'
  useEffect(() => { loadDashboard() }, [range])
  useEffect(() => { if (admin) loadAdmin() }, [admin])
  async function loadDashboard() { setStatus('loading'); setError(''); const { data, error: queryError } = await supabase.from('performance_metrics').select('*').gte('recorded_at', rangeStart(range, new Date())).order('recorded_at', { ascending: true }); if (queryError) { setError('We could not load performance data.'); setStatus('error'); return }; setRows(data); setStatus('ready') }
  async function loadAdmin() { const [thresholdResult, userResult] = await Promise.all([supabase.from('alert_thresholds').select('*').order('metric'), supabase.from('profiles').select('id, email, display_name, role').order('display_name')]); if (!thresholdResult.error) setThresholds(thresholdResult.data); if (!userResult.error) setUsers(userResult.data) }
  async function saveThreshold(metric, value) { const { error: saveError } = await supabase.from('alert_thresholds').upsert({ organization_id: profile.organization_id, metric, operator: defaults[metric].operator === 'Less than' ? 'lt' : 'gt', value: Number(value) }, { onConflict: 'organization_id,metric' }); if (saveError) setError('We could not save that threshold.'); else loadAdmin() }
  async function signOut() { await supabase.auth.signOut(); onSignOut() }
  return <div className="app"><aside><div className="brand"><b>✦</b> Northstar</div><small>Customer workspace</small><nav><button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>▦ Dashboard</button>{admin && <><button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>♙ Users</button><button className={view === 'thresholds' ? 'active' : ''} onClick={() => setView('thresholds')}>◫ Alert thresholds</button></>}</nav><div className="account"><span>{profile.display_name?.slice(0, 2).toUpperCase() || 'ME'}</span><div><strong>{profile.display_name || profile.email}</strong><small>{admin ? 'Customer Admin' : 'Customer Viewer'}</small></div><button onClick={signOut}>Sign out</button></div></aside><main className="workspace"><header><span>Acme Retail / <strong>{view === 'dashboard' ? 'Performance overview' : view === 'users' ? 'Users' : 'Alert thresholds'}</strong></span><span className="healthy">● Connected</span></header><div className="content">{view === 'dashboard' && <DashboardView admin={admin} organizationId={profile.organization_id} range={range} setRange={setRange} status={status} error={error} reload={loadDashboard} rows={rows} />}{view === 'users' && <UsersView users={users} />}{view === 'thresholds' && <ThresholdsView thresholds={thresholds} save={saveThreshold} />}</div></main></div>
}

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [recovery, setRecovery] = useState(false)
  async function refresh() { const { data: { session: active } } = await supabase.auth.getSession(); setSession(active); if (!active) return setProfile(null); const { data } = await supabase.from('profiles').select('*').single(); setProfile(data) }
  useEffect(() => { refresh(); const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setRecovery(true); else refresh() }); return () => subscription.unsubscribe() }, [])
  if (session === undefined) return <div className="loading">Checking secure session…</div>
  if (recovery) return <Auth reset onAuthenticated={refresh} onResetComplete={() => { setRecovery(false); refresh() }} />
  if (!session) return <Auth onAuthenticated={refresh} />
  if (!profile) return <main className="loading"><h1>Your account has not been provisioned.</h1><p>Ask your platform administrator to add your profile and organization access.</p><button onClick={() => supabase.auth.signOut().then(refresh)}>Sign out</button></main>
  return <Dashboard profile={profile} onSignOut={refresh} />
}

createRoot(document.getElementById('root')).render(<App />)
