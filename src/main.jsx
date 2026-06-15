import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const PASSCODE = 'bingoandbrewsYP';
const STORE_KEY = 'esc-bingo-brews-state-v2';
const LOCK_KEY = 'esc-bingo-brews-host-lock-v2';

const DEFAULT_STATE = {
  mode: 'game',
  called: [],
  pattern: 'Traditional Bingo',
  announcement: '',
  settings: {
    eventPrefix: 'ESC Young Professionals',
    eventName: 'Bingo & Brews',
    beneficiary: 'United Way of Baldwin County',
    titleSponsor: 'Crow Shields Bailey',
    sponsors: [
      { name: 'Crow Shields Bailey', level: 'Title Sponsor', logo: '/assets/crow-shields-bailey.png' },
      { name: 'BankPlus', level: 'Gold Sponsor', logo: '/assets/bankplus.jpg' },
      { name: 'Castle Technology', level: 'Gold Sponsor', logo: '/assets/castle.png' },
      { name: "Cockrell's Eastern Shore", level: 'Gold Sponsor', logo: '/assets/cockrells.png' },
      { name: 'Riviera Utilities', level: 'Team', logo: '/assets/riviera.jpg' },
      { name: 'Fairhope Brewing Company', level: 'Host', logo: '/assets/fairhope-brewing.webp' }
    ],
    tableSponsors: ['Wilkins Miller','Social Magazine','Tracey Goens','Avizo','Bryant Bank','Daphne Utilities','Uniti Fiber','River Bank & Trust','Alabama Credit Union','Alabama Power'],
    breakText: 'Grab a drink, purchase raffle tickets, and hold on to your cards!',
    raffleText: 'Purchase tickets for a chance to win amazing prizes from our local sponsors.'
  }
};

function loadState(){ try { return {...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}')}; } catch { return DEFAULT_STATE; } }
function saveState(next){ localStorage.setItem(STORE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event('esc-storage')); }
function useGameState(){ const [state,setState]=useState(loadState); useEffect(()=>{ const h=()=>setState(loadState()); window.addEventListener('storage',h); window.addEventListener('esc-storage',h); return()=>{window.removeEventListener('storage',h);window.removeEventListener('esc-storage',h)}},[]); const update=(patch)=>{ const next= typeof patch==='function' ? patch(loadState()) : {...loadState(),...patch}; saveState(next); setState(next); }; return [state,update]; }

const cols = [{l:'B',s:1,e:15},{l:'I',s:16,e:30},{l:'N',s:31,e:45},{l:'G',s:46,e:60},{l:'O',s:61,e:75}];
const patterns = ['Traditional Bingo','Four Corners','X Pattern','Postage Stamp','Blackout','Host Choice'];
function letter(n){ if(!n) return ''; if(n<=15)return'B'; if(n<=30)return'I'; if(n<=45)return'N'; if(n<=60)return'G'; return'O'; }
function label(n){ return n ? `${letter(n)}-${n}` : 'Ready'; }
function nextNumber(called){ const left=Array.from({length:75},(_,i)=>i+1).filter(n=>!called.includes(n)); return left[Math.floor(Math.random()*left.length)]; }
function route(){ return window.location.pathname.replace('/','') || 'home'; }
function nav(path){ history.pushState(null,'','/'+path); window.dispatchEvent(new Event('popstate')); }
function Logo({src,alt,className=''}){ return <img src={src} alt={alt} className={'logo '+className} /> }

function App(){ const [path,setPath]=useState(route()); useEffect(()=>{ const h=()=>setPath(route()); window.addEventListener('popstate',h); return()=>window.removeEventListener('popstate',h);},[]); if(path==='audience') return <Audience/>; if(path==='host') return <Protected type="host"><Host/></Protected>; if(path==='admin') return <Protected type="admin"><Admin/></Protected>; return <Home/>; }

function Home(){ return <div className="home"><div className="home-card"><div className="brand-row"><Logo src="/assets/esyp-logo.png"/><Logo src="/assets/united-way.png"/></div><p className="eyebrow">ESC Young Professionals</p><h1>Bingo & Brews</h1><p className="sub">Presented by Crow Shields Bailey • Benefiting United Way of Baldwin County</p><div className="home-buttons"><button onClick={()=>nav('audience')}>Open Audience Display</button><button onClick={()=>nav('host')}>Open Host Controls</button><button onClick={()=>nav('admin')}>Open Admin Settings</button></div></div></div> }

function Protected({children,type}){ const [ok,setOk]=useState(sessionStorage.getItem('bb-auth-'+type)==='yes'); const [pass,setPass]=useState(''); const [err,setErr]=useState(''); function submit(e){ e.preventDefault(); if(pass===PASSCODE){ sessionStorage.setItem('bb-auth-'+type,'yes'); setOk(true); } else setErr('That passcode did not work.'); } if(ok) return children; return <div className="home"><form className="login" onSubmit={submit}><h1>{type==='admin'?'Admin Settings':'Host Controls'}</h1><p>Enter the event passcode.</p><input value={pass} onChange={e=>setPass(e.target.value)} type="password" autoFocus/><button>Unlock</button>{err&&<p className="err">{err}</p>}<a onClick={()=>nav('home')}>Back to home</a></form></div> }

function Audience(){ const [state]=useGameState(); const s=state.settings; const current=state.called[state.called.length-1]; const calledSet=new Set(state.called); const title = <><p className="eyebrow audience-eyebrow">{s.eventPrefix}</p><h1>{s.eventName}</h1><p className="benefit">Benefiting {s.beneficiary}</p></>;
  return <main className={'audience mode-'+state.mode}>
    {state.announcement && <div className="announce">{state.announcement}</div>}
    <header className="aud-header"><Logo src="/assets/esyp-logo.png"/><div className="title-block">{title}</div><div className="presented"><span>Presented by</span><strong>{s.titleSponsor}</strong></div><Logo src="/assets/united-way.png"/></header>
    {state.mode==='game' && <GameBoard state={state} current={current} calledSet={calledSet}/>} 
    {state.mode==='hold' && <SpecialScreen icon="✋" title="Hold Your Cards!" text="A winner has been called. Please keep your cards available while we verify the winning card."/>}
    {state.mode==='beer' && <SpecialScreen photo icon="🍺" title="Beer Break" text={s.breakText}/>} 
    {state.mode==='raffle' && <SpecialScreen icon="🎟️" title="Raffle Time" text={s.raffleText}/>} 
    {state.mode==='thanks' && <SpecialScreen icon="❤️" title="Thank you for joining us." text={`Thank you to our sponsors, players, volunteers, and ${s.beneficiary}.`}/>} 
    <SponsorStrip sponsors={s.sponsors}/><Ticker names={s.tableSponsors}/>
  </main>
}
function GameBoard({state,current,calledSet}){ return <section className="game-grid"><aside className="current-card"><div className="small-label">Current Call</div><div className="current-call">{label(current)}</div><div className="pattern-pill">Current Pattern: <strong>{state.pattern}</strong></div><div className="recent"><span>Recent Calls</span><div>{state.called.slice(-6).reverse().map(n=><b key={n}>{label(n)}</b>)}</div></div></aside><div className="board">{cols.map(c=><div className="col" key={c.l}><div className="col-head">{c.l}</div>{Array.from({length:15},(_,i)=>c.s+i).map(n=><div key={n} className={'cell '+(n===current?'current':calledSet.has(n)?'called':'')}>{n}</div>)}</div>)}</div></section> }
function SpecialScreen({icon,title,text,photo}){ return <section className={'special '+(photo?'with-photo':'')}><div className="photo-bg"/><div className="special-inner"><div className="special-icon">{icon}</div><h2>{title}</h2><p>{text}</p><small>Benefiting United Way of Baldwin County</small></div></section> }
function SponsorStrip({sponsors}){ return <div className="sponsor-strip"><div className="sponsor-track">{[...sponsors,...sponsors].map((sp,i)=><div className="sponsor" key={sp.name+i}><img src={sp.logo}/><span>Thank you, {sp.name}!</span></div>)}</div></div> }
function Ticker({names}){ return <div className="ticker"><div className="ticker-track"><strong>Table Sponsors:</strong>&nbsp;{[...names,...names].map((n,i)=><span key={n+i}>{n} <em>•</em> </span>)}</div></div> }

function Host(){ const [state,update]=useGameState(); const [note,setNote]=useState(''); const hostId=useRef(Math.random().toString(36).slice(2)); const [locked,setLocked]=useState(false); useEffect(()=>{ const now=Date.now(); const existing=JSON.parse(localStorage.getItem(LOCK_KEY)||'null'); if(existing && existing.id!==hostId.current && now-existing.time<90000) setLocked(true); const beat=()=>localStorage.setItem(LOCK_KEY,JSON.stringify({id:hostId.current,time:Date.now()})); beat(); const int=setInterval(beat,15000); return()=>clearInterval(int); },[]); const current=state.called[state.called.length-1]; function call(){ const n=nextNumber(state.called); if(n) update(st=>({...st,mode:'game',called:[...st.called,n]})); } function reset(){ if(confirm('Start a new round? This will clear all called numbers and reset the board.')) update(st=>({...st,called:[],mode:'game',announcement:''})); }
  if(locked) return <div className="panel"><h1>Host session currently active.</h1><p>Another host screen appears to be open. Close the other host screen or wait about 90 seconds.</p></div>;
  return <div className="panel"><div className="panel-head"><button onClick={()=>nav('audience')}>Audience Display</button><h1>Game Control Center</h1><button onClick={()=>nav('home')}>Home</button></div><section className="host-summary"><div><span>Current Call</span><strong>{label(current)}</strong></div><div><span>Numbers Called</span><strong>{state.called.length}</strong></div><div><span>Current Pattern</span><strong>{state.pattern}</strong></div></section><section className="controls"><button className="primary" onClick={call}>Call Next Number</button><button onClick={()=>update(st=>({...st,called:st.called.slice(0,-1)}))}>Undo Last Call</button><button onClick={()=>update({mode:'hold'})}>Hold Your Cards</button><button onClick={()=>update({mode:'beer'})}>Beer Break</button><button onClick={()=>update({mode:'raffle'})}>Raffle Time</button><button onClick={()=>update({mode:'thanks'})}>Thank You Screen</button><button onClick={()=>update({mode:'game'})}>Back to Game</button><button className="danger" onClick={reset}>New Round</button></section><section className="host-tools"><label>Pattern<select value={state.pattern} onChange={e=>update({pattern:e.target.value, mode:'game'})}>{patterns.map(p=><option key={p}>{p}</option>)}</select></label><label>Announcement Banner<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Last chance for raffle tickets!"/></label><div className="inline"><button onClick={()=>update({announcement:note})}>Push Announcement</button><button onClick={()=>{setNote(''); update({announcement:''});}}>Remove Announcement</button></div></section></div> }

function Admin(){ const [state,update]=useGameState(); const [settings,setSettings]=useState(state.settings); useEffect(()=>setSettings(state.settings),[state.settings]); function save(){ update({settings}); alert('Settings saved.'); } const sponsorText=settings.sponsors.map(s=>`${s.name} | ${s.level} | ${s.logo}`).join('\n'); function parseSponsors(text){ setSettings({...settings,sponsors:text.split('\n').filter(Boolean).map(line=>{ const [name='',level='',logo='']=line.split('|').map(x=>x.trim()); return {name,level,logo}; })}); }
 return <div className="panel admin"><div className="panel-head"><button onClick={()=>nav('audience')}>Audience Display</button><h1>Admin Settings</h1><button onClick={()=>nav('home')}>Home</button></div><p className="hint">Use one sponsor per line: Sponsor Name | Sponsor Level | Logo Path</p><label>Event Prefix<input value={settings.eventPrefix} onChange={e=>setSettings({...settings,eventPrefix:e.target.value})}/></label><label>Event Name<input value={settings.eventName} onChange={e=>setSettings({...settings,eventName:e.target.value})}/></label><label>Beneficiary<input value={settings.beneficiary} onChange={e=>setSettings({...settings,beneficiary:e.target.value})}/></label><label>Title Sponsor<input value={settings.titleSponsor} onChange={e=>setSettings({...settings,titleSponsor:e.target.value})}/></label><label>Sponsors<textarea rows="9" value={sponsorText} onChange={e=>parseSponsors(e.target.value)}/></label><label>Table Sponsors<textarea rows="7" value={settings.tableSponsors.join('\n')} onChange={e=>setSettings({...settings,tableSponsors:e.target.value.split('\n').filter(Boolean)})}/></label><label>Beer Break Message<input value={settings.breakText} onChange={e=>setSettings({...settings,breakText:e.target.value})}/></label><label>Raffle Message<input value={settings.raffleText} onChange={e=>setSettings({...settings,raffleText:e.target.value})}/></label><button className="primary" onClick={save}>Save Settings</button></div> }

createRoot(document.getElementById('root')).render(<App/>);
