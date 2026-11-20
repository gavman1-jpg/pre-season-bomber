/* Full Season: Teams.
   A coach creates a team and shares a join code. Players join and the coach approves them.
   The coach posts team sessions (e.g. "3 km run"). Players log a result with the team or on their own.
   Privacy: first name and jumper number only. No photos, no chat. Anonymous sign-in, no emails. */
(function(){
"use strict";
const C=()=>window.__core;

/* ---------------- Backend (Firestore) ---------------- */
function firestoreBackend(cfg){
  const F=window.FBSDK;
  const app=F.initializeApp(cfg),auth=F.getAuth(app);
  let db;
  try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache()});}catch(e){db=F.initializeFirestore(app,{});}
  const d=(...p)=>F.doc(db,...p),col=(...p)=>F.collection(db,...p);
  const ABC='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code=()=>Array.from({length:6},()=>ABC[Math.floor(Math.random()*ABC.length)]).join('');
  let readyP=null;
  const B={
    uid:()=>auth.currentUser&&auth.currentUser.uid,
    ready(){
      if(!readyP)readyP=new Promise((res,rej)=>{
        const off=F.onAuthStateChanged(auth,u=>{if(u){off();res(u.uid);}});
        if(!auth.currentUser)setTimeout(()=>{if(!auth.currentUser)F.signInAnonymously(auth).catch(e=>{readyP=null;rej(e);});},400);
      });
      return readyP;
    },
    async createTeam({name,sport,me,num}){
      const uid=await B.ready();
      let c='';for(let i=0;i<6;i++){c=code();const s=await F.getDoc(d('codes',c));if(!s.exists())break;}
      const tref=F.doc(col('teams')),b=F.writeBatch(db);
      b.set(tref,{name,sport,code:c,coachUids:[uid],created:Date.now()});
      b.set(d('codes',c),{teamId:tref.id});
      b.set(d('teams',tref.id,'members',uid),{name:me,num:num||'',status:'approved',role:'coach',joined:Date.now()});
      await b.commit();
      return {teamId:tref.id,code:c};
    },
    async joinTeam(c,me,num){
      const uid=await B.ready();
      const s=await F.getDoc(d('codes',c.toUpperCase()));
      if(!s.exists())throw new Error('nocode');
      const teamId=s.data().teamId;
      const ex=await F.getDoc(d('teams',teamId,'members',uid)).catch(()=>null);
      if(!ex||!ex.exists())await F.setDoc(d('teams',teamId,'members',uid),{name:me,num:num||'',status:'pending',role:'player',joined:Date.now()});
      return teamId;
    },
    watch(teamId,h){
      const uid=B.uid(),offs=[];let inner=[];
      const stopInner=()=>{inner.forEach(f=>f());inner=[];};
      offs.push(F.onSnapshot(d('teams',teamId),s=>h.team(s.exists()?Object.assign({id:s.id},s.data()):null),e=>h.error(e)));
      offs.push(F.onSnapshot(d('teams',teamId,'members',uid),s=>{
        const me=s.exists()?Object.assign({uid},s.data()):null;h.me(me);
        if(me&&me.status==='approved'){
          if(!inner.length){
            inner.push(F.onSnapshot(col('teams',teamId,'members'),q=>h.members(q.docs.map(x=>Object.assign({uid:x.id},x.data()))),e=>h.error(e)));
            inner.push(F.onSnapshot(F.query(col('teams',teamId,'sessions'),F.orderBy('due','desc'),F.limit(30)),q=>h.sessions(q.docs.map(x=>Object.assign({id:x.id},x.data()))),e=>h.error(e)));
          }
        } else stopInner();
      },e=>h.error(e)));
      return ()=>{offs.forEach(f=>f());stopInner();};
    },
    watchResults(teamId,sid,cb){return F.onSnapshot(col('teams',teamId,'sessions',sid,'results'),q=>cb(q.docs.map(x=>Object.assign({uid:x.id},x.data()))),()=>{});},
    approve:(t,uid)=>F.updateDoc(d('teams',t,'members',uid),{status:'approved'}),
    async promote(t,uid){const b=F.writeBatch(db);b.update(d('teams',t),{coachUids:F.arrayUnion(uid)});b.update(d('teams',t,'members',uid),{role:'coach',status:'approved'});await b.commit();},
    async remove(t,uid,wasCoach){const b=F.writeBatch(db);if(wasCoach)b.update(d('teams',t),{coachUids:F.arrayRemove(uid)});b.delete(d('teams',t,'members',uid));await b.commit();},
    addSession:(t,data)=>F.setDoc(F.doc(col('teams',t,'sessions')),Object.assign({created:Date.now()},data)),
    delSession:(t,sid)=>F.deleteDoc(d('teams',t,'sessions',sid)),
    logResult:(t,sid,data)=>F.setDoc(d('teams',t,'sessions',sid,'results',B.uid()),Object.assign({at:Date.now()},data)),
    delResult:(t,sid)=>F.deleteDoc(d('teams',t,'sessions',sid,'results',B.uid())),
    leave:(t)=>F.deleteDoc(d('teams',t,'members',B.uid()))
  };
  return B;
}

/* ---------------- Result types ---------------- */
const TYPES={
  time:{n:'Time',hint:'mm:ss, or seconds like 6.4',better:'low'},
  dist:{n:'Distance',hint:'kilometres, e.g. 2.4',better:'high'},
  reps:{n:'Reps',hint:'how many',better:'high'},
  level:{n:'Level',hint:'e.g. 9.5 for level 9, shuttle 5',better:'high'},
  done:{n:'Just done',hint:'',better:''}
};
const PRESETS=[
  {title:'3 km run',type:'time',details:'Steady but honest. Record your finish time.'},
  {title:'2 km time trial',type:'time',details:'Flat out for 2 km. Record your time.'},
  {title:'Beep test',type:'level',details:'Record the last level and shuttle you completed.'},
  {title:'40 m sprint',type:'time',details:'Best of 3 attempts, full rest between. Seconds.'},
  {title:'Distance in 12 minutes',type:'dist',details:'Run as far as you can in 12 minutes (km).'},
  {title:'Push-ups in 1 minute',type:'reps',details:'Good form only. Knees down is fine.'},
  {title:'Recovery run',type:'done',details:'20 minutes easy. Just tick it off.'}
];
function parseVal(type,raw){
  raw=String(raw||'').trim();
  if(type==='done')return {value:null,display:'Done'};
  if(type==='time'){
    let v;
    if(raw.includes(':')){const p=raw.split(':').map(Number);if(p.some(isNaN))return null;v=p.reduce((a,x)=>a*60+x,0);}
    else{v=Number(raw);if(isNaN(v))return null;}
    if(!(v>0)||v>36000)return null;return {value:v,display:fmtTime(v)};
  }
  const v=Number(raw.replace(',','.'));if(isNaN(v)||v<=0||v>100000)return null;
  if(type==='dist')return {value:v,display:(Math.round(v*100)/100)+' km'};
  if(type==='reps')return {value:Math.round(v),display:Math.round(v)+''};
  if(type==='level')return {value:v,display:'Level '+v};
  return null;
}
function fmtTime(v){if(v<60)return (Math.round(v*100)/100)+' s';const m=Math.floor(v/60),s=Math.round(v-m*60);return m+':'+String(s).padStart(2,'0');}

/* ---------------- State ---------------- */
let B=null,status='off',err='',team=null,me=null,members=[],sessions=[],results={},openSid=null,unwatch=null,resWatch={};
const st=()=>C().S();
function configured(){return !!window.FIREBASE_CONFIG&&(window.FIREBASE_CONFIG.mock||window.FIREBASE_CONFIG.apiKey);}
function backend(){
  if(B)return B;
  if(!configured())return null;
  B=window.FIREBASE_CONFIG.mock?window.__mockTeamBackend:firestoreBackend(window.FIREBASE_CONFIG);
  return B;
}
function rerender(){if(C().tab()==='team'&&!document.getElementById('player'))C().render();}
function friendly(e){
  const m=(e&&(e.code||e.message))||'';
  if(/nocode/.test(m))return 'That code didn\'t match a team. Check it with your coach.';
  if(/network|unavailable|offline/i.test(m))return 'No internet connection. Team results need you to be online.';
  if(/permission/i.test(m))return 'You don\'t have access to that yet. Your coach may need to approve you.';
  return 'Something went wrong. Try again in a moment.';
}
async function connect(force){
  const b=backend();if(!b){status='off';return;}
  const T=st().team;
  if(!force&&status!=='off')return;
  status='connecting';err='';rerender();
  try{await b.ready();}catch(e){status='error';err=friendly(e);rerender();return;}
  if(!T||!T.id){status='none';rerender();return;}
  status='live';
  if(unwatch)unwatch();
  unwatch=b.watch(T.id,{
    team:x=>{team=x;rerender();},
    me:x=>{me=x;if(!x&&st().team){/* removed or left */const S=st();S.team=null;C().save();stopAll();status='none';C().toast('You\'re no longer in the team');}rerender();},
    members:x=>{members=x;rerender();},
    sessions:x=>{sessions=x;watchRecent();rerender();},
    error:e=>{err=friendly(e);rerender();}
  });
}
function watchRecent(){
  const T=st().team;if(!T)return;
  const want=new Set(sessions.slice(0,10).map(s=>s.id));if(openSid)want.add(openSid);
  Object.keys(resWatch).forEach(id=>{if(!want.has(id)){resWatch[id]();delete resWatch[id];}});
  want.forEach(id=>{if(!resWatch[id])resWatch[id]=B.watchResults(T.id,id,r=>{results[id]=r;rerender();});});
}
function stopAll(){if(unwatch)unwatch();unwatch=null;Object.values(resWatch).forEach(f=>f());resWatch={};team=null;me=null;members=[];sessions=[];results={};openSid=null;}
const isCoach=()=>!!(me&&me.role==='coach');
const approved=()=>!!(me&&me.status==='approved');

/* ---------------- Views ---------------- */
function view(){
  const {esc,ballIcon,IC}=C();
  if(!configured())return head('Team')+`<div class="card" style="padding:16px"><p class="muted">Team training is being switched on. Once the app is connected to its online database, you'll be able to create or join a team here.</p></div>`;
  if(status==='off')setTimeout(connect,0);
  if(status==='error')return head('Team')+`<div class="card" style="padding:16px"><p>${esc(err)}</p><button class="big" data-t="retry" style="margin-top:12px">Try again</button></div>`;
  if(status!=='none'&&status!=='live')return head('Team')+`<p class="muted" style="margin:20px 4px">Connecting…</p>`;
  const T=st().team;
  if(!T)return head('Team','Train together, even when you can\'t make it.')+`
    <div class="hero"><div class="tag">Team training</div><h2 class="disp">Join your team</h2><p>Your coach posts a session, like a Wednesday 3 km run. Do it with the team, or on your own if you can't make it, and log your result.</p>
    <button class="kick" data-t="join">${ballIcon()} I have a team code</button></div>
    <div class="card" style="padding:14px"><div class="n" style="font-weight:800">Coach or team manager?</div><p class="muted" style="margin:4px 0 10px">Create a team and share the code with your players.</p><button class="swap" data-t="create">Create a team</button></div>
    <div class="tip"><span>${IC.shield}</span><div><b>Kept simple and safe:</b> teams only see first names and jumper numbers. No photos, no chat, and the coach approves everyone who joins.</div></div>`;
  if(!team||!me)return head('Team')+`<p class="muted" style="margin:20px 4px">Loading your team…</p>`;
  if(!approved())return head(team.name)+`<div class="card" style="padding:16px"><div class="n" style="font-weight:800;font-size:18px">Waiting for your coach</div><p class="muted" style="margin:6px 0 12px">Your coach needs to approve you before you can see the team. Ask them to open the Team tab.</p><button class="link" data-t="leave">Cancel request</button></div>`;
  if(openSid)return sessionView();
  return teamView();
}
function head(title,sub){return `<div class="dhead" style="margin-top:6px"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Team</div><h2 class="disp">${C().esc(title)}</h2>${sub?`<p>${C().esc(sub)}</p>`:''}</div>`;}
const today=()=>{const t=new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');};
const fmtD=s=>{if(!s)return '';const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'});};
function teamView(){
  const {esc,IC}=C(),SP=window.PSB.SPORTS[team.sport];
  const pending=members.filter(m=>m.status==='pending'),squad=members.filter(m=>m.status==='approved');
  const t0=today(),open=sessions.filter(s=>s.due>=t0).sort((a,b)=>a.due<b.due?-1:1),past=sessions.filter(s=>s.due<t0);
  const card=s=>{const r=results[s.id]||[],mine=r.find(x=>x.uid===me.uid);
    return `<button class="fx ${mine?'isdone':''}" data-t="open" data-id="${s.id}"><div class="day"><b>${fmtD(s.date||s.due).split(' ')[0].replace(',','')}</b><small>${fmtD(s.date||s.due).split(' ').slice(1).join(' ')}</small></div>
      <div><div class="t">${esc(s.title)}</div><div class="s">${r.length}/${squad.length} done · due ${fmtD(s.due)}</div></div>${mine?`<span class="pill done">${esc(mine.display)}</span>`:'<span class="pill todo">To do</span>'}</button>`;};
  return head(team.name,(SP?SP.name+' · ':'')+squad.length+' in the squad')+`
  ${isCoach()?`<div class="card" style="padding:14px;display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div class="muted" style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Join code</div><div class="disp num" style="font-size:34px;letter-spacing:.12em">${esc(team.code)}</div></div><button class="swap" data-t="share">Share code</button></div>`:''}
  ${isCoach()&&pending.length?`<div class="blockhead"><h4>Waiting to join</h4><small>${pending.length}</small></div><div class="card">${pending.map(m=>`<div class="row"><div><div class="n">${esc(m.name)}${m.num?' · #'+esc(m.num):''}</div></div><div style="display:flex;gap:6px"><button class="swap" data-t="approve" data-id="${m.uid}">Approve</button><button class="link" data-t="reject" data-id="${m.uid}">Decline</button></div></div>`).join('')}</div>`:''}
  ${isCoach()?`<button class="big" data-t="newsession" style="margin:14px 0 4px">+ New team session</button>`:''}
  <div class="sect"><h3>Sessions</h3><small>${open.length} open</small></div>
  <div class="fixture">${open.map(card).join('')||`<p class="muted" style="margin:4px">${isCoach()?'Post your first session, like a 3 km run at Wednesday catch-up.':'No sessions yet. Your coach will post them here.'}</p>`}</div>
  ${past.length?`<div class="sect"><h3>Earlier</h3></div><div class="fixture">${past.map(card).join('')}</div>`:''}
  <div class="sect"><h3>Squad</h3><small>${squad.length}</small></div>
  <div class="card">${squad.sort((a,b)=>(+a.num||99)-(+b.num||99)).map(m=>`<div class="simple"><span>${m.num?'<b class="num">#'+esc(m.num)+'</b> ':''}${esc(m.name)}${m.uid===me.uid?' (you)':''}</span><span>${m.role==='coach'?'Coach':''}${isCoach()&&m.uid!==me.uid?` <button class="link" data-t="member" data-id="${m.uid}">Manage</button>`:''}</span></div>`).join('')}</div>
  <div class="tip"><span>${IC.shield}</span><div>Teams see first names and jumper numbers only. Results from solo sessions are marked so everyone knows it wasn't at the catch-up.</div></div>
  <div style="text-align:center;margin-top:12px"><button class="link" data-t="leave">Leave team</button></div>`;
}
function rankList(s){
  const r=(results[s.id]||[]).slice(),better=(TYPES[s.type]||{}).better;
  if(better==='low')r.sort((a,b)=>a.value-b.value);else if(better==='high')r.sort((a,b)=>b.value-a.value);else r.sort((a,b)=>a.at-b.at);
  return r;
}
function sessionView(){
  const {esc}=C(),s=sessions.find(x=>x.id===openSid);
  if(!s){openSid=null;return teamView();}
  const r=rankList(s),mine=r.find(x=>x.uid===me.uid),done=new Set(r.map(x=>x.uid));
  const waiting=members.filter(m=>m.status==='approved'&&!done.has(m.uid));
  const ranked=!!(TYPES[s.type]||{}).better;
  return `<button class="back" data-t="back">← Team</button>
  <div class="dhead"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">${s.date?'Team catch-up '+fmtD(s.date)+' · ':''}Due ${fmtD(s.due)}</div><h2 class="disp">${esc(s.title)}</h2>${s.details?`<p>${esc(s.details)}</p>`:''}</div>
  ${mine?`<div class="tip"><span>✓</span><div><b>Logged: ${esc(mine.display)}</b> ${mine.where==='solo'?'(on your own)':'(with the team)'} · <button class="link" data-t="log">Change</button></div></div>`:''}
  <div class="sect"><h3>Results</h3><small>${r.length} of ${r.length+waiting.length}</small></div>
  <div class="card">${r.map((x,i)=>`<div class="simple" style="${x.uid===me.uid?'color:var(--chalk);font-weight:800':''}"><span>${ranked?`<b class="num" style="color:var(--gold);display:inline-block;min-width:22px">${i+1}</b> `:''}${x.num?'#'+esc(x.num)+' ':''}${esc(x.name)} <span class="pill ${x.where==='solo'?'opt':'done'}" style="font-size:10px;padding:3px 7px">${x.where==='solo'?'Solo':'Team'}</span></span><span class="num">${esc(x.display)}</span></div>`).join('')||'<p class="muted" style="margin:8px 0">No results yet. Be the first!</p>'}</div>
  ${waiting.length?`<div class="sect"><h3>Not yet</h3></div><div class="card"><p class="muted" style="margin:8px 0">${waiting.map(m=>esc(m.name)).join(', ')}</p></div>`:''}
  ${isCoach()?`<div style="text-align:center;margin-top:14px"><button class="danger" data-t="delsession">Delete this session</button></div>`:''}
  <div style="height:90px"></div>
  <div class="sticky"><div class="in"><button class="big" data-t="log">${mine?'Update my result':'Log my result'}</button></div></div>`;
}

/* ---------------- Sheets ---------------- */
function needName(){const S=st();return !S.name;}
function joinSheet(){
  const {sheet,esc}=C(),S=st();
  sheet(`<h3>Join a team</h3><p>Enter the 6-letter code from your coach.</p>
    <div class="field"><label for="tj-code">Team code</label><input id="tj-code" maxlength="6" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em;font-size:22px"></div>
    <div class="field"><label for="tj-name">First name</label><input id="tj-name" maxlength="16" value="${esc(S.name)}"></div>
    <div class="field"><label for="tj-num">Jumper number</label><input id="tj-num" inputmode="numeric" maxlength="2" value="${esc(S.num)}"></div>
    <p style="font-size:13px">Your team sees your first name, number and results. Your coach approves you first.</p>
    <button class="big" data-tj="go">Ask to join</button>`,async e=>{
      if(!e.target.closest('[data-tj]'))return;
      const code=document.getElementById('tj-code').value.trim().toUpperCase(),name=document.getElementById('tj-name').value.trim(),num=document.getElementById('tj-num').value.replace(/\D/g,'').slice(0,2);
      if(code.length!==6){C().toast('Codes are 6 letters');return;}
      if(!name){C().toast('Add your first name');return;}
      const btn=e.target.closest('[data-tj]');btn.disabled=true;btn.textContent='Joining…';
      try{const id=await backend().joinTeam(code,name.split(' ')[0],num);const S2=st();S2.team={id};if(!S2.name)S2.name=name.split(' ')[0];if(!S2.num)S2.num=num;C().save();C().closeSheet();connect(true);}
      catch(err){btn.disabled=false;btn.textContent='Ask to join';C().toast(friendly(err));}
    });
}
function createSheet(){
  const {sheet,esc}=C(),S=st(),SP=window.PSB.SPORTS[S.sport]||{};
  sheet(`<h3>Create a team</h3><p>You'll be the coach. Share the code with your players and approve them as they join.</p>
    <div class="field"><label for="tc-team">Team name</label><input id="tc-team" maxlength="40" placeholder="e.g. Pakenham U14 Lions"></div>
    <div class="field"><label for="tc-name">Your first name</label><input id="tc-name" maxlength="16" value="${esc(S.name)}"></div>
    <p style="font-size:13px">Sport: ${esc(SP.name||'')}. Change it in the Locker first if needed.</p>
    <button class="big" data-tc="go">Create team</button>`,async e=>{
      if(!e.target.closest('[data-tc]'))return;
      const tname=document.getElementById('tc-team').value.trim(),name=document.getElementById('tc-name').value.trim().split(' ')[0];
      if(!tname||!name){C().toast('Add a team name and your name');return;}
      const btn=e.target.closest('[data-tc]');btn.disabled=true;btn.textContent='Creating…';
      try{const r=await backend().createTeam({name:tname,sport:S.sport||'afl',me:name,num:S.num});const S2=st();S2.team={id:r.teamId};if(!S2.name)S2.name=name;C().save();C().closeSheet();connect(true);C().toast('Team created. Code '+r.code);}
      catch(err){btn.disabled=false;btn.textContent='Create team';C().toast(friendly(err));}
    });
}
function sessionSheet(){
  const {sheet,esc}=C();
  let p={title:'',type:'time',details:'',date:today(),due:today()};
  const draw=()=>`<h3>New team session</h3><p>Pick a preset or write your own. Players who miss the catch-up can do it on their own before it's due.</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${PRESETS.map((x,i)=>`<button class="dchip" style="padding:8px 10px" data-ts-p="${i}">${esc(x.title)}</button>`).join('')}</div>
    <div class="field"><label for="ts-title">Session</label><input id="ts-title" maxlength="60" value="${esc(p.title)}" placeholder="e.g. 3 km run"></div>
    <div class="field"><label>Record</label><div class="dchips" style="grid-template-columns:repeat(5,1fr)">${Object.keys(TYPES).map(k=>`<button class="dchip ${p.type===k?'on':''}" data-ts-t="${k}">${TYPES[k].n}</button>`).join('')}</div></div>
    <div class="field"><label for="ts-det">Details</label><input id="ts-det" maxlength="140" value="${esc(p.details)}" placeholder="Where, how hard, anything to know"></div>
    <div class="field"><label for="ts-date">Team catch-up</label><input id="ts-date" type="date" value="${p.date}"></div>
    <div class="field"><label for="ts-due">Due by (for solo)</label><input id="ts-due" type="date" value="${p.due}"></div>
    <button class="big" data-ts="go" style="margin-top:8px">Post session</button>`;
  const grab=()=>{p.title=document.getElementById('ts-title').value;p.details=document.getElementById('ts-det').value;p.date=document.getElementById('ts-date').value;p.due=document.getElementById('ts-due').value;};
  const redraw=()=>{const el=document.querySelector('#scrim .sheet');el.innerHTML='<div class="grab"></div>'+draw();};
  sheet(draw(),async e=>{
    const b=e.target.closest('button');if(!b)return;grab();
    if(b.dataset.tsP!=null){const x=PRESETS[+b.dataset.tsP];p.title=x.title;p.type=x.type;p.details=x.details;redraw();return;}
    if(b.dataset.tsT){p.type=b.dataset.tsT;redraw();return;}
    if(b.dataset.ts){
      if(!p.title.trim()){C().toast('Name the session');return;}
      const due=p.due||p.date||today();
      b.disabled=true;
      try{await backend().addSession(st().team.id,{title:p.title.trim(),type:p.type,details:p.details.trim(),date:p.date||'',due:due<p.date?p.date:due});C().closeSheet();C().toast('Session posted');}
      catch(err){b.disabled=false;C().toast(friendly(err));}
    }
  });
}
function logSheet(){
  const {sheet,esc}=C(),s=sessions.find(x=>x.id===openSid);if(!s)return;
  const mine=(results[s.id]||[]).find(x=>x.uid===me.uid);
  let where=mine?mine.where:(s.date===today()?'team':'solo');const ty=TYPES[s.type]||TYPES.done;
  const draw=()=>`<h3>${esc(s.title)}</h3><p>${esc(s.details||'')}</p>
    <div class="seg" style="margin-bottom:6px"><button class="${where==='team'?'on':''}" data-tl-w="team">With the team</button><button class="${where==='solo'?'on':''}" data-tl-w="solo">On my own</button></div>
    ${s.type!=='done'?`<div class="field"><label for="tl-v">${ty.n}</label><input id="tl-v" inputmode="${s.type==='time'?'text':'decimal'}" placeholder="${ty.hint}" value="${mine&&mine.value!=null?(s.type==='time'?(mine.value<60?mine.value:fmtTime(mine.value)):mine.value):''}" style="font-size:24px"></div>`:''}
    <button class="big" data-tl="go" style="margin-top:8px">${s.type==='done'?'Tick it off':'Save result'}</button>
    ${mine?'<div style="text-align:center;margin-top:8px"><button class="link" data-tl="del">Remove my result</button></div>':''}`;
  sheet(draw(),async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tlW){const v=document.getElementById('tl-v');const keep=v?v.value:'';where=b.dataset.tlW;document.querySelector('#scrim .sheet').innerHTML='<div class="grab"></div>'+draw();const v2=document.getElementById('tl-v');if(v2)v2.value=keep;return;}
    if(b.dataset.tl==='del'){try{await backend().delResult(st().team.id,s.id);C().closeSheet();}catch(err){C().toast(friendly(err));}return;}
    if(b.dataset.tl==='go'){
      const pv=parseVal(s.type,(document.getElementById('tl-v')||{}).value);
      if(!pv){C().toast('Check that number: '+ty.hint);return;}
      const S=st();b.disabled=true;
      try{await backend().logResult(st().team.id,s.id,Object.assign({name:me.name,num:me.num||'',where},pv));C().closeSheet();C().toast('Result saved');}
      catch(err){b.disabled=false;C().toast(friendly(err));}
    }
  });
}
function memberSheet(uid){
  const {sheet,esc}=C(),m=members.find(x=>x.uid===uid);if(!m)return;
  sheet(`<h3>${esc(m.name)}${m.num?' · #'+esc(m.num):''}</h3><p>${m.role==='coach'?'Coach':'Player'}</p>
    ${m.role!=='coach'?'<button class="opt" data-tm="promote"><b>Make a coach</b><small>They can approve players and post sessions. Good to have a second coach in case a phone is lost.</small></button>':''}
    <button class="opt" data-tm="remove"><b>Remove from team</b><small>Their past results stay on the boards.</small></button>`,async e=>{
      const b=e.target.closest('[data-tm]');if(!b)return;
      try{if(b.dataset.tm==='promote')await backend().promote(st().team.id,uid);else await backend().remove(st().team.id,uid,m.role==='coach');C().closeSheet();}
      catch(err){C().toast(friendly(err));}
    });
}

/* ---------------- Clicks ---------------- */
async function click(btn){
  const a=btn.dataset.t,id=btn.dataset.id,T=st().team;
  if(a==='retry'){status='off';connect();}
  else if(a==='join')joinSheet();
  else if(a==='create')createSheet();
  else if(a==='open'){openSid=id;watchRecent();C().render();scrollTo(0,0);}
  else if(a==='back'){openSid=null;C().render();scrollTo(0,0);}
  else if(a==='log')logSheet();
  else if(a==='newsession')sessionSheet();
  else if(a==='member')memberSheet(id);
  else if(a==='approve'){try{await backend().approve(T.id,id);}catch(e){C().toast(friendly(e));}}
  else if(a==='reject'){try{await backend().remove(T.id,id,false);}catch(e){C().toast(friendly(e));}}
  else if(a==='share'){const txt='Join our team "'+team.name+'" on Full Season. Team code: '+team.code;
    try{if(navigator.share)await navigator.share({text:txt});else{await navigator.clipboard.writeText(txt);C().toast('Copied: '+team.code);}}catch(e){}}
  else if(a==='delsession'){C().confirm('Delete this session?','All results for it are removed from the board.','Delete',async()=>{try{await backend().delSession(T.id,openSid);openSid=null;C().render();}catch(e){C().toast(friendly(e));}});}
  else if(a==='leave'){C().confirm('Leave the team?','You can rejoin later with the code (your coach approves you again).','Leave team',async()=>{try{await backend().leave(T.id);}catch(e){}const S=st();S.team=null;C().save();stopAll();status='none';C().render();});}
}
window.TeamUI={view,click,inDetail:()=>!!openSid&&status==='live',parseVal,state:()=>({status,team,me,members,sessions,results})};
})();
