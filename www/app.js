(function(){
"use strict";
const {BANDS,bandFor,EXPERIENCE,PHASES,phaseOf,EX,CAT,SPORTS,SPORT_ORDER,SAFE}=window.PSB;

/* ---------------- State ---------------- */
const KEY='rb-preseason-v1';
const DEFAULT={v:2,name:'',num:'',start:'2026-11-23',sound:true,voice:true,buzz:true,
  sport:'',age:0,exp:'some',growth:false,parentOk:false,
  rest:{round:60,trans:15,hill:60,skip:30},
  slots:{},adj:{},log:{},stats:{sets:0,sprints:0,cond:0,skills:0,swaps:0},sunMode:{},seenMedals:[],onboarded:false,
  season:{on:false,start:'',weeks:18,train:[1,3],game:5,trainMin:90,gameMin:60},ilog:{}};
let S=load();
function load(){
  try{const raw=localStorage.getItem(KEY);if(raw){return migrate(JSON.parse(raw));}}catch(e){}
  return clone(DEFAULT);
}
function clone(o){return JSON.parse(JSON.stringify(o));}
/* Version 1 was footy-only. Keep the season's results and stats, move them to Aussie Rules, and ask for age on next open. */
function migrate(o){
  if(!o.v){
    const st=o.stats||{};
    o.stats={sets:st.sets||0,sprints:st.hills||0,cond:st.skips||0,skills:0,swaps:st.swaps||0};
    o.slots={};o.adj={};
    if(o.onboarded)o.sport='afl';
    o.v=2;
  }
  return deepMerge(clone(DEFAULT),o);
}
function deepMerge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object')deepMerge(a[k],b[k]);else a[k]=b[k];}return a;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

const T=()=>SPORTS[S.sport]||SPORTS.afl;
const age=()=>Math.max(6,Math.min(18,S.age||12));
const band=()=>bandFor(age());
const xmul=()=>(EXPERIENCE[S.exp]||EXPERIENCE.some).mul;
const isMini=()=>band().id==='mini';
const plural=w=>/(x|s)$/.test(w)?w+'es':w+'s';

/* ---------------- Theme ---------------- */
function applyTheme(){
  const t=T(),r=document.documentElement.style;
  r.setProperty('--red',t.pri);r.setProperty('--red-deep',t.deep);r.setProperty('--abyss',t.abyss);
  r.setProperty('--gold',t.acc);r.setProperty('--on',t.on);r.setProperty('--hero1',t.hero1||t.pri);r.setProperty('--rest',t.rest||'#31c374');
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content='#0c0a0b';
}

/* ---------------- Dates ---------------- */
function parseD(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
const DOFF={mon:0,wed:2,sat:5,sun:6};
function dayDate(w,day){return addDays(parseD(S.start),(w-1)*7+DOFF[day]);}
function fmt(d){return d.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'});}
function currentWeek(){const t=new Date();t.setHours(0,0,0,0);const diff=Math.floor((t-parseD(S.start))/864e5);return Math.min(8,Math.max(1,Math.floor(diff/7)+1));}
let viewWeek=currentWeek();

/* ---------------- Exercises: age gating and amounts ---------------- */
/* Walk down to an exercise this age is ready for; 6-8 year olds get the playful version of each movement. */
function resolve(k){
  let g=0;
  while(EX[k]&&EX[k].min>age()&&EX[k].sub&&g++<6)k=EX[k].sub;
  if(isMini()&&!EX[k].kid){const alt=Object.keys(EX).find(x=>EX[x].cat===EX[k].cat&&EX[x].kid);if(alt)k=alt;}
  return k;
}
const allowed=k=>EX[k]&&EX[k].min<=age();
function slotDefault(slot){const [b,i]=slot.split('-');const list=b==='a'?T().circuit:T().bonus;return list[+i];}
function slotKey(slot){return S.sport+':'+slot;}
/* Resolve a whole circuit so no exercise appears twice after age substitutions. */
function circuitList(pre){
  const defs=pre==='a'?T().circuit:T().bonus,used=new Set(),out=[];
  defs.forEach((d,i)=>{const u=S.slots[slotKey(pre+'-'+i)];if(u&&allowed(u)){out[i]=u;used.add(u);}});
  defs.forEach((d,i)=>{
    if(out[i])return;
    let k=resolve(d);
    if(used.has(k)){
      const ok=x=>allowed(x)&&!used.has(x)&&(!isMini()||EX[x].kid);
      const pick=c=>Object.keys(EX).find(x=>EX[x].cat===c&&ok(x));
      k=pick(EX[d].cat)||pick(EX[k].cat)||['core','land','prev','hips','legs'].map(pick).find(Boolean)||k;
    }
    out[i]=k;used.add(k);
  });
  return out;
}
function exOf(slot){const [pre,i]=slot.split('-');return circuitList(pre)[+i];}
const A_SLOTS=[0,1,2,3,4,5,6,7].map(i=>'a-'+i),C_SLOTS=['c-0','c-1','c-2'];
function rounds(w,lite){const r=band().rounds[phaseOf(w)];return lite?Math.max(1,r-1):r;}
const r5=v=>Math.round(v/5)*5;
function amountFor(slot,w,lite){
  const k=exOf(slot),e=EX[k],b=band(),f=PHASES[phaseOf(w)].f*xmul()*(lite?.8:1);
  let v;
  if(e.t==='time')v=Math.min(90,Math.max(10,r5(e.a*b.tmul*f)));
  else v=Math.max(e.plyo?3:4,Math.round(e.a*b.mul*f));
  if(S.growth&&(e.plyo||e.cat==='power'))v=e.t==='time'?Math.max(10,r5(v*.6)):Math.max(2,Math.round(v*.6));
  const adj=S.adj[slotKey(slot)]||0;
  v+=adj;
  if(e.cap)v=Math.min(v,e.cap);
  /* Jump contacts in the main circuit stay under the age limit (lower again in a growth spurt). */
  if(e.plyo&&slot[0]==='a'){
    const n=A_SLOTS.filter(s=>EX[exOf(s)].plyo).length,rr=rounds(w,lite);
    const cap=Math.floor(b.plyo*(S.growth?.6:1)/(rr*n*(e.each?2:1)));
    v=Math.min(v,Math.max(2,cap));
  }
  return Math.max(e.t==='time'?10:1,v);
}
function amtLabel(e,a){
  if(e.t==='time')return {v:a,u:e.each?'sec each':'sec'};
  return {v:a,u:e.each?('each '+e.each):'reps'};
}
function sunMode(w){return S.sunMode[w]||(T().mode==='swim'?(w%2===1?'swim':'ride'):'field');}
function skillAt(i){const s=T().skills;return s[((i%s.length)+s.length)%s.length];}

/* ---------------- Sessions ---------------- */
function buildSession(day,w,opt){
  opt=opt||{};
  const t=T(),b=band(),p=phaseOf(w),mini=isMini(),lite=!!opt.lite,R=S.rest,blocks=[];
  const W=(name,dur,cue,extra)=>Object.assign({k:'work',name,dur,cue:cue||''},extra||{});
  const Rs=(name,dur,cue,extra)=>Object.assign({k:'rest',name,dur,cue:cue||''},extra||{});
  const cool=()=>({name:'Cool-down',steps:[W('Walk + stretch',mini?120:180,'Walk easy, then stretch calves, hamstrings, quads and hips. 20 seconds each.')]});
  const exSteps=(slot,arr,extra)=>{
    const k=exOf(slot),e=EX[k],a=amountFor(slot,w,lite);
    const cue=e.cue+(p===3&&b.tempo&&e.t==='reps'&&!e.plyo&&e.cat!=='prev'?' Lower slowly: 3 seconds down.':'');
    if(e.t==='time'){
      if(e.each){const sides=e.each==='leg'?['left leg','right leg']:['left','right'];arr.push(W(e.n+' · '+sides[0],a,cue,extra));arr.push(Rs('Switch sides',5,'Swap to the other side.'));arr.push(W(e.n+' · '+sides[1],a,cue,extra));}
      else arr.push(W(e.n,a,cue,extra));
    } else arr.push(Object.assign({k:'reps',name:e.n,reps:a,unit:e.each?('each '+e.each):'reps',cue},extra||{}));
  };
  const circuit=(slots,rr,name)=>{
    const cs=[Rs('Set up',mini?30:45,'Grab water. Find a flat spot.')];
    for(let r=1;r<=rr;r++){
      slots.forEach((slot,i)=>{
        exSteps(slot,cs,{count:'set',round:r,rounds:rr});
        if(i<slots.length-1)cs.push(Rs('Quick breather',mini?Math.max(R.trans,20):R.trans,'',{nextSlot:slots[i+1],round:r,rounds:rr}));
        else if(r<rr)cs.push(Rs('Round break',R.round,'Drink some water. Next round coming.',{round:r,rounds:rr}));
      });
    }
    return {name,steps:cs,rounds:rr,slots};
  };
  const skip=n=>{const st=[];const d=mini?20:30;for(let i=1;i<=n;i++){st.push(W('Skip '+i+'/'+n,d,'Light bounces, wrists turn the rope.',{count:'cond'}));if(i<n)st.push(Rs('Rest',R.skip,'Shake out the arms.'));}return st;};
  const sprintScale=b.sprint*(S.growth?.75:1)*(lite?.7:1);
  const rot=opt.rot!=null?opt.rot:(w-1);

  if(day==='sat'){
    const wu=[W('Easy jog',mini?120:180,'Nice and easy. Loosen up.')].concat(t.wu.map(x=>W(x[0],x[1],x[2])));
    if(mini)wu.push(W('Run and freeze',60,'Jog around. Every few seconds, freeze like a statue!'));
    else for(let i=1;i<=3;i++){wu.push(W('Build-up stride '+i+'/3',20,'Start at jog pace, finish at 80%.'));if(i<3)wu.push(Rs('Walk back',40,'Easy walk back to the start.'));}
    blocks.push({name:'Warm-up',steps:wu});
    const sp=[Rs('Set up',45,'Mark out your space. Cones, a hill or lines on a court.')];
    t.speed.forEach((d,di)=>{
      const n=Math.max(2,Math.round(d.reps[p]*sprintScale)),dur=mini?Math.max(3,Math.round(d.d*.7)):d.d;
      const rest=Math.max(R.hill,r5(dur*5*b.rest));
      for(let i=1;i<=n;i++){
        sp.push(W(d.n+' '+i+'/'+n,dur,d.cue,{count:'sprint'}));
        const last=i===n&&di===t.speed.length-1;
        if(!last)sp.push(Rs(i===n?'Set up for the next drill':(d.restN||'Walk back'),rest,i===n?'Full recovery. Next drill coming.':'Walk back slowly. Full recovery so every rep is fast.'));
      }
    });
    blocks.push({name:mini?'Speed games':'Speed',steps:sp});
    blocks.push(circuit(A_SLOTS,rounds(w,lite),mini?'Fun circuit':'Strength circuit'));
    blocks.push(cool());
    return {day,w,lite,title:t.afl?'Hills + Strength':'Speed + Strength',sub:'Fast feet first, then a bodyweight strength circuit.',blocks};
  }
  if(day==='sun'){
    const mode=sunMode(w);
    blocks.push({name:'Warm-up',steps:[W('Easy jog',mini?120:180,'Nice and easy.'),W(t.wu[0][0],t.wu[0][1],t.wu[0][2])]});
    const sk=[];
    const nsk=mini?2:3;
    for(let j=0;j<nsk;j++){const s=skillAt(rot*nsk+j);sk.push(W(s[0],b.skillT,s[1],{count:'skill'}));if(j<nsk-1)sk.push(Rs('Reset',20,'Grab the ball. Next skill.'));}
    blocks.push({name:'Skills',steps:sk});
    const cs=[],cm=b.cond*(lite?.7:1)*(S.growth?.85:1);
    if(mode==='swim'){
      const n=Math.max(4,Math.round([8,9,7,10][p]*cm)),len=mini?25:50;
      cs.push(W('Easy laps',180,'Any stroke, nice and relaxed.'));
      for(let i=1;i<=n;i++){cs.push({k:'reps',name:'Swim '+len+' m · '+i+'/'+n,reps:len,unit:'metres',cue:'Solid pace. Tap DONE when you touch the wall.',count:'cond'});if(i<n)cs.push(Rs('Rest at the wall',mini?45:30,'Catch your breath.'));}
      cs.push(W('Easy laps',mini?120:240,'Slow and smooth.'));
      blocks.push({name:'Swim',steps:cs});
    } else if(mode==='ride'){
      const m=Math.min(mini?25:45,Math.max(15,r5([35,40,30,45][p]*cm)));
      cs.push(W('Easy spin',300,'Warm up the legs. Low gear.'));
      cs.push(W('Steady ride',m*60,'Talk test: you can still say short sentences. Add any hills you find.',{count:'cond'}));
      blocks.push({name:'Ride',steps:cs});
    } else {
      const c=t.cond,n=Math.max(3,Math.round(c.reps[p]*cm)),wk=mini?Math.max(5,Math.round(c.w*.7)):c.w,rs=r5(c.r*b.rest);
      const aero={mini:0,junior:8,teen:10,senior:12}[b.id];
      if(aero){cs.push(W('Steady run',Math.round(aero*PHASES[p].f*(lite?.7:1))*60,'Talk test: you can still say short sentences. Steady, not fast.',{count:'cond'}));cs.push(Rs('Walk and sip water',90,'Intervals next.'));}
      for(let i=1;i<=n;i++){cs.push(W(c.n+' '+i+'/'+n,wk,c.cue,{count:'cond'}));if(i<n)cs.push(Rs('Recover',rs,'Walk and breathe. Get ready to go again.'));}
      blocks.push({name:'Conditioning',steps:cs});
    }
    if(t.skip&&mode!=='field')blocks.push({name:'Skipping finisher',steps:[Rs('Grab the rope',45,'Water, then rope ready.')].concat(skip(Math.min(8,Math.max(3,Math.round([6,8,5,10][p]*b.cond)))))});
    blocks.push(cool());
    const lab=mode==='swim'?'Swim':mode==='ride'?'Ride':'Engine';
    return {day,w,lite,mode,title:lab+' + Skills',sub:'Skills while you\'re fresh, then build your engine.',blocks};
  }
  if(day==='strength'){
    blocks.push({name:'Warm-up',steps:[W('Easy jog',120,'Nice and easy.')].concat(t.wu.map(x=>W(x[0],x[1],x[2])))});
    const d=t.speed[0],n=mini?3:4,dur=mini?Math.max(3,Math.round(d.d*.7)):Math.min(d.d,10),rest=Math.max(R.hill,r5(dur*5*b.rest)),sp=[];
    for(let i=1;i<=n;i++){sp.push(W(d.n+' '+i+'/'+n,dur,d.cue+' Sharp, not exhausting.',{count:'sprint'}));if(i<n)sp.push(Rs('Walk back',rest,'Full recovery.'));}
    blocks.push({name:'Speed touch',steps:sp});
    blocks.push(circuit(A_SLOTS,Math.min(2,rounds(1,lite)),mini?'Fun circuit':'Strength circuit'));
    blocks.push(cool());
    return {day,w,lite,title:'Strength Top-Up',sub:'One session a week keeps your pre-season strength and speed through the season.',blocks};
  }
  if(day==='recovery'){
    blocks.push({name:'Easy movement',steps:[W('Easy walk, ride or swim',mini?600:900,'Really easy. You should be able to chat the whole time.')]});
    blocks.push({name:'Mobility',steps:[W('Hip openers',60,'Open the gate both ways, slow and controlled.'),W('Leg swings',60,'Front-to-back and side-to-side, gently.'),
      W('Cat-cow + child\'s pose',60,'On all fours, round and arch the back, then sit back and breathe.'),W('Calf + hamstring stretch',90,'45 seconds each side. No bouncing.'),W('Quad + hip flexor stretch',90,'45 seconds each side.')]});
    return {day,w,lite,title:'Recovery',sub:'The day after the game. Easy movement and stretching to help the legs bounce back.',blocks};
  }
  if(day==='primer'){
    blocks.push({name:'Warm-up',steps:[W('Easy jog',120,'Nice and easy.'),W(t.wu[0][0],t.wu[0][1],t.wu[0][2])]});
    const sk=[];[0,1].forEach(j=>{const x=skillAt(rot*2+j);sk.push(W(x[0],Math.round(b.skillT*.6/5)*5,x[1],{count:'skill'}));if(j===0)sk.push(Rs('Reset',20,'Next skill.'));});
    blocks.push({name:'Skills',steps:sk});
    const d=t.speed[0],dur=Math.min(d.d,6),sp=[];
    for(let i=1;i<=3;i++){sp.push(W('Sharp start '+i+'/3',dur,'About 80% effort. Quick and fresh, not tiring.',{count:'sprint'}));if(i<3)sp.push(Rs('Walk back',45,'Easy.'));}
    blocks.push({name:'Sharp starts',steps:sp});
    return {day,w,lite,title:'Game Primer',sub:'Short and sharp the day before a game. Finish feeling fresh, not tired.',blocks};
  }
  if(day==='wed'){
    const s=skillAt(rot*2+2);
    blocks.push({name:'Skill',steps:[W(s[0],b.skillT,s[1],{count:'skill'})]});
    if(t.skip)blocks.push({name:'Skipping',steps:skip(Math.max(3,Math.round(6*b.cond)))});
    const c=circuit(C_SLOTS,2,'Body armour');c.steps[0]=Rs('Get down for the floor work',20,'Find a soft spot.');
    blocks.push(c);
    return {day,w,lite,title:'Skills + Body Armour',sub:'Optional bonus at home. Injury-proofing and a skill.',blocks};
  }
  return null;
}
function flatSteps(sess){const out=[];sess.blocks.forEach(b=>b.steps.forEach(s=>out.push(Object.assign({block:b.name},s))));return out;}
function estMin(sess){let t=0;flatSteps(sess).forEach(s=>{t+=s.k==='reps'?(s.unit==='metres'?(s.reps>25?60:35):s.reps*(s.unit.startsWith('each')?6:3)+5):s.dur;});return Math.round(t/60);}

/* ---------------- Scoring ---------------- */
const MEDALS=(N)=>{N=N||8;const t=T(),wk=(inSeason()?'week':t.week).toLowerCase();return [
  {id:'first',n:'First Session',d:'Finish your first session',m:'1',ok:s=>s.sessions>=1},
  {id:'mixer',n:'Mixed It Up',d:'Swap an exercise',m:'⇄',ok:s=>s.swaps>=1},
  {id:'speed',n:'Speed Demon',d:'Run 40 sprints',m:'40',ok:s=>s.sprints>=40},
  {id:'engine',n:'Big Engine',d:'Finish 60 conditioning efforts',m:'60',ok:s=>s.cond>=60},
  {id:'iron',n:'Iron Body',d:'Complete 100 circuit sets',m:'100',ok:s=>s.sets>=100},
  {id:'skill',n:'Skill Master',d:'Finish 20 skill blocks',m:'20',ok:s=>s.skills>=20},
  {id:'full',n:'Full Week',d:'Club, bonus and both sessions in one '+wk,m:'4',ok:s=>s.fullWeek},
  {id:'run',n:'Winning Run',d:'Win 3 '+plural(wk)+' in a row',m:'3W',ok:s=>s.bestRun>=3},
  {id:'half',n:'Halfway',d:'Win '+wk+' 4',m:'4',ok:s=>s.won4},
  {id:'flag',n:t.title,d:'Win all '+N+' '+plural(wk),m:String(N),ok:s=>s.wins>=N}
];};
const LEVEL_FR=[0,.1,.25,.4,.58,.76,.93];
function logKey(w,day){return w+'-'+day;}
function isDone(w,day){return !!S.log[logKey(w,day)];}
function weekResult(w){const a=isDone(w,'sat'),b=isDone(w,'sun');return a&&b?'W':(a||b?'D':'');}
function derived(){
  if(inSeason())return derivedIn();
  const t=T();
  let big=0,small=0,wins=0,run=0,best=0,fullWeek=false,sessions=0;
  for(let w=1;w<=8;w++){
    ['sat','sun'].forEach(d=>{if(isDone(w,d)){big++;sessions++;}});
    ['mon','wed'].forEach(d=>{if(isDone(w,d)){small++;if(d==='wed')sessions++;}});
    if(weekResult(w)==='W'){wins++;run++;best=Math.max(best,run);}else run=0;
    if(['mon','wed','sat','sun'].every(d=>isDone(w,d)))fullWeek=true;
  }
  const st=Object.assign({},S.stats,{sessions,wins,bestRun:best,fullWeek,won4:weekResult(4)==='W'});
  const ML=MEDALS(8),medals=ML.filter(m=>m.ok(st)).map(m=>m.id);
  small+=medals.length;
  const pts=big*t.bigP+small*t.smallP,max=16*t.bigP+(16+ML.length)*t.smallP;
  const LV=t.levels.map((n,i)=>[Math.round(LEVEL_FR[i]*max),n]);
  let li=0;LV.forEach((l,i)=>{if(pts>=l[0])li=i;});
  const nextL=LV[li+1];
  const frac=nextL?(pts-LV[li][0])/(nextL[0]-LV[li][0]):1;
  return {big,small,pts,medals,level:LV[li][1],next:nextL,frac,wins,sessions};
}

/* ---------------- In-season ----------------
   Built around the team's own schedule. Basis: one strength session a week maintains pre-season strength
   and speed in-season (Ronnestad 2011); keep hard work out of the 48 h before a game; easy recovery the day
   after; at least 2 rest days; weekly organised sport hours no more than age in years. */
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const inSeason=()=>!!(S.season&&S.season.on&&S.season.start);
const APP_TYPES={strength:1,recovery:1,primer:1,skills:1};
function iDate(w,dow){return addDays(parseD(S.season.start),(w-1)*7+dow);}
function seasonWeek(){const t=new Date();t.setHours(0,0,0,0);const diff=Math.floor((t-parseD(S.season.start))/864e5);return Math.min(S.season.weeks,Math.max(1,Math.floor(diff/7)+1));}
let viewIWeek=1;
function sessIn(type,opt){return buildSession(type==='skills'?'wed':type,1,Object.assign({rot:viewIWeek-1},opt||{}));}
function planWeek(){
  const sc=S.season,b=band(),G=sc.game,notes=[];
  const plan=Array.from({length:7},(_,d)=>({dow:d,type:'rest'}));
  sc.train.forEach(d=>{plan[d].type='team';});
  if(G>=0)plan[G].type='game';
  const free=d=>plan[d].type==='rest';
  const until=d=>G<0?7:((G-d+7)%7);
  if(G>=0&&free((G+1)%7))plan[(G+1)%7]={dow:(G+1)%7,type:'recovery',opt:true};
  const want=b.id==='senior'?2:1;let placed=[];
  for(let n=0;n<want;n++){
    const c=[0,1,2,3,4,5,6].filter(d=>free(d)&&until(d)>=2&&!placed.some(x=>Math.abs(x-d)<=1||Math.abs(x-d)>=6));
    c.sort((a,z)=>until(z)-until(a)||a-z);
    if(c.length){plan[c[0]]={dow:c[0],type:'strength'};placed.push(c[0]);}
  }
  if(!placed.length)notes.push('No free day at least 2 days before the game, so there\'s no strength top-up this week. Team training will keep you going.');
  if(G>=0&&free((G+6)%7))plan[(G+6)%7]={dow:(G+6)%7,type:'primer',opt:true};
  else{const c=[0,1,2,3,4,5,6].find(d=>free(d)&&until(d)>=2);if(c!=null)plan[c]={dow:c,type:'skills',opt:true};}
  /* At least 2 easy days (rest or recovery). */
  const easy=()=>plan.filter(x=>x.type==='rest'||x.type==='recovery').length;
  const drop=(types,why)=>{for(const ty of types){if(easy()>=2&&!why.load)return;const x=plan.find(q=>q.type===ty);if(x){notes.push(why.msg(x));plan[x.dow]={dow:x.dow,type:'rest'};}}};
  if(easy()<2)drop(['skills','primer'],{msg:x=>'Dropped the '+DAYL[x.dow]+' bonus session so you still get 2 easy days.'});
  if(easy()<2&&placed.length>1){const x=plan[placed[1]];notes.push('Only one strength top-up this week so you still get 2 easy days.');plan[x.dow]={dow:x.dow,type:'rest'};}
  /* Weekly load cap: organised sport hours no more than age in years. */
  const cap=age()*60;
  const load=()=>plan.reduce((a,x)=>a+(x.type==='team'?sc.trainMin:x.type==='game'?sc.gameMin:APP_TYPES[x.type]?estMin(sessIn(x.type)):0),0);
  for(const ty of ['skills','primer','strength']){
    if(load()<=cap)break;
    const xs=plan.filter(q=>q.type===ty);const x=xs[xs.length-1];
    if(x&&!(ty==='strength'&&plan.filter(q=>q.type==='strength').length<2)){notes.push('Dropped the '+DAYL[x.dow]+' session to keep your week under '+age()+' hours.');plan[x.dow]={dow:x.dow,type:'rest'};}
  }
  if(load()>cap)notes.push('Team training and games already add up to more than '+age()+' hours a week, the guide for age '+age()+'. Worth a chat with your coach about rest.');
  return {plan,notes,load:load(),cap};
}
const TYPE_NAME={team:'Team training',game:'Game day',strength:'Strength Top-Up',recovery:'Recovery',primer:'Game Primer',skills:'Skills + Body Armour',rest:'Rest'};
function iKey(w,dow){return w+'-'+dow;}
function iDone(w,dow){return !!S.ilog[iKey(w,dow)];}
function iResult(w,plan){const st=plan.filter(x=>x.type==='strength');const any=plan.some(x=>x.type!=='rest'&&iDone(w,x.dow));if(st.length&&st.every(x=>iDone(w,x.dow)))return 'W';return any?'D':'';}
function derivedIn(){
  const t=T(),{plan}=planWeek(),N=S.season.weeks;
  let big=0,small=0,wins=0,run=0,best=0,fullWeek=false,sessions=0;
  for(let w=1;w<=N;w++){
    plan.forEach(x=>{if(x.type!=='rest'&&iDone(w,x.dow)){if(x.type==='strength')big++;else small++;if(APP_TYPES[x.type])sessions++;}});
    const r=iResult(w,plan);if(r==='W'){wins++;run++;best=Math.max(best,run);}else run=0;
    if(plan.every(x=>x.type==='rest'||iDone(w,x.dow)))fullWeek=fullWeek||plan.some(x=>x.type!=='rest'&&iDone(w,x.dow));
  }
  const st=Object.assign({},S.stats,{sessions,wins,bestRun:best,fullWeek,won4:iResult(4,plan)==='W'});
  const ML=MEDALS(N),medals=ML.filter(m=>m.ok(st)).map(m=>m.id);
  small+=medals.length;
  const nBig=Math.max(1,plan.filter(x=>x.type==='strength').length),nSmall=plan.filter(x=>x.type!=='rest'&&x.type!=='strength').length;
  const pts=big*t.bigP+small*t.smallP,max=N*(nBig*t.bigP+nSmall*t.smallP)+ML.length*t.smallP;
  const LV=t.levels.map((n,i)=>[Math.round(LEVEL_FR[i]*max),n]);
  let li=0;LV.forEach((l,i)=>{if(pts>=l[0])li=i;});
  const nextL=LV[li+1],frac=nextL?(pts-LV[li][0])/(nextL[0]-LV[li][0]):1;
  return {big,small,pts,medals,level:LV[li][1],next:nextL,frac,wins,sessions,weeks:N};
}

/* ---------------- Native (Android app) bridge ---------------- */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const NP=NATIVE?(window.Capacitor.Plugins||{}):{};
let notifReady=false;
async function prepNotifs(){
  if(!NATIVE||!NP.LocalNotifications||notifReady)return;
  try{
    const p=await NP.LocalNotifications.requestPermissions();
    if(p&&p.display==='granted'){
      try{await NP.LocalNotifications.createChannel({id:'timer',name:'Workout timer',description:'Alerts when a timer ends',importance:5,visibility:1,vibration:true});}catch(e){}
      notifReady=true;
    }
  }catch(e){}
}
async function cancelNotifs(){
  if(!notifReady)return;
  try{const pend=await NP.LocalNotifications.getPending();if(pend&&pend.notifications&&pend.notifications.length)await NP.LocalNotifications.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});}catch(e){}
}
async function scheduleAhead(){
  if(!notifReady||!P||P.paused)return;
  const s=cur();if(s.k==='reps')return;
  let t=Date.now()+Math.max(0,(s.dur-elapsed()))*1000;
  const list=[];
  for(let j=P.i+1;j<P.steps.length&&list.length<40;j++){
    const n=P.steps[j];
    const body=n.k==='reps'?(n.name+' · '+n.reps+' '+n.unit+'. Open the app and tap Done.'):(n.name+' · '+fmtT(n.dur));
    list.push({id:2000+j,title:n.k==='rest'?'Rest':'Go!',body,channelId:'timer',schedule:{at:new Date(t),allowWhileIdle:true},smallIcon:'ic_stat_ball',iconColor:T().pri});
    if(n.k==='reps')break;
    t+=n.dur*1000;
  }
  if(list.length===0||P.i===P.steps.length-1){list.push({id:2999,title:'Session finished!',body:'Open the app to bank your '+T().bigW.toLowerCase()+'.',channelId:'timer',schedule:{at:new Date(t),allowWhileIdle:true},smallIcon:'ic_stat_ball'});}
  try{await NP.LocalNotifications.schedule({notifications:list});}catch(e){}
}

/* ---------------- Audio, voice, buzz ---------------- */
let AC=null;
function audio(){if(!S.sound)return null;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}return AC;}
function beep(f,len,vol){const a=audio();if(!a)return;try{const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(vol||.12,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+len);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+len);}catch(e){}}
function siren(){const a=audio();if(!a)return;try{const o=a.createOscillator(),g=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(330,a.currentTime);o.frequency.linearRampToValueAtTime(520,a.currentTime+1.2);g.gain.setValueAtTime(.14,a.currentTime);g.gain.linearRampToValueAtTime(.0001,a.currentTime+1.6);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+1.6);}catch(e){}}
function buzz(p){if(!S.buzz)return;if(NATIVE&&NP.Haptics){try{const d=Array.isArray(p)?p.filter((x,i)=>i%2===0).reduce((a,b)=>a+b,0):p;NP.Haptics.vibrate({duration:Math.min(800,d)});}catch(e){}return;}if(navigator.vibrate){try{navigator.vibrate(p);}catch(e){}}}
const LANG=/^en/.test(navigator.language||'')?navigator.language:'en-AU';
function say(t){if(!S.voice)return;if(NATIVE&&NP.TextToSpeech){try{NP.TextToSpeech.stop().catch(()=>{});NP.TextToSpeech.speak({text:t,lang:LANG,rate:1.0,pitch:1.0,volume:1.0,category:'playback'}).catch(()=>{});}catch(e){}return;}if(!window.speechSynthesis)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=LANG;u.rate=1.05;speechSynthesis.speak(u);}catch(e){}}
let lock=null;
async function wake(on){if(NATIVE&&NP.KeepAwake){try{on?await NP.KeepAwake.keepAwake():await NP.KeepAwake.allowSleep();}catch(e){}return;}try{if(on&&'wakeLock' in navigator){lock=await navigator.wakeLock.request('screen');}else if(!on&&lock){await lock.release();lock=null;}}catch(e){}}

/* ---------------- Balls and fields ---------------- */
function ballG(kind){
  switch(kind){
    case 'afl':return '<ellipse rx="12" ry="7.8" fill="#c8102e" stroke="#fff" stroke-width="1.4"/><path d="M-5 0h10" stroke="#fff" stroke-width="1.3" stroke-dasharray="1.6 1.3"/>';
    case 'rugby':return '<ellipse rx="12" ry="7.8" fill="#e9dcc0" stroke="#7a6a4a" stroke-width="1.2"/><path d="M-3 -7.2v14.4M3 -7.2v14.4" stroke="#2563eb" stroke-width="2"/>';
    case 'gridiron':return '<ellipse rx="12" ry="7.4" fill="#7a3e1d" stroke="#3b1a08" stroke-width="1"/><path d="M-9 0a12 7.4 0 0 1 0 0M-5 0h10M-3 -2v4M0 -2v4M3 -2v4" stroke="#fff" stroke-width="1.2"/>';
    case 'soccer':return '<circle r="9.5" fill="#fff" stroke="#111" stroke-width="1"/><path d="M0 -3.6l3.4 2.5-1.3 4H-2.1l-1.3-4z" fill="#111"/><path d="M0 -3.6V-9.4M3.4-1.1l5.5-1.8M2.1 2.9l3.4 4.6M-2.1 2.9l-3.4 4.6M-3.4-1.1l-5.5-1.8" stroke="#111" stroke-width="1"/>';
    case 'basketball':return '<circle r="10" fill="#e8742a" stroke="#2a1405" stroke-width="1.1"/><path d="M-10 0h20M0-10v20M-7-7c4 3 4 11 0 14M7-7c-4 3-4 11 0 14" fill="none" stroke="#2a1405" stroke-width="1.1"/>';
    case 'netball':return '<circle r="10" fill="#fef9c3" stroke="#a16207" stroke-width="1"/><path d="M-10 0c6-4 14-4 20 0M-9 4c6-3 12-3 18 0M0-10c-3 6-3 14 0 20" fill="none" stroke="#e0187a" stroke-width="1.2"/>';
    case 'cricket':return '<circle r="8.5" fill="#b91c1c" stroke="#4a0808" stroke-width="1"/><path d="M-6-6c4 4 8 8 12 12" stroke="#fff" stroke-width="1.2" stroke-dasharray="1.5 1.2"/>';
    case 'baseball':return '<circle r="9.5" fill="#fff" stroke="#999" stroke-width="1"/><path d="M-6-7c3 4 3 10 0 14M6-7c-3 4-3 10 0 14" fill="none" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="1.6 1.2"/>';
    case 'volleyball':return '<circle r="10" fill="#fff" stroke="#1e3a8a" stroke-width="1"/><path d="M0-10c-2 6 2 10 8 12M0 0c-6 1-9 5-8 9M0 0c5-3 9-2 10 1" fill="none" stroke="#1d4ed8" stroke-width="1.4"/><path d="M-9-4c4-1 8 0 9 4" fill="none" stroke="#facc15" stroke-width="2"/>';
    case 'tennis':return '<circle r="8.5" fill="#d9f24a" stroke="#6b7a12" stroke-width="1"/><path d="M-8-3c4 2 4 6 0 8M8-5c-4 2-4 6 0 8" fill="none" stroke="#fff" stroke-width="1.5"/>';
    case 'puck':return '<ellipse rx="10" ry="10" fill="#111" stroke="#666" stroke-width="2"/>';
    case 'hockey':return '<circle r="7" fill="#fff" stroke="#9ca3af" stroke-width="1"/><circle cx="-2" cy="-2" r="1" fill="#cbd5e1"/><circle cx="2.5" cy="1" r="1" fill="#cbd5e1"/><circle cx="-1" cy="3" r="1" fill="#cbd5e1"/>';
  }
  return '<circle r="9" fill="#fff"/>';
}
const OVAL_BALL={afl:1,rugby:1,gridiron:1};
const ballIcon=(kind,size)=>`<svg viewBox="-13 -13 26 26" width="${size||22}" height="${size||22}" aria-hidden="true">${ballG(kind||T().ball)}</svg>`;

const RECT='M150 16H264Q278 16 278 30V330Q278 344 264 344H36Q22 344 22 330V30Q22 16 36 16Z';
const OVAL='M150 14A128 166 0 1 1 150 346A128 166 0 1 1 150 14Z';
const BG={grass:['#1d3a28','#0e1a13'],blue:['#1b3b6b','#0c1c33'],wood:['#5a3a1e','#2a1a0d'],net:['#1f4f6b','#0e2533'],volley:['#7a3b17','#2e1606'],tennis:['#1d4e89','#0b2343'],ice:['#26394a','#0f1a24']};
const FIELDS={
  oval:{track:OVAL,bg:'grass',deco:cy=>`<rect x="125" y="155" width="50" height="50"/><circle cx="150" cy="180" r="9"/><path d="M90 32 A70 62 0 0 0 210 32"/><path d="M90 328 A70 62 0 0 1 210 328"/><rect x="138" y="16" width="24" height="10"/><rect x="138" y="334" width="24" height="10"/>`,
    posts:`<path d="M140 14v-12M160 14v-12M132 15v-7M168 15v-7M140 346v12M160 346v12M132 345v7M168 345v7"/>`},
  cricket:{track:OVAL,bg:'grass',deco:()=>`<ellipse cx="150" cy="180" rx="82" ry="106" stroke-dasharray="4 5"/><rect x="138" y="140" width="24" height="80" fill="#c9b27a" fill-opacity=".35"/><path d="M134 150H166M134 210H166"/>`,
    posts:`<path d="M146 136v8M150 136v8M154 136v8M146 216v8M150 216v8M154 216v8"/>`},
  pitch:{track:RECT,bg:'grass',deco:()=>`<path d="M22 180H278"/><circle cx="150" cy="180" r="34"/><rect x="80" y="16" width="140" height="56"/><rect x="118" y="16" width="64" height="20"/><path d="M124 72A34 30 0 0 0 176 72"/><rect x="80" y="288" width="140" height="56"/><rect x="118" y="324" width="64" height="20"/><path d="M124 288A34 30 0 0 1 176 288"/>`,
    posts:`<path d="M133 16V7H167V16M133 344V353H167V344"/>`},
  rugby:{track:RECT,bg:'grass',deco:()=>`<path d="M22 180H278M22 40H278M22 320H278M22 92H278M22 268H278"/><path d="M22 148H278M22 212H278" stroke-dasharray="6 6"/>`,
    posts:`<path d="M138 40V12M162 40V12M138 30H162M138 320V348M162 320V348M138 330H162"/>`},
  gridiron:{track:RECT,bg:'grass',deco:()=>{let s='<rect x="22" y="16" width="256" height="32" fill="var(--red)" fill-opacity=".22" stroke="none"/><rect x="22" y="312" width="256" height="32" fill="var(--red)" fill-opacity=".22" stroke="none"/>';for(let i=0;i<=10;i++){const y=(48+i*26.4).toFixed(1);s+=`<path d="M22 ${y}H278"/>`;if(i<10)s+=`<path d="M120 ${(48+i*26.4+13.2).toFixed(1)}h8M172 ${(48+i*26.4+13.2).toFixed(1)}h8"/>`;}return s;},
    posts:`<path d="M150 16V4M140 4H160M150 344V356M140 356H160"/>`},
  hpitch:{track:RECT,bg:'blue',deco:()=>`<path d="M22 180H278M22 92H278M22 268H278"/><path d="M92 16A58 58 0 0 0 208 16"/><path d="M92 344A58 58 0 0 1 208 344"/><path d="M76 16A74 74 0 0 0 224 16M76 344A74 74 0 0 1 224 344" stroke-dasharray="5 5"/>`,
    posts:`<path d="M140 16V8H160V16M140 344V352H160V344"/>`},
  court:{track:RECT,bg:'wood',deco:()=>`<path d="M22 180H278"/><circle cx="150" cy="180" r="26"/><rect x="120" y="16" width="60" height="76"/><path d="M120 92A30 30 0 0 0 180 92"/><path d="M40 16V44A112 112 0 0 0 260 44V16"/><rect x="120" y="268" width="60" height="76"/><path d="M120 268A30 30 0 0 1 180 268"/><path d="M40 344V316A112 112 0 0 1 260 316V344"/>`,
    posts:`<path d="M138 26H162M138 334H162"/><circle cx="150" cy="33" r="6"/><circle cx="150" cy="327" r="6"/>`},
  netball:{track:RECT,bg:'net',deco:()=>`<path d="M22 125.3H278M22 234.7H278"/><circle cx="150" cy="180" r="12"/><path d="M86 16A64 64 0 0 0 214 16"/><path d="M86 344A64 64 0 0 1 214 344"/>`,
    posts:`<circle cx="150" cy="20" r="5"/><circle cx="150" cy="340" r="5"/>`},
  volley:{track:RECT,bg:'volley',deco:()=>`<path d="M22 125H278M22 235H278"/>`,posts:`<path d="M8 180H292" stroke-width="5"/><path d="M60 172V188M240 172V188" stroke="#ef4444"/>`},
  tennis:{track:RECT,bg:'tennis',deco:()=>`<path d="M54 16V344M246 16V344M54 92H246M54 268H246M150 92V268M150 16v8M150 344v-8"/>`,posts:`<path d="M8 180H292" stroke-width="4"/>`},
  rink:{track:'M150 16H218A60 60 0 0 1 278 76V284A60 60 0 0 1 218 344H82A60 60 0 0 1 22 284V76A60 60 0 0 1 82 16Z',bg:'ice',
    deco:()=>`<path d="M22 180H278" stroke="#ef4444" stroke-opacity=".7" stroke-width="3"/><path d="M22 120H278M22 240H278" stroke="#3b82f6" stroke-opacity=".8" stroke-width="3"/><path d="M38 46H262M38 314H262" stroke="#ef4444" stroke-opacity=".6"/><circle cx="150" cy="180" r="28" stroke="#3b82f6" stroke-opacity=".7"/><g stroke="#ef4444" stroke-opacity=".55"><circle cx="90" cy="84" r="22"/><circle cx="210" cy="84" r="22"/><circle cx="90" cy="276" r="22"/><circle cx="210" cy="276" r="22"/></g><path d="M136 46A14 14 0 0 0 164 46M136 314A14 14 0 0 1 164 314" stroke="#3b82f6" stroke-opacity=".8"/>`,
    posts:`<path d="M140 46V38H160V46M140 314V322H160V314" stroke="#ef4444"/>`},
  diamond:{track:'M150 318L268 200L150 82L32 200Z',bg:'grass',fill:'M150 342L6 198A204 204 0 0 1 294 198Z',
    deco:()=>`<path d="M150 336L4 190M150 336L296 190"/><path d="M150 330L282 200L150 68L18 200Z" fill="#7a5230" fill-opacity=".45" stroke="none"/><circle cx="150" cy="205" r="13" fill="#7a5230" fill-opacity=".55" stroke="none"/>`,
    posts:`<g fill="#f4efe6" stroke="none"><rect x="262" y="194" width="12" height="12" transform="rotate(45 268 200)"/><rect x="144" y="76" width="12" height="12" transform="rotate(45 150 82)"/><rect x="26" y="194" width="12" height="12" transform="rotate(45 32 200)"/><path d="M143 314H157V320L150 326L143 320Z"/></g>`}
};
let measuredFor='',trackLen=0;
function trackPoint(frac){
  const f=FIELDS[T().field],mp=document.getElementById('mpath');
  if(measuredFor!==T().field){mp.setAttribute('d',f.track);trackLen=mp.getTotalLength();measuredFor=T().field;}
  const L=trackLen*Math.min(1,Math.max(0,frac)),a=mp.getPointAtLength(L),b=mp.getPointAtLength(Math.min(trackLen,L+1));
  return {x:a.x,y:a.y,ang:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};
}
function fieldSVG(frac,mode){
  const t=T(),f=FIELDS[t.field],bg=BG[f.bg];
  const col=mode==='work'?t.pri:mode==='rest'?(t.rest||'#31c374'):'#f3b53f';
  const pt=trackPoint(frac),rot=OVAL_BALL[t.ball]?pt.ang:0;
  return `<svg viewBox="0 0 300 360" aria-hidden="true">
    <defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>
    <path d="${f.fill||f.track}" fill="url(#g)" opacity=".6"/>
    <g fill="none" stroke="rgba(244,239,230,.18)" stroke-width="1.6">${f.deco()}</g>
    <g fill="none" stroke="rgba(244,239,230,.55)" stroke-width="2.4" stroke-linecap="round">${f.posts||''}</g>
    <path d="${f.track}" fill="none" stroke="rgba(244,239,230,.10)" stroke-width="12" stroke-linejoin="round"/>
    <path d="${f.track}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="${(Math.min(1,Math.max(0,frac))*100).toFixed(2)} 100" style="filter:drop-shadow(0 0 8px ${col}88)"/>
    <g transform="translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${rot.toFixed(1)})">${ballG(t.ball)}</g>
  </svg>`;
}

/* ---------------- Icons & bits ---------------- */
const IC={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><ellipse cx="12" cy="12" rx="8" ry="10"/><path d="M12 2v20M4.5 8h15M4.5 16h15" opacity=".45"/></svg>',
  drills:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>',
  medals:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 2l2 6M16 2l-2 6"/><circle cx="12" cy="15" r="6"/></svg>',
  locker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 21V8a6 6 0 0112 0v13M6 21h12M10 12h4"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5L8 12l10 7zM5 5h2v14H5z"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5l10 7-10 7zM17 5h2v14h-2z"/></svg>',
  tick:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  shield:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>'
};
const nm=()=>S.name||'';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function jumperSVG(){return '<svg viewBox="0 0 52 56"><path d="M14 2l-12 9 6 9 5-3v37h26V17l5 3 6-9-12-9c-2 4-6 6-12 6S16 6 14 2z" fill="#151112" style="stroke:var(--red)" stroke-width="2"/><path d="M19 2.5c1.5 3 4 4.2 7 4.2s5.5-1.2 7-4.2" fill="none" style="stroke:var(--red)" stroke-width="2"/></svg>';}
const kicker=()=>(T().afl&&nm()?'Righto ':'Okay ');

/* ---------------- Views ---------------- */
let tab='home',detail=null,lastView='';
const root=document.getElementById('root');

function render(){
  applyTheme();
  const D=derived();
  const vk=(detail||'')+tab+viewWeek+S.sport,anim=vk!==lastView;lastView=vk;
  let html='<div class="app'+(anim?' enter':'')+'">';
  if(detail)html+=(detail.startsWith('i:')?detailIn(+detail.slice(2)):detailView(detail));
  else if(tab==='home')html+=board(D)+(inSeason()?homeIn(D):homeView(D));
  else if(tab==='drills')html+=drillsView();
  else if(tab==='medals')html+=medalsView(D);
  else html+=lockerView();
  html+='</div>';
  if(!detail)html+=navBar();
  root.innerHTML=html;
  if(!sheetOpen){if(!S.onboarded||!S.sport)openOnboard();else if(!S.age)openAbout(true);}
}
function board(D){
  const t=T(),name=S.name||'Champ',yr=parseD(S.start).getFullYear();
  const score=t.afl?`${D.big}<span>.</span>${D.small} <span style="color:var(--chalk)">(${D.pts})</span>`:`${D.pts}<span style="font-size:15px;color:var(--dim);letter-spacing:.04em"> PTS</span>`;
  const small=t.afl?'Season score':`${D.big} ${D.big===1?t.bigW:plural(t.bigW)} · ${D.small} ${D.small===1?t.smallW:plural(t.smallW)}`;
  return `<div class="board">
    <div class="jumper">${jumperSVG()}<b class="num">${esc(S.num||'—')}</b></div>
    <div class="who"><div class="disp">${esc(name)}</div><small>${inSeason()?'In-season '+parseD(S.season.start).getFullYear():'Pre-season '+yr}</small></div>
    <div class="score"><div class="disp num">${score}</div><small>${esc(small)}</small></div>
    <div class="lvl"><b>${D.level}</b><div class="bar"><i style="width:${Math.round(D.frac*100)}%"></i></div><span class="num">${D.next?(D.next[0]-D.pts)+' pts to '+D.next[1]:'Top rank!'}</span></div>
  </div>`;
}
function homeView(D){
  const t=T(),w=viewWeek,p=phaseOf(w),cw=currentWeek(),wk=t.week;
  const nextDay=['sat','sun'].find(d=>!isDone(w,d));
  let hero='';
  if(nextDay){
    const s=buildSession(nextDay,w);
    hero=`<div class="hero">
      <div class="tag">${nm()?esc(nm())+', you\'re up':'Next up'} · ${fmt(dayDate(w,nextDay))}</div>
      <h2 class="disp">${s.title}</h2>
      <p>${s.sub}</p>
      <div class="chips"><span class="chip">~${estMin(s)} min</span>${s.blocks.filter(b=>b.name!=='Cool-down').map(b=>`<span class="chip">${b.name}</span>`).join('')}</div>
      <button class="kick" data-open="${nextDay}">${ballIcon()} Let's go</button>
    </div>`;
  } else {
    hero=`<div class="hero"><div class="tag">${wk} ${w} result</div><h2 class="disp">${wk} won!</h2><p>Both main sessions done. ${w<8?wk+' '+(w+1)+' starts '+fmt(dayDate(w+1,'mon'))+'.':'That\'s the whole pre-season. '+t.title+'!'}</p>
      ${w<8?`<button class="kick" data-week="${w+1}">Go to ${wk.toLowerCase()} ${w+1}</button>`:''}</div>`;
  }
  const A=buildSession('sat',w),B=buildSession('sun',w),C=buildSession('wed',w);
  const fx=[['mon','Club training','With your team. Tick it off after.'],['wed',C.title,'Optional bonus · ~'+estMin(C)+' min'],['sat',A.title,'~'+estMin(A)+' min'],['sun',B.title,'~'+estMin(B)+' min']];
  const tip=t.tips[(w-1)%t.tips.length];
  return `
  <div class="round"><h1 class="disp">${wk} <em class="num">${w}</em></h1><div class="blk">${PHASES[p].weeks}<b>${PHASES[p].name}</b></div></div>
  ${w!==cw?`<div class="muted" style="margin:-4px 2px 10px;font-size:14px">Viewing ${wk.toLowerCase()} ${w}. <button class="link" data-week="${cw}">Back to this week</button></div>`:''}
  ${hero}
  <div class="sect"><h3>This ${wk.toLowerCase()}</h3><small>${fmt(dayDate(w,'mon'))} – ${fmt(dayDate(w,'sun'))}</small></div>
  <div class="fixture">${fx.map(([d,tt,s])=>{const done=isDone(w,d);
    const pill=done?'<span class="pill done">Done</span>':(d==='wed'?'<span class="pill opt">Bonus</span>':'<span class="pill todo">To play</span>');
    const dd=dayDate(w,d);
    return `<button class="fx ${done?'isdone':''}" data-open="${d}"><div class="day"><b>${dd.toLocaleDateString('en-AU',{weekday:'short'})}</b><small>${dd.getDate()} ${dd.toLocaleDateString('en-AU',{month:'short'})}</small></div><div><div class="t">${tt}</div><div class="s">${s}</div></div>${pill}</button>`;}).join('')}</div>
  <div class="sect"><h3>${t.table}</h3><small>${D.wins} of 8 won</small></div>
  <div class="ladder">${[1,2,3,4,5,6,7,8].map(r=>{const res=weekResult(r);return `<button class="rd ${res} ${r===cw?'cur':''} ${r===w?'sel':''}" data-week="${r}" aria-label="${wk} ${r}"><small>${wk.slice(0,2).toUpperCase()}</small><b class="num">${r}</b><small>${res||'·'}</small></button>`;}).join('')}</div>
  <div class="tip"><span>${ballIcon()}</span><div><b>${PHASES[p].name}:</b> ${PHASES[p].note} Win a ${wk.toLowerCase()} by finishing Saturday and Sunday. Each one is a ${t.bigW.toLowerCase()} (${t.bigP} points). Club training, the Wednesday bonus and medals are a ${t.smallW.toLowerCase()} (${t.smallP} point).</div></div>
  <div class="tip"><span>${IC.shield}</span><div><b>Train smart:</b> ${esc(tip)}</div></div>
  <div class="tip" style="background:var(--stand);border-color:var(--line)"><span>${ballIcon()}</span><div><b>Season starting?</b> Switch to in-season training, built around your team's training and game days. <button class="link" data-season-setup>Set up my season</button></div></div>`;
}
function nextMonday(){const t=new Date();t.setHours(0,0,0,0);const d=(8-((t.getDay()+6)%7))%7||7;return addDays(t,d);}
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function homeIn(D){
  const t=T(),w=viewIWeek,cw=seasonWeek(),{plan,notes,load,cap}=planWeek();
  const today=new Date();today.setHours(0,0,0,0);
  const apps=plan.filter(x=>APP_TYPES[x.type]&&!iDone(w,x.dow));
  const upcoming=apps.filter(x=>w>cw||(w===cw&&iDate(w,x.dow)>=today));
  const pick=upcoming.find(x=>x.type==='strength')||upcoming[0];
  let hero;
  if(pick){const s=sessIn(pick.type);
    hero=`<div class="hero"><div class="tag">${nm()?esc(nm())+', you\'re up':'Next up'} · ${fmt(iDate(w,pick.dow))}</div><h2 class="disp">${s.title}</h2><p>${s.sub}</p>
      <div class="chips"><span class="chip">~${estMin(s)} min</span>${pick.opt?'<span class="chip">Optional</span>':''}</div>
      <button class="kick" data-iopen="${pick.dow}">${ballIcon()} Let's go</button></div>`;}
  else hero=`<div class="hero"><div class="tag">Week ${w}</div><h2 class="disp">${iResult(w,plan)==='W'?'Week won!':'All set'}</h2><p>${w<S.season.weeks?'Week '+(w+1)+' starts '+fmt(iDate(w+1,0))+'.':'That\'s the season. '+t.title+'!'}</p>${w<S.season.weeks?`<button class="kick" data-iweek="${w+1}">Go to week ${w+1}</button>`:''}</div>`;
  const pillFor=(x,done)=>done?'<span class="pill done">Done</span>':x.type==='team'||x.type==='game'?'<span class="pill todo">Tick off</span>':x.opt?'<span class="pill opt">Optional</span>':'<span class="pill todo">To play</span>';
  const sub=x=>x.type==='team'?S.season.trainMin+' min with your team':x.type==='game'?'Play your best. Tick it off after.':x.type==='rest'?'Recover and grow':'~'+estMin(sessIn(x.type))+' min'+(x.type==='strength'?' · scores a '+t.bigW.toLowerCase():'');
  return `
  <div class="round"><h1 class="disp">Week <em class="num">${w}</em></h1><div class="blk">of ${S.season.weeks}<b>In-season</b></div></div>
  ${w!==cw?`<div class="muted" style="margin:-4px 2px 10px;font-size:14px">Viewing week ${w}. <button class="link" data-iweek="${cw}">Back to this week</button></div>`:''}
  ${hero}
  <div class="sect"><h3>This week</h3><small>${fmt(iDate(w,0))} – ${fmt(iDate(w,6))}</small></div>
  <div class="fixture">${plan.map(x=>{const dd=iDate(w,x.dow),done=x.type!=='rest'&&iDone(w,x.dow);
    if(x.type==='rest')return `<div class="fx" style="opacity:.55;padding:8px 12px"><div class="day" style="padding:4px 0"><b style="font-size:17px">${DAYS[x.dow]}</b></div><div><div class="t" style="font-size:18px">Rest</div></div><span></span></div>`;
    return `<button class="fx ${done?'isdone':''}" data-iopen="${x.dow}"><div class="day"><b>${DAYS[x.dow]}</b><small>${dd.getDate()} ${dd.toLocaleDateString('en-AU',{month:'short'})}</small></div><div><div class="t">${TYPE_NAME[x.type]}</div><div class="s">${sub(x)}</div></div>${pillFor(x,done)}</button>`;}).join('')}</div>
  ${notes.map(n=>`<div class="tip"><span>${IC.shield}</span><div>${esc(n)}</div></div>`).join('')}
  <div class="sect"><h3>Season</h3><small>${D.wins} of ${S.season.weeks} weeks won</small></div>
  <div class="ladder">${Array.from({length:S.season.weeks},(_,i)=>i+1).map(r=>{const res=iResult(r,plan);return `<button class="rd ${res} ${r===cw?'cur':''} ${r===w?'sel':''}" data-iweek="${r}" aria-label="Week ${r}"><small>WK</small><b class="num">${r}</b><small>${res||'·'}</small></button>`;}).join('')}</div>
  <div class="tip"><span>${ballIcon()}</span><div><b>In-season:</b> your app sessions fit around team training and games. Win a week by doing your Strength Top-Up (a ${t.bigW.toLowerCase()}, ${t.bigP} points). Team training, games and the other sessions are a ${t.smallW.toLowerCase()} (${t.smallP} point). This week: ~${Math.round(load/6)/10} of ${age()} hours.</div></div>
  <div style="text-align:center;margin-top:12px"><button class="link" data-season-setup>Change team schedule</button></div>`;
}
function detailIn(dow){
  const t=T(),w=viewIWeek,{plan}=planWeek(),x=plan[dow],dd=iDate(w,dow),done=iDone(w,dow);
  const head=`<button class="back" data-back>← Weeks</button>`;
  if(x.type==='team'||x.type==='game'){
    return head+`<div class="dhead"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Week ${w} · ${fmt(dd)}</div><h2 class="disp">${TYPE_NAME[x.type]}</h2><p>${x.type==='game'?'Warm up properly, play hard, and cool down after. Tick it off for a '+t.smallW.toLowerCase()+'.':'Training with your team counts. Tick it off for a '+t.smallW.toLowerCase()+'.'}</p></div>
    ${x.type==='game'?`<div class="tip"><span>${IC.shield}</span><div><b>Any knock to the head?</b> Stop, no more sport that day, and see a doctor before returning.</div></div>`:''}
    <div class="sticky"><div class="in"><button class="big" data-imark="${dow}">${done?'Done ✓ (tap to undo)':x.type==='game'?'I played today':'I trained today'}</button></div></div>`;
  }
  if(x.type==='rest')return head+`<div class="dhead"><h2 class="disp">Rest day</h2><p>Rest is when your body gets stronger.</p></div>`;
  const s=sessIn(x.type);
  return head+`<div class="dhead"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">Week ${w} · ${fmt(dd)} · ~${estMin(s)} min</div><h2 class="disp">${s.title}</h2><p>${s.sub}</p></div>
  ${blocksHTML(s,1)}
  ${done?`<div class="tip"><span>${IC.tick}</span><div><b>Done this week.</b> <button class="link" data-iundo="${dow}">Undo</button></div></div>`:''}
  <div style="text-align:center;margin-top:14px">${done?'':`<button class="link" data-imark="${dow}">I did this without the app</button>`}</div>
  <div style="height:90px"></div>
  <div class="sticky"><div class="in"><button class="big" data-istart="${dow}">${done?'Run it again':'Kick off'}</button></div></div>`;
}
function blocksHTML(s,w){
  let h='';
  s.blocks.forEach(b=>{h+=`<div class="blockhead"><h4>${b.name}</h4><small>${blockSummary(b)}</small></div>`;h+=b.slots?`<div class="card">${b.slots.map(sl=>slotRow(sl,w)).join('')}</div>`:`<div class="card">${compactSteps(b.steps)}</div>`;});
  return h;
}
function openSeasonSetup(){
  const sc=S.season;
  let st={start:sc.start||iso(nextMonday()),weeks:sc.weeks||18,train:(sc.train||[]).slice(),game:sc.game==null?5:sc.game,trainMin:sc.trainMin||90,gameMin:sc.gameMin||60};
  const chips=(sel,attr,extra)=>`<div class="dchips">${DAYS.map((d,i)=>`<button class="dchip ${sel(i)?'on':''}" ${attr}="${i}">${d}</button>`).join('')}</div>${extra||''}`;
  const draw=()=>`<h3>Your season</h3><p>Tell us when your team trains and plays. The app fits your sessions around them, with rest before games and recovery after.</p>
    <div class="field"><label>Team training days</label>${chips(i=>st.train.includes(i),'data-st')}</div>
    <div class="field"><label>Game day</label>${chips(i=>st.game===i,'data-sg',`<button class="dchip ${st.game<0?'on':''}" data-sg="-1" style="margin-top:6px;width:100%">No games yet</button>`)}</div>
    <div class="field"><label>Team training length</label><div class="ctl" style="justify-content:flex-start"><button class="step" data-sm="-15">−</button><div class="amt num">${st.trainMin}<small>min</small></div><button class="step" data-sm="15">+</button></div></div>
    <div class="field"><label>Game length (your playing time)</label><div class="ctl" style="justify-content:flex-start"><button class="step" data-gm="-10">−</button><div class="amt num">${st.gameMin}<small>min</small></div><button class="step" data-gm="10">+</button></div></div>
    <div class="field"><label for="s-start">Season starts (a Monday)</label><input id="s-start" type="date" value="${st.start}"></div>
    <div class="field"><label>Season length</label><div class="ctl" style="justify-content:flex-start"><button class="step" data-wk="-1">−</button><div class="amt num">${st.weeks}<small>weeks</small></div><button class="step" data-wk="1">+</button></div></div>
    <button class="big" data-save style="margin-top:10px">${sc.on?'Save schedule':'Start the season'}</button>
    ${sc.on?'<div style="text-align:center;margin-top:8px"><button class="link" data-backpre>Switch back to pre-season</button></div>':''}`;
  const redraw=()=>{const el=document.querySelector('#scrim .sheet');const y=el.scrollTop;el.innerHTML='<div class="grab"></div>'+draw();el.scrollTop=y;};
  sheet(draw(),e=>{
    const inp=document.getElementById('s-start');if(inp&&inp.value)st.start=inp.value;
    const b=e.target.closest('button');if(!b)return;const d=b.dataset;
    if(d.st!=null){const i=+d.st;st.train=st.train.includes(i)?st.train.filter(x=>x!==i):st.train.concat(i).sort();if(st.game===i)st.game=-1;redraw();}
    else if(d.sg!=null){st.game=+d.sg;st.train=st.train.filter(x=>x!==st.game);redraw();}
    else if(d.sm){st.trainMin=Math.max(30,Math.min(180,st.trainMin+(+d.sm)));redraw();}
    else if(d.gm){st.gameMin=Math.max(20,Math.min(120,st.gameMin+(+d.gm)));redraw();}
    else if(d.wk){st.weeks=Math.max(4,Math.min(40,st.weeks+(+d.wk)));redraw();}
    else if(d.backpre!=null){S.season.on=false;save();closeSheet();tab='home';detail=null;render();toast('Back to pre-season');}
    else if(d.save!=null){
      const sd=parseD(st.start);if((sd.getDay()+6)%7!==0){st.start=iso(addDays(sd,-((sd.getDay()+6)%7)));}
      S.season=Object.assign({},S.season,st,{on:true});save();viewIWeek=seasonWeek();closeSheet();tab='home';detail=null;render();toast('Season mode on');}
  });
}
function navBar(){
  const b=(id,l)=>`<button class="${tab===id?'on':''}" data-tab="${id}">${IC[id]}<span>${l}</span></button>`;
  return `<nav class="nav"><div class="in">${b('home',inSeason()?'Weeks':plural(T().week))}${b('drills','Drills')}${b('medals','Medals')}${b('locker','Locker')}</div></nav>`;
}
function slotRow(slot,w){
  const k=exOf(slot),e=EX[k],a=amountFor(slot,w),L=amtLabel(e,a);
  return `<div class="row"><div><div class="n">${e.n}</div><div class="c">${e.cue}</div><button class="swap" data-swap="${slot}">Swap exercise</button></div>
    <div class="ctl"><button class="step" data-adj="${slot}" data-d="-1" aria-label="Less">−</button><div class="amt num">${L.v}<small>${L.u}</small></div><button class="step" data-adj="${slot}" data-d="1" aria-label="More">+</button></div></div>`;
}
function detailView(day){
  const t=T(),w=viewWeek,dd=dayDate(w,day),done=isDone(w,day),wk=t.week;
  if(day==='mon'){
    return `<button class="back" data-back>← ${plural(wk)}</button>
    <div class="dhead"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">${wk} ${w} · ${fmt(dd)}</div><h2 class="disp">Club Training</h2><p>Training with your team counts. Give it everything, then tick it off for a ${t.smallW.toLowerCase()}.</p></div>
    <div class="tip"><span>${ballIcon()}</span><div><b>Rest tomorrow.</b> Tuesday, Thursday and Friday are rest days so your body can recover and get stronger.</div></div>
    <div class="sticky"><div class="in"><button class="big" data-markmon>${done?'Trained ✓ (tap to undo)':'I trained today'}</button></div></div>`;
  }
  const s=buildSession(day,w);
  const blocks=blocksHTML(s,w);
  const modes=[['field',t.condLabel],['swim','Swim'],['ride','Ride']];
  return `<button class="back" data-back>← ${plural(wk)}</button>
  <div class="dhead"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">${wk} ${w} · ${fmt(dd)} · ~${estMin(s)} min</div><h2 class="disp">${s.title}</h2><p>${s.sub}</p></div>
  ${day==='sun'?`<div class="seg three" role="group" aria-label="Conditioning type">${modes.map(([m,l])=>`<button class="${s.mode===m?'on':''}" data-mode="${m}">${l}</button>`).join('')}</div>`:''}
  ${blocks}
  ${S.growth?`<div class="tip"><span>${IC.shield}</span><div><b>Growth spurt mode is on.</b> Fewer jumps and sprints while your body catches up.</div></div>`:''}
  ${done?`<div class="tip"><span>${IC.tick}</span><div><b>Already done this ${wk.toLowerCase()}.</b> You can run it again any time, but it only scores once. <button class="link" data-undo="${day}">Undo</button></div></div>`:''}
  <div style="text-align:center;margin-top:14px">${done?'':`<button class="link" data-markdone="${day}">I did this without the app</button>`}</div>
  <div style="height:90px"></div>
  <div class="sticky"><div class="in"><button class="big" data-start="${day}">${done?'Run it again':'Kick off'}</button></div></div>`;
}
function blockSummary(b){
  if(b.rounds)return b.rounds+(b.rounds===1?' round':' rounds');
  const work=b.steps.filter(s=>s.k!=='rest');
  if(b.name==='Speed'||b.name==='Speed games')return work.length+' efforts';
  if(b.name==='Conditioning')return work.length+' reps';
  if(b.name.startsWith('Skip'))return work.length+' × '+work[0].dur+' sec';
  const t=b.steps.reduce((a,s)=>a+(s.dur||0),0);return Math.round(t/60)+' min';
}
function compactSteps(steps){
  const rows=[];
  steps.filter(s=>s.k!=='rest').forEach(s=>{
    const base=s.name.replace(/\s\d+\/\d+.*$/,'').replace(/\s·\s\d+\/\d+$/,'');
    const last=rows[rows.length-1];
    if(last&&last.base===base&&last.val===val(s)){last.n++;}else rows.push({base,val:val(s),n:1,cue:s.cue});
  });
  return rows.map(r=>`<div class="simple"><span>${r.n>1?r.n+' × ':''}${esc(r.base)}</span><span class="num">${r.val}</span></div>`).join('');
  function val(s){return s.k==='reps'?(s.unit==='metres'?s.reps+' m':s.reps+' '+s.unit):fmtT(s.dur);}
}
function fmtT(sec){sec=Math.max(0,Math.ceil(sec));if(sec<60)return sec+' sec';const m=Math.floor(sec/60),s=sec%60;return s?m+':'+String(s).padStart(2,'0')+' min':m+' min';}
function drillsView(){
  const w=viewWeek,t=T(),b=band();
  return `<div class="dhead" style="margin-top:6px"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">${t.week} ${w} · ${PHASES[phaseOf(w)].name} · Ages ${b.label}</div><h2 class="disp">Your drills</h2><p>Bored of one? Swap it. Too easy or too hard? Change the reps. Only exercises right for your age show up.</p></div>
  <div class="blockhead"><h4>${isMini()?'Fun circuit':'Strength circuit'}</h4><small>Saturday · ${rounds(w)} rounds</small></div><div class="card">${A_SLOTS.map(s=>slotRow(s,w)).join('')}</div>
  <div class="blockhead"><h4>Body armour</h4><small>Wednesday · 2 rounds</small></div><div class="card">${C_SLOTS.map(s=>slotRow(s,w)).join('')}</div>
  <div class="blockhead"><h4>${esc(t.name)} skills</h4><small>Rotate each ${t.week.toLowerCase()}</small></div><div class="card">${t.skills.map(s=>`<div class="simple"><span><b style="color:var(--chalk)">${esc(s[0])}</b><br><span class="muted" style="font-size:13.5px">${esc(s[1])}</span></span><span>${fmtT(b.skillT)}</span></div>`).join('')}</div>
  <div style="text-align:center;margin-top:16px"><button class="link" data-resetdrills>Put all drills back to the original plan</button></div>`;
}
function medalsView(D){
  const st=S.stats,ML=MEDALS(D.weeks||8);
  return `<div class="dhead" style="margin-top:6px"><div class="muted" style="font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px">${D.medals.length} of ${ML.length} won · each one is a ${T().smallW.toLowerCase()}</div><h2 class="disp">Medals</h2></div>
  <div class="medals" style="margin-top:14px">${ML.map(m=>`<div class="medal ${D.medals.includes(m.id)?'on':''}"><div class="m">${m.m}</div><b>${esc(m.n)}</b><small>${esc(m.d)}</small></div>`).join('')}</div>
  <div class="sect"><h3>Season stats</h3></div>
  <div class="card">
    <div class="simple"><span>Sessions finished</span><span class="num">${D.sessions}</span></div>
    <div class="simple"><span>Sprints</span><span class="num">${st.sprints}</span></div>
    <div class="simple"><span>Conditioning efforts</span><span class="num">${st.cond}</span></div>
    <div class="simple"><span>Circuit sets</span><span class="num">${st.sets}</span></div>
    <div class="simple"><span>Skill blocks</span><span class="num">${st.skills}</span></div>
    <div class="simple"><span>${inSeason()?'Weeks':plural(T().week)} won</span><span class="num">${D.wins} / ${D.weeks||8}</span></div>
  </div>`;
}
function weeklyMinutes(w){return ['sat','sun','wed'].reduce((a,d)=>a+estMin(buildSession(d,w)),0);}
function lockerView(){
  const r=S.rest,t=T(),b=band(),a=age();
  const restRow=(k,l)=>`<div class="row"><div><div class="n">${l}</div></div><div class="ctl"><button class="step" data-rest="${k}" data-d="-5" aria-label="Less">−</button><div class="amt num">${r[k]}<small>sec</small></div><button class="step" data-rest="${k}" data-d="5" aria-label="More">+</button></div></div>`;
  const tg=(k,l,h)=>`<div class="tog"><span>${l}${h?`<div class="hint">${h}</div>`:''}</span><button class="sw ${S[k]?'on':''}" data-tog="${k}" role="switch" aria-checked="${S[k]}" aria-label="${l}"></button></div>`;
  const wm=inSeason()?planWeek().load:weeklyMinutes(viewWeek);
  return `<div class="dhead" style="margin-top:6px"><h2 class="disp">Locker</h2><p>Your sport, your body, your settings.</p></div>
  <div class="blockhead"><h4>Athlete</h4></div>
  <div class="card">
    <div class="row"><div><div class="n">Sport</div><div class="c">${esc(t.name)}</div></div><button class="swap" data-pick-sport>Change</button></div>
    <div class="row"><div><div class="n">Age</div><div class="c">${b.stage} · ages ${b.label}</div></div><div class="ctl"><button class="step" data-age="-1" aria-label="Younger">−</button><div class="amt num">${a}<small>years</small></div><button class="step" data-age="1" aria-label="Older">+</button></div></div>
    <div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="n" style="font-weight:700;margin-bottom:6px">Training experience</div><div class="seg three" style="margin-top:0">${Object.keys(EXPERIENCE).map(k=>`<button class="${S.exp===k?'on':''}" data-exp="${k}" style="font-size:15px">${EXPERIENCE[k].n}</button>`).join('')}</div></div>
    ${tg('growth','Growth spurt','Grown a lot in the last 6 months, or sore knees or heels? Cuts jumps and sprints back.')}
  </div>
  <div class="band"><b>${b.stage}</b><span>${b.note}</span></div>
  <div class="card" style="margin-top:14px">
    <div class="field"><label for="f-name">Your name</label><input id="f-name" value="${esc(S.name)}" maxlength="16" autocomplete="off"></div>
    <div class="field"><label for="f-num">Jumper number</label><input id="f-num" value="${esc(S.num)}" inputmode="numeric" maxlength="2"></div>
    <div class="field"><label for="f-start">${t.week} 1 starts (a Monday)</label><input id="f-start" type="date" value="${S.start}"></div>
  </div>
  <div class="blockhead"><h4>Season</h4></div>
  <div class="card"><div class="seg" style="margin:6px 0 4px"><button class="${inSeason()?'':'on'}" data-mode-pre>Pre-season</button><button class="${inSeason()?'on':''}" data-season-setup>In-season</button></div>
    ${inSeason()?`<div class="simple"><span>Team training</span><span>${S.season.train.map(d=>DAYS[d]).join(', ')||'None'}</span></div><div class="simple"><span>Game day</span><span>${S.season.game<0?'None':DAYS[S.season.game]}</span></div><div style="text-align:center"><button class="link" data-season-setup>Change team schedule</button></div>`:''}</div>
  <div class="blockhead"><h4>Training load</h4></div>
  <div class="card"><div class="simple"><span>${inSeason()?'Team + app this week':'App sessions this '+t.week.toLowerCase()}</span><span class="num">~${Math.round(wm/6)/10} hours</span></div>
    <div class="simple"><span>Weekly limit for age ${a} (all organised sport)</span><span class="num">${a} hours</span></div>
    <div class="simple"><span>Rest days</span><span>${inSeason()?planWeek().plan.filter(x=>x.type==='rest'||x.type==='recovery').map(x=>DAYS[x.dow]).join(', '):'Tue, Thu, Fri'}</span></div></div>
  <div class="blockhead"><h4>Train safe</h4></div>
  <div class="card safe">${SAFE.concat(t.tips.map(x=>[t.name,x])).map(([h,x])=>`<div class="simple"><b>${esc(h)}</b><span>${esc(x)}</span></div>`).join('')}</div>
  <div class="blockhead"><h4>Timer</h4></div>
  <div class="card">${tg('sound','Beeps')}${tg('voice','Voice coach')}${tg('buzz','Vibrate')}</div>
  <div class="blockhead"><h4>Rest times</h4></div>
  <div class="card">${restRow('round','Between circuit rounds')}${restRow('trans','Between exercises')}${restRow('hill','Minimum sprint recovery')}${restRow('skip','Between skipping rounds')}</div>
  ${NATIVE?`<div class="tip"><span>${ballIcon()}</span><div><b>Locked phone?</b> No worries. The timer keeps running and you'll get an alert when each step ends. Allow notifications when asked.</div></div>`:`<div class="tip"><span>${ballIcon()}</span><div><b>Put it on your home screen:</b> open this page in Chrome, tap the ⋮ menu, then <b>Add to Home screen</b>. Keep the phone unlocked during a session so the beeps work.</div></div>`}
  <p class="muted" style="font-size:12.5px;margin:16px 4px 0">This app gives general training guidance for healthy young athletes. It isn't medical advice. Train with an adult around, and see a doctor or physio about any injury or health condition.</p>
  <div style="text-align:center;margin-top:10px"><button class="danger" data-reset>Reset the whole season</button></div>`;
}

/* ---------------- Sheets ---------------- */
let sheetOpen=false;
function sheet(html,onClick){
  closeSheet();sheetOpen=true;
  const el=document.createElement('div');el.className='scrim';el.id='scrim';
  el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  el.addEventListener('click',e=>{if(e.target===el&&S.onboarded&&S.age&&S.sport){closeSheet();return;}onClick&&onClick(e);});
  document.body.appendChild(el);
}
function closeSheet(){const s=document.getElementById('scrim');if(s)s.remove();sheetOpen=false;}
function openSwap(slot){
  const cur=exOf(slot),cat=EX[cur].cat;
  const opts=Object.keys(EX).filter(k=>EX[k].cat===cat&&allowed(k));
  sheet(`<h3>Swap ${CAT[cat]}</h3><p>Pick something new. It works the same muscles. Only exercises right for age ${age()} are shown.</p>
    ${opts.length>1?'<button class="surprise" data-pick="__rand">Surprise me</button>':''}
    ${opts.map(k=>`<button class="opt ${k===cur?'cur':''}" data-pick="${k}"><b>${EX[k].n}${k===cur?' · current':''}</b><small>${EX[k].why} ${EX[k].cue}</small></button>`).join('')}`,
  e=>{const b=e.target.closest('[data-pick]');if(!b)return;let k=b.dataset.pick;
    if(k==='__rand'){const o=opts.filter(x=>x!==cur);k=o[Math.floor(Math.random()*o.length)];}
    if(k!==cur){S.slots[slotKey(slot)]=k;delete S.adj[slotKey(slot)];S.stats.swaps++;save();toast('Swapped in '+EX[k].n);}
    closeSheet();render();});
}
function confirmSheet(title,text,yes,fn){
  sheet(`<h3>${title}</h3><p>${text}</p><button class="big" data-yes>${yes}</button><div style="text-align:center;margin-top:8px"><button class="link" data-no>Cancel</button></div>`,
  e=>{if(e.target.closest('[data-yes]')){closeSheet();fn();}else if(e.target.closest('[data-no]'))closeSheet();});
}
function sportGrid(){
  return `<div class="sports">${SPORT_ORDER.map(id=>{const s=SPORTS[id];return `<button class="sp ${S.sport===id?'cur':''}" data-sport="${id}"><span class="ic" style="background:${s.deep}">${ballIcon(s.ball,28)}</span><span><b>${esc(s.name)}</b><small>${esc(s.tag)}</small></span></button>`;}).join('')}</div>`;
}
function openSports(fromLocker){
  sheet(`<h3>${fromLocker?'Change sport':'Pick your sport'}</h3><p>Your program, drills, colours and scoring all change to match. ${fromLocker?'Your results so far are kept.':''}</p>${sportGrid()}`,
  e=>{const b=e.target.closest('[data-sport]');if(!b)return;S.sport=b.dataset.sport;save();applyTheme();
    if(fromLocker){closeSheet();render();toast(T().name+' it is');}else openAbout(false);});
}
function openOnboard(){openSports(false);}
/* About you: age, experience, growth spurt and the parent check. */
function openAbout(isUpdate){
  const t=T();let a=S.age||0,exp=S.exp||'some',growth=!!S.growth;
  const body=()=>`<h3>${isUpdate?'New: about you':'About you'}</h3><p>${isUpdate?'Full Season now sets every session by age, so the work is safe and right for your body.':'This sets your program so it\'s safe and right for your body.'}</p>
  ${isUpdate?'':`<div class="field"><label for="o-name">Your name</label><input id="o-name" maxlength="16" autocomplete="off" placeholder="First name" value="${esc(S.name)}"></div>
  <div class="field"><label for="o-num">Jumper number</label><input id="o-num" inputmode="numeric" maxlength="2" placeholder="e.g. 9" value="${esc(S.num)}"></div>`}
  <div class="field"><label>Age</label><div class="ctl" style="justify-content:flex-start"><button class="step" data-oage="-1" aria-label="Younger">−</button><div class="amt num" id="o-age">${a||'?'}<small>years</small></div><button class="step" data-oage="1" aria-label="Older">+</button><span class="hint" id="o-band" style="margin-left:8px">${a?bandFor(a).stage:'Ages 6–18'}</span></div></div>
  <div class="field"><label>Training experience</label><div class="seg three" style="margin-top:0">${Object.keys(EXPERIENCE).map(k=>`<button class="${exp===k?'on':''}" data-oexp="${k}" style="font-size:15px">${EXPERIENCE[k].n}</button>`).join('')}</div></div>
  <label class="check"><input type="checkbox" id="o-growth" ${growth?'checked':''}><span>I've grown a lot in the last 6 months, or have sore knees or heels<div class="hint">We'll go easier on jumps and sprints while you grow.</div></span></label>
  <label class="check"><input type="checkbox" id="o-parent" ${S.parentOk?'checked':''}><span>A parent or guardian knows I'm doing this program, and I'm not injured or sick<div class="hint">Got asthma, a heart condition or an injury? Check with your doctor or physio first.</div></span></label>
  <button class="big" data-go style="margin-top:10px">Run out onto the ${t.field==='oval'||t.field==='cricket'?'ground':t.field==='rink'?'ice':t.field==='court'||t.field==='netball'||t.field==='volley'||t.field==='tennis'?'court':'field'}</button>`;
  sheet(body(),e=>{
    const ob=e.target.closest('[data-oage]');
    if(ob){a=a?Math.max(5,Math.min(18,a+(+ob.dataset.oage))):12;document.getElementById('o-age').innerHTML=a+'<small>years</small>';document.getElementById('o-band').textContent=a<6?'Under 6: just play!':bandFor(a).stage+' · '+bandFor(a).label;return;}
    const ox=e.target.closest('[data-oexp]');
    if(ox){exp=ox.dataset.oexp;ox.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===ox));return;}
    if(!e.target.closest('[data-go]'))return;
    if(!a){toast('Set your age first');return;}
    if(a<6){toast('This program is for ages 6 and up');return;}
    if(!document.getElementById('o-parent').checked){toast('Tick the parent box to start');return;}
    if(!isUpdate){S.name=document.getElementById('o-name').value.trim();S.num=document.getElementById('o-num').value.replace(/\D/g,'').slice(0,2);}
    S.age=a;S.exp=exp;S.growth=document.getElementById('o-growth').checked;S.parentOk=true;S.onboarded=true;save();closeSheet();render();
  });
}
/* Readiness check before every session. */
function openReady(day){
  sheet(`<h3>How's the body?</h3><p>Be honest. Training smart beats training hurt.</p>
    <button class="ready ok" data-r="ok"><b>Feeling good</b><small>Full session.</small></button>
    <button class="ready lite" data-r="lite"><b>Tired or a bit sore</b><small>Lighter session: fewer reps, rounds and sprints.</small></button>
    <button class="ready stop" data-r="stop"><b>Pain in a joint or bone, or feeling sick</b><small>Rest day.</small></button>
    <p style="font-size:13.5px;margin-top:10px">Hot day? Train early or late and bring a full water bottle.</p>`,
  e=>{const b=e.target.closest('[data-r]');if(!b)return;const r=b.dataset.r;
    if(r==='stop'){sheet(`<h3>Sit this one out</h3><p>Rest today and tell a parent. Pain in a joint or bone, or being sick, is your body asking for a break. If pain lasts more than a few days, or you're limping, see a physio or GP.</p><p>This session will still be here when you're right.</p><button class="big" data-no>OK, rest day</button>`,ev=>{if(ev.target.closest('[data-no]'))closeSheet();});return;}
    closeSheet();startPlayer(day,r==='lite');});
}
function toast(t){const o=document.querySelector('.toast');if(o)o.remove();const el=document.createElement('div');el.className='toast';el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),1800);}

/* ---------------- Events ---------------- */
root.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  const d=t.dataset;
  if(d.tab){tab=d.tab;detail=null;render();scrollTo(0,0);}
  else if(d.open){detail=d.open;render();scrollTo(0,0);}
  else if(d.iopen!=null){detail='i:'+d.iopen;render();scrollTo(0,0);}
  else if(d.iweek){viewIWeek=+d.iweek;detail=null;tab='home';render();}
  else if(d.istart!=null){const x=planWeek().plan[+d.istart];openReady({dow:+d.istart,type:x.type});}
  else if(d.imark!=null){const dow=+d.imark,x=planWeek().plan[dow];
    if(x.type==='team'||x.type==='game'){if(iDone(viewIWeek,dow))delete S.ilog[iKey(viewIWeek,dow)];else{S.ilog[iKey(viewIWeek,dow)]={at:Date.now(),type:x.type};toast(T().smallW+'! +'+T().smallP+' point');}save();render();}
    else completeIn(dow,null,true);}
  else if(d.iundo!=null){confirmSheet('Undo this session?','It comes off your score for week '+viewIWeek+'.','Undo it',()=>{delete S.ilog[iKey(viewIWeek,+d.iundo)];save();render();});}
  else if(d.seasonSetup!=null){openSeasonSetup();}
  else if(d.modePre!=null){if(inSeason()){S.season.on=false;save();render();toast('Back to pre-season');}}
  else if(d.back!==undefined){detail=null;render();scrollTo(0,0);}
  else if(d.week){viewWeek=+d.week;detail=null;tab='home';render();}
  else if(d.swap){openSwap(d.swap);}
  else if(d.adj){const slot=d.adj,k=slotKey(slot),e2=EX[exOf(slot)],step=e2.t==='time'?5:1,old=S.adj[k]||0,v0=amountFor(slot,viewWeek);
    S.adj[k]=old+step*(+d.d);
    const v1=amountFor(slot,viewWeek),max=e2.t==='time'?120:40;
    if(v1===v0||v1>max)S.adj[k]=old;save();render();}
  else if(d.mode){S.sunMode[viewWeek]=d.mode;save();render();}
  else if(d.start){openReady(d.start);}
  else if(d.markdone){complete(d.markdone,null,true);}
  else if(d.markmon!==undefined){if(isDone(viewWeek,'mon'))delete S.log[logKey(viewWeek,'mon')];else{const before=derived().medals;S.log[logKey(viewWeek,'mon')]={at:Date.now()};save();const nmd=derived().medals.filter(m=>!before.includes(m));toast(T().smallW+'! '+(nmd.length?'+ new medal':'+'+T().smallP+' point'));}save();render();}
  else if(d.undo){confirmSheet('Undo this session?','It comes off your score for '+T().week.toLowerCase()+' '+viewWeek+'.','Undo it',()=>{delete S.log[logKey(viewWeek,d.undo)];save();render();});}
  else if(d.tog){S[d.tog]=!S[d.tog];save();render();}
  else if(d.rest){S.rest[d.rest]=Math.max(5,Math.min(240,S.rest[d.rest]+(+d.d)));save();render();}
  else if(d.age){const n=Math.max(6,Math.min(18,age()+(+d.age)));if(n!==S.age){S.age=n;save();render();toast(bandFor(n).stage+' program');}}
  else if(d.exp){S.exp=d.exp;save();render();}
  else if(d.pickSport!==undefined){openSports(true);}
  else if(d.resetdrills!==undefined){confirmSheet('Back to the original plan?','All swaps and rep changes for '+esc(T().name)+' are cleared.','Reset drills',()=>{const p=S.sport+':';Object.keys(S.slots).forEach(k=>{if(k.startsWith(p))delete S.slots[k];});Object.keys(S.adj).forEach(k=>{if(k.startsWith(p))delete S.adj[k];});save();render();});}
  else if(d.reset!==undefined){confirmSheet('Reset the whole season?','This clears every result, medal and setting on this phone.','Reset everything',()=>{S=clone(DEFAULT);save();viewWeek=currentWeek();tab='home';render();});}
});
root.addEventListener('change',e=>{
  const id=e.target.id;
  if(id==='f-name'){S.name=e.target.value.trim();save();}
  if(id==='f-num'){S.num=e.target.value.replace(/\D/g,'').slice(0,2);save();}
  if(id==='f-start'&&e.target.value){S.start=e.target.value;viewWeek=currentWeek();save();}
});

/* ---------------- Player ---------------- */
let P=null,timerId=null;
function startPlayer(day,lite){
  const ref=typeof day==='object'?day:null;
  const sess=ref?sessIn(ref.type,{lite}):buildSession(day,viewWeek,{lite});
  const steps=[{k:'ready',name:'Get ready',dur:5,cue:'First up: '+firstWork(sess),block:sess.blocks[0].name}].concat(flatSteps(sess));
  P={day,ref,w:ref?viewIWeek:viewWeek,lite,sess,steps,i:0,start:performance.now(),paused:false,pausedAt:0,acc:0,lastBeep:null,counts:{sets:0,sprints:0,cond:0,skills:0}};
  audio();wake(true);prepNotifs();
  const el=document.createElement('div');el.className='player';el.id='player';document.body.appendChild(el);
  el.addEventListener('click',playerClick);
  if(lite)toast('Lighter session today');
  enterStep();
  timerId=setInterval(tick,200);
}
function firstWork(sess){const s=flatSteps(sess).find(x=>x.k!=='rest');return s?s.name:'';}
function cur(){return P.steps[P.i];}
function elapsed(){return ((P.paused?P.pausedAt:performance.now())-P.start-P.acc)/1000;}
const spoken=n=>n.replace(/\s\d+\/\d+/,'').replace(/\s·\s\d+\/\d+$/,'').replace(' · ',', ');
function enterStep(){
  const s=cur();P.start=performance.now();P.acc=0;P.paused=false;P.lastBeep=null;
  if(s.k==='work'){beep(880,.35);buzz([180]);say(spoken(s.name)+'. Go!');}
  else if(s.k==='rest'){beep(520,.3);buzz([90,60,90]);const nx=nextWorkName();say(s.name+(nx?'. Next, '+spoken(nx):''));}
  else if(s.k==='reps'){beep(880,.35);buzz([180]);say(spoken(s.name)+'. '+(s.unit==='metres'?'':s.reps+' '+s.unit)+'.');}
  else if(s.k==='ready'){say((nm()?kicker()+nm()+', get ready. ':'Get ready. ')+s.cue);}
  drawPlayer(true);
}
function nextWorkName(){for(let j=P.i+1;j<P.steps.length;j++){if(P.steps[j].k!=='rest')return P.steps[j].name;}return '';}
function tick(){
  if(!P||P.paused)return;
  const s=cur();
  if(s.k==='reps'){drawPlayer();return;}
  let left=s.dur-elapsed();
  if(left<=0){
    /* catch up if the phone was locked: carry leftover time into the next steps */
    let over=-left,guard=0;
    countStep(s);P.i++;
    while(P.i<P.steps.length&&P.steps[P.i].k!=='reps'&&over>=P.steps[P.i].dur&&guard++<500){over-=P.steps[P.i].dur;countStep(P.steps[P.i]);P.i++;}
    if(P.i>=P.steps.length){finishPlayer();return;}
    if(over>1.5){P.start=performance.now()-over*1000;P.acc=0;P.paused=false;P.lastBeep=null;drawPlayer(true);}
    else enterStep();
    return;
  }
  const whole=Math.ceil(left);
  if(whole<=3&&whole>=1&&P.lastBeep!==whole){P.lastBeep=whole;beep(660,.12);}
  drawPlayer();
}
function countStep(s){if(s.count==='set')P.counts.sets++;else if(s.count==='sprint')P.counts.sprints++;else if(s.count==='cond')P.counts.cond++;else if(s.count==='skill')P.counts.skills++;}
function advance(dir){
  const s=cur();
  if(dir>0&&(s.k==='work'||s.k==='reps'))countStep(s);
  P.i+=dir;
  if(P.i<0)P.i=0;
  if(P.i>=P.steps.length){finishPlayer();return;}
  enterStep();
}
function fitOval(){
  const el=document.getElementById('player'),o=el&&el.querySelector('.oval');if(!o)return;
  const W=o.clientWidth,H=o.clientHeight;
  const h=Math.max(120,Math.min(H-8,(W-8)*360/300,460)),w=h*300/360;
  el.style.setProperty('--ovh',h.toFixed(0)+'px');el.style.setProperty('--ovw',w.toFixed(0)+'px');
}
window.addEventListener('resize',()=>{if(P)fitOval();});
let lastI=-1;
function drawPlayer(full){
  const el=document.getElementById('player');if(!el)return;
  const s=cur(),mode=s.k==='reps'?'work':s.k,t=T();
  el.className='player '+mode;
  let frac,big,unit,phase;
  if(s.k==='reps'){const tt=elapsed();frac=(tt%60)/60;big=s.reps;unit=s.unit;phase='Reps · '+Math.floor(tt/60)+':'+String(Math.floor(tt%60)).padStart(2,'0');}
  else{const left=Math.max(0,s.dur-elapsed());frac=1-left/s.dur;big=fmtClock(left);unit=s.dur>=60?'min':'sec';phase=s.k==='work'?'Work':s.k==='rest'?'Rest':'Get ready';}
  const pc=mode==='work'?t.pri:mode==='rest'?(t.rest||'#31c374'):'#f3b53f';
  if(full||lastI!==P.i){
    lastI=P.i;
    const nx=nextStepLabel();
    const roundTxt=s.round?` · Round ${s.round}/${s.rounds}`:'';
    const sub=s.nextSlot?('Next: '+EX[exOf(s.nextSlot)].n):s.cue;
    el.innerHTML=`
      <div class="ptop"><button class="x" data-p="exit" aria-label="Stop session">✕</button><div class="lab">${esc(s.block)}${roundTxt}${P.lite?' · Lighter':''}<b class="num">${P.i+1} / ${P.steps.length}</b></div><button class="x" data-p="mute" aria-label="Sound on or off">${S.sound?'🔊':'🔈'}</button></div>
      <div class="prog"><i style="width:${(P.i/P.steps.length*100).toFixed(1)}%"></i></div>
      <div class="oval"><div id="ov">${fieldSVG(frac,mode)}</div><div class="center"><div><div class="phase" id="ph" style="color:${pc}">${phase}</div><div class="big-t" id="bt">${big}</div><div class="unit" id="un">${unit}</div></div></div></div>
      <div class="pname"><h2>${esc(s.name)}</h2><p>${esc(sub)}</p></div>
      <div class="next">${nx?`<span>Then: <b>${esc(nx)}</b></span>`:'<span><b>Last one'+(nm()?', '+esc(nm()):'')+'!</b></span>'}</div>
      <div class="pctl"><button class="sm" data-p="prev" aria-label="Previous">${IC.prev}</button>
        ${s.k==='reps'?`<button class="main go" data-p="done">${IC.tick} Done</button>`:`<button class="main" data-p="pause" id="pp">${P.paused?IC.play+' Resume':IC.pause+' Pause'}</button>`}
        <button class="sm" data-p="next" aria-label="${s.k==='rest'?'Skip rest':'Next'}">${IC.next}</button></div>`;
    fitOval();
  } else {
    const ov=document.getElementById('ov');if(ov)ov.innerHTML=fieldSVG(frac,mode);
    const bt=document.getElementById('bt');if(bt)bt.textContent=big;
    const ph=document.getElementById('ph');if(ph)ph.textContent=phase;
    const un=document.getElementById('un');if(un)un.textContent=unit;
  }
}
function nextStepLabel(){const n=P.steps[P.i+1];if(!n)return '';if(n.k==='rest')return n.name+' '+fmtT(n.dur);return n.name+(n.k==='reps'?' × '+n.reps:' '+fmtT(n.dur));}
function fmtClock(sec){sec=Math.max(0,Math.ceil(sec));const m=Math.floor(sec/60),s=sec%60;return m?m+':'+String(s).padStart(2,'0'):String(s);}
function playerClick(e){
  const b=e.target.closest('[data-p]');if(!b)return;const a=b.dataset.p;
  audio();
  if(a==='pause'){if(P.paused){P.acc+=performance.now()-P.pausedAt;P.paused=false;}else{P.paused=true;P.pausedAt=performance.now();if(window.speechSynthesis)speechSynthesis.cancel();}drawPlayer(true);}
  else if(a==='next'||a==='done'){advance(1);}
  else if(a==='prev'){if(elapsed()>3&&cur().k!=='reps'){enterStep();}else advance(-1);}
  else if(a==='mute'){S.sound=!S.sound;S.voice=S.sound;save();drawPlayer(true);}
  else if(a==='exit'){
    const wasPaused=P.paused;if(!wasPaused){P.paused=true;P.pausedAt=performance.now();}
    sheet(`<h3>Stop the session?</h3><p>You're ${Math.round(P.i/P.steps.length*100)}% through. Stopping now doesn't count for the ${T().week.toLowerCase()}. If something hurts, stopping is the right call.</p><button class="big" data-keep>Keep going</button><div style="text-align:center;margin-top:8px"><button class="link" data-stop>Stop session</button></div>`,
      ev=>{if(ev.target.closest('[data-keep]')){closeSheet();if(!wasPaused){P.acc+=performance.now()-P.pausedAt;P.paused=false;}drawPlayer(true);}
           else if(ev.target.closest('[data-stop]')){closeSheet();stopPlayer();}});
    document.getElementById('scrim').style.zIndex=35;
  }
}
function stopPlayer(){cancelNotifs();clearInterval(timerId);timerId=null;wake(false);if(window.speechSynthesis)speechSynthesis.cancel();const el=document.getElementById('player');if(el)el.remove();P=null;render();}
function finishPlayer(){
  const p=P;cancelNotifs();clearInterval(timerId);timerId=null;wake(false);
  const el=document.getElementById('player');if(el)el.remove();
  P=null;
  if(p.ref)completeIn(p.ref.dow,p.counts,false,p.w,p.lite);else complete(p.day,p.counts,false,p.w,p.lite);
}
function complete(day,counts,manual,w,lite){
  w=w||viewWeek;
  const t=T(),before=derived(),already=isDone(w,day),resBefore=weekResult(w);
  if(counts){['sets','sprints','cond','skills'].forEach(k=>S.stats[k]+=counts[k]);}
  else if(manual){flatSteps(buildSession(day,w)).forEach(x=>{if(x.count==='set')S.stats.sets++;if(x.count==='sprint')S.stats.sprints++;if(x.count==='cond')S.stats.cond++;if(x.count==='skill')S.stats.skills++;});}
  if(!already)S.log[logKey(w,day)]={at:Date.now(),manual:!!manual,lite:!!lite};
  save();
  const after=derived(),ML=MEDALS(after.weeks||8);
  const newM=ML.filter(m=>after.medals.includes(m.id)&&!before.medals.includes(m.id));
  const isBig=(day==='sat'||day==='sun');
  const won=resBefore!=='W'&&weekResult(w)==='W';
  const word=isBig?t.bigW:t.smallW,pts=isBig?t.bigP:t.smallP;
  siren();buzz([200,100,200,100,400]);
  if(S.voice)say(already?'Session done. Great work'+(nm()?', '+nm():'')+'.':word+'! Great work'+(nm()?', '+nm():'')+'.');
  root.innerHTML='';
  const fin=document.createElement('div');fin.className='fin';fin.id='fin';
  fin.innerHTML=`<div class="goal">${already?'Done!':esc(word)+'!'}</div>
    <div class="sub">${already?'Extra session':'+'+pts+(pts===1?' point':' points')}</div>
    ${won&&!already?`<p style="color:var(--chalk);font-weight:700;font-size:18px">${t.week} ${w} won!</p>`:''}
    ${nm()?`<p style="color:var(--chalk);font-family:var(--display);font-size:26px;font-weight:800;text-transform:uppercase;margin:12px 0 0">Well played, ${esc(nm())}${S.num?' · #'+esc(S.num):''}</p>`:''}
    <p>Score now <b class="num" style="color:var(--chalk)">${t.afl?after.big+'.'+after.small+' ('+after.pts+')':after.pts+' pts'}</b> · ${after.level}</p>
    ${newM.length?`<div class="newm">${newM.map(m=>`<div class="medal on"><div class="m">${m.m}</div><b>${esc(m.n)}</b><small>New medal · +${t.smallP}</small></div>`).join('')}</div>`:''}
    <button class="big" id="finok">Back to the rooms</button>`;
  document.body.appendChild(fin);
  confetti();
  document.getElementById('finok').onclick=()=>{fin.remove();document.getElementById('confetti').hidden=true;detail=null;tab='home';render();scrollTo(0,0);};
}

function completeIn(dow,counts,manual,w,lite){
  w=w||viewIWeek;
  const t=T(),{plan}=planWeek(),x=plan[dow],before=derived(),already=iDone(w,dow),resBefore=iResult(w,plan);
  if(counts){['sets','sprints','cond','skills'].forEach(k=>S.stats[k]+=counts[k]);}
  else if(manual&&APP_TYPES[x.type]){flatSteps(sessIn(x.type)).forEach(q=>{if(q.count==='set')S.stats.sets++;if(q.count==='sprint')S.stats.sprints++;if(q.count==='cond')S.stats.cond++;if(q.count==='skill')S.stats.skills++;});}
  if(!already)S.ilog[iKey(w,dow)]={at:Date.now(),type:x.type,manual:!!manual,lite:!!lite};
  save();
  const after=derived(),ML=MEDALS(after.weeks),newM=ML.filter(m=>after.medals.includes(m.id)&&!before.medals.includes(m.id));
  const isBig=x.type==='strength',won=resBefore!=='W'&&iResult(w,plan)==='W',word=isBig?t.bigW:t.smallW,pts=isBig?t.bigP:t.smallP;
  siren();buzz([200,100,200,100,400]);
  if(S.voice)say(already?'Session done. Great work'+(nm()?', '+nm():'')+'.':word+'! Great work'+(nm()?', '+nm():'')+'.');
  root.innerHTML='';
  const fin=document.createElement('div');fin.className='fin';fin.id='fin';
  fin.innerHTML=`<div class="goal">${already?'Done!':esc(word)+'!'}</div>
    <div class="sub">${already?'Extra session':'+'+pts+(pts===1?' point':' points')}</div>
    ${won&&!already?`<p style="color:var(--chalk);font-weight:700;font-size:18px">Week ${w} won!</p>`:''}
    ${nm()?`<p style="color:var(--chalk);font-family:var(--display);font-size:26px;font-weight:800;text-transform:uppercase;margin:12px 0 0">Well played, ${esc(nm())}${S.num?' · #'+esc(S.num):''}</p>`:''}
    <p>Score now <b class="num" style="color:var(--chalk)">${after.pts} pts</b> · ${after.level}</p>
    ${newM.length?`<div class="newm">${newM.map(m=>`<div class="medal on"><div class="m">${m.m}</div><b>${esc(m.n)}</b><small>New medal · +${t.smallP}</small></div>`).join('')}</div>`:''}
    <button class="big" id="finok">Back to the rooms</button>`;
  document.body.appendChild(fin);confetti();
  document.getElementById('finok').onclick=()=>{fin.remove();document.getElementById('confetti').hidden=true;detail=null;tab='home';render();scrollTo(0,0);};
}

/* ---------------- Confetti ---------------- */
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const t=T(),c=document.getElementById('confetti');c.hidden=false;const x=c.getContext('2d');
  const W=c.width=innerWidth*devicePixelRatio,H=c.height=innerHeight*devicePixelRatio;
  const cols=[t.pri,'#f4efe6','#111',t.pri,t.acc];
  const ps=Array.from({length:140},()=>({x:W/2,y:H*.35,vx:(Math.random()-.5)*W*.03,vy:-Math.random()*H*.025-H*.008,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,s:(6+Math.random()*8)*devicePixelRatio,c:cols[Math.floor(Math.random()*cols.length)]}));
  let f=0;(function loop(){x.clearRect(0,0,W,H);ps.forEach(p=>{p.vy+=H*.0009;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore();});
    if(++f<170&&document.getElementById('fin'))requestAnimationFrame(loop);else{x.clearRect(0,0,W,H);c.hidden=true;}})();
}

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){cancelNotifs();if(P){wake(true);tick();}}
  else if(P&&!P.paused){scheduleAhead();}
});
if(NATIVE&&NP.App){NP.App.addListener('backButton',()=>{
  if(sheetOpen){if(S.onboarded&&S.age&&S.sport)closeSheet();return;}
  if(P){const x=document.querySelector('#player [data-p="exit"]');if(x)x.click();return;}
  if(document.getElementById('fin')){const b=document.getElementById('finok');if(b)b.click();return;}
  if(detail){detail=null;render();scrollTo(0,0);return;}
  if(tab!=='home'){tab='home';render();scrollTo(0,0);return;}
  NP.App.minimizeApp&&NP.App.minimizeApp();
});
NP.App.addListener('appStateChange',st=>{if(st.isActive){cancelNotifs();if(P)tick();}else if(P&&!P.paused)scheduleAhead();});}

/* expose for tests */
window.__app={buildSession,flatSteps,estMin,derived,amountFor,exOf,S:()=>S,setState:o=>{S=migrate(clone(o));save();viewWeek=currentWeek();closeSheet();render();},phaseOf,setWeek:w=>{viewWeek=w;render();},
  startPlayer,fieldSVG,planWeek,sessIn,derivedIn,openSeasonSetup,setIWeek:w=>{viewIWeek=w;render();},tab:x=>{tab=x;detail=null;render();},open:d=>{detail=d;render();}};

if(inSeason())viewIWeek=seasonWeek();
render();
})();
