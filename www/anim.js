/* Full Season: animated exercise demos.
   A stick figure posed by absolute joint angles (degrees from straight down: 0 down, 90 forward, 180 up, -90 back).
   Side view faces right. Front view (view:'front') shows the figure facing you: a1/l1 = screen-left limbs. */
(function(){
"use strict";
const L={torso:36,neck:4,head:12.5,ua:19,fa:18,th:24,sh:24,ft:7},G=136,CX=100;
const V=(a,l)=>{const r=a*Math.PI/180;return [Math.sin(r)*l,Math.cos(r)*l];};
const add=(p,v)=>[p[0]+v[0],p[1]+v[1]];

/* ---- pose shorthands ---- */
const S0={t:180,a1:[4,4],a2:[-4,-4],l1:[0,0],l2:[0,0]};
const P=o=>Object.assign({},S0,o);
const squatDown={t:145,a1:[85,85],a2:[85,85],l1:[80,-25],l2:[80,-25]};
const plankHi={t:110,a1:[2,2],a2:[-2,-2],l1:[-70,-70,0],l2:[-70,-70,0]};
const supine={t:-90,a1:[80,80],a2:[85,85],l1:[140,-20],l2:[140,-20]};
const lunge={t:180,a1:[-10,-10],a2:[10,10],l2:[85,-8],l1:[-15,-85,5]};
const fStand={t:180,a1:[-8,-8],a2:[8,8],l1:[-5,-5],l2:[5,5]};
const kneel={t:180,a1:[30,150],a2:[30,150],l1:[0,-90,-90],l2:[0,-90,-90]};

/* ---- library: f = frames, k = [frame, move ms, hold ms] sequence, props drawn behind the figure ---- */
const A={
  squat:{f:[P({}),P(squatDown)]},
  bagsquat:{f:[P({a1:[30,160],a2:[30,160]}),P(Object.assign({},squatDown,{a1:[50,170],a2:[50,170]}))],props:[{pack:'h2'}]},
  wallsit:{f:[P({t:180,l1:[90,0],l2:[90,0],a1:[8,8],a2:[8,8]}),P({t:179,l1:[90,0],l2:[90,0],a1:[8,8],a2:[8,8]})],props:[{wall:-5}],hold:1},
  stepup:{f:[P({l2:[80,0],l1:[-5,-5]}),P({x:22,rest:20,l1:[0,0],l2:[0,0]})],props:[{box:[2,60,20]}]},
  splitsquat:{f:[P({l2:[22,-2],l1:[-22,-22,40]}),P({l2:[82,-8],l1:[-12,-80,5]})]},
  inclinepush:{f:[P({t:122,l1:[-58,-58,10],l2:[-58,-58,10],a1:[20,20],a2:[22,22]}),P({t:110,l1:[-70,-70,10],l2:[-70,-70,10],a1:[-75,25],a2:[-73,27]})],props:[{box:[38,70,34]}],anc:['h2',58,34]},
  bear:{f:[P({t:92,a1:[2,2],a2:[8,8],l1:[5,-85,0],l2:[15,-75,0]}),P({t:92,a1:[10,10],a2:[0,0],l1:[15,-75,0],l2:[5,-85,0]})],k:[[0,450,80],[1,450,80]]},
  pushup:{f:[P(plankHi),P({t:99,a1:[-100,14],a2:[-98,16],l1:[-81,-81,0],l2:[-81,-81,0]})]},
  widepush:'pushup',
  taps:{f:[P(plankHi),P(Object.assign({},plankHi,{a2:[95,-140]}))],k:[[0,350,150],[1,350,250]]},
  dips:{f:[P({t:180,a1:[-20,-20],a2:[-18,-18],l1:[80,5],l2:[80,5]}),P({t:180,a1:[-100,-5],a2:[-98,-4],l1:[88,70,170],l2:[88,70,170]})],props:[{box:[-60,-10,34]}],anc:['h2',-24,34]},
  walklunge:{f:[P({}),P(lunge)]},
  revlunge:{f:[P({}),P(lunge)]},
  curtsy:{f:[P({}),P(Object.assign({},lunge,{l1:[-8,-70,10]}))]},
  latlunge:{view:'front',f:[P(fStand),P({t:172,x:12,a1:[25,35],a2:[25,35],l2:[55,-8],l1:[-58,-58]})]},
  superman:{f:[P({t:90,a1:[92,92],a2:[90,90],l1:[-90,-90,-90],l2:[-90,-90,-90]}),P({t:100,a1:[-120,150],a2:[-118,152],l1:[-80,-80,-80],l2:[-80,-80,-80]})]},
  row:{f:[P({t:112,a1:[176,176],a2:[178,178],l1:[-68,-68,170],l2:[-68,-68,170]}),P({t:118,a1:[-55,165],a2:[-53,167],l1:[-62,-62,170],l2:[-62,-62,170]})],props:[{bar:[44,74]}],anc:['t2',-58,0]},
  bagrow:{f:[P({t:112,a1:[0,0],a2:[2,2],l1:[12,-6],l2:[12,-6]}),P({t:112,a1:[-70,10],a2:[-68,12],l1:[12,-6],l2:[12,-6]})],props:[{pack:'h2'}]},
  chinneg:{f:[P({t:180,a1:[160,195],a2:[162,197],l1:[0,0,40],l2:[0,0,40]}),P({t:180,a1:[178,178],a2:[180,180],l1:[0,0,40],l2:[0,0,40]})],k:[[0,600,300],[1,2200,400]],props:[{bar:[3,128]}],anc:['h2',3,128]},
  bridge:{f:[P(supine),P({t:-72,a1:[78,78],a2:[80,80],l1:[118,-6],l2:[118,-6]})]},
  slbridge:{f:[P(Object.assign({},supine,{l2:[118,118]})),P({t:-72,a1:[78,78],a2:[80,80],l1:[118,-6],l2:[100,100]})]},
  hipthrust:{f:[P({t:-128,a1:[0,0],a2:[0,0],l1:[125,-15],l2:[125,-15]}),P({t:-92,a1:[10,10],a2:[10,10],l1:[90,0],l2:[90,0]})],props:[{box:[-70,-30,28]}],anc:['S',-36,30]},
  crab:{f:[P({t:-125,a1:[-12,-12],a2:[-8,-8],l1:[125,-8],l2:[130,-2]}),P({t:-125,a1:[-6,-6],a2:[-14,-14],l1:[130,-2],l2:[125,-8]})],k:[[0,450,80],[1,450,80]]},
  plank:{f:[P({t:106,a1:[0,90],a2:[2,92],l1:[-74,-74,0],l2:[-74,-74,0]}),P({t:105,a1:[0,90],a2:[2,92],l1:[-75,-75,0],l2:[-75,-75,0]})],hold:1},
  deadbug:{f:[P({t:-90,a1:[180,180],a2:[180,180],l1:[180,90],l2:[180,90]}),P({t:-90,a1:[180,180],a2:[-100,-100],l1:[100,100],l2:[180,90]})]},
  birddog:{f:[P({t:90,a1:[0,0],a2:[2,2],l1:[0,-90,-90],l2:[0,-90,-90]}),P({t:90,a1:[0,0],a2:[88,88],l1:[-92,-92,-92],l2:[0,-90,-90]})],k:[[0,700,100],[1,700,700]]},
  sideplank:{view:'front',f:[P({t:108,a1:[0,90],a2:[178,178],l1:[-72,-72,0],l2:[-72,-72,0]}),P({t:107,a1:[0,90],a2:[180,180],l1:[-73,-73,0],l2:[-73,-73,0]})],hold:1},
  climbers:{f:[P(Object.assign({},plankHi,{l2:[35,-60,0]})),P(Object.assign({},plankHi,{l1:[35,-60,0],l2:[-70,-70,0]}))],k:[[0,280,40],[1,280,40]]},
  hollow:{f:[P({t:-100,a1:[-115,-115],a2:[-118,-118],l1:[100,100],l2:[100,100]}),P({t:-104,a1:[-120,-120],a2:[-122,-122],l1:[104,104],l2:[104,104]})],hold:1},
  frog:{f:[P(Object.assign({},squatDown,{a1:[-45,-45],a2:[-45,-45]})),P({t:155,x:28,air:28,a1:[140,140],a2:[140,140],l1:[-15,-30,40],l2:[-10,-25,40]}),P(Object.assign({},squatDown,{x:56,a1:[85,85],a2:[85,85]}))],k:[[0,0,250],[1,350,0],[2,350,500]],cx:-28},
  starjump:{view:'front',f:[P(fStand),P({t:180,air:5,a1:[-150,-150],a2:[150,150],l1:[-24,-24],l2:[24,24]})],k:[[0,250,60],[1,250,60]]},
  hops:{f:[P({l1:[0,0,90],l2:[0,0,90]}),P({air:9,l1:[0,0,40],l2:[0,0,40]})],k:[[0,180,30],[1,180,30]]},
  jumpsquat:{f:[P(squatDown),P({air:26,a1:[170,170],a2:[170,170],l1:[0,0,40],l2:[0,0,40]})],k:[[0,450,250],[1,350,100]]},
  broad:{f:[P(Object.assign({},squatDown,{a1:[-55,-55],a2:[-55,-55]})),P({t:150,x:30,air:24,a1:[130,130],a2:[130,130],l1:[-12,-20,50],l2:[-12,-20,50]}),P(Object.assign({},squatDown,{x:60}))],k:[[0,0,350],[1,350,0],[2,350,900]],cx:-30},
  skater:{view:'front',f:[P({t:166,x:-26,a1:[40,40],a2:[-30,-30],l2:[12,-8],l1:[30,55]}),P({t:194,x:26,a1:[30,30],a2:[-40,-40],l1:[-12,8],l2:[-30,-55]})],k:[[0,420,350],[1,420,350]]},
  tuck:{f:[P({}),P({air:28,a1:[60,60],a2:[60,60],l1:[125,-5,60],l2:[125,-5,60]})],k:[[0,300,250],[1,300,80]]},
  stick:{f:[P({}),P({air:18,a1:[150,150],a2:[150,150],l1:[0,0,40],l2:[0,0,40]}),P(Object.assign({},squatDown,{t:150,l1:[65,-20],l2:[65,-20]}))],k:[[0,400,200],[1,300,0],[2,250,1100]]},
  stork:{f:[P({a1:[88,88],a2:[90,90],l2:[85,-5]}),P({t:178,a1:[86,86],a2:[92,92],l2:[85,-5]})],hold:1},
  reach:{f:[P({t:175,a1:[90,90],a2:[90,90],l1:[8,-10],l2:[70,70]}),P({t:140,a1:[95,95],a2:[95,95],l1:[30,-20],l2:[-60,-60,0]})]},
  hopstick:{f:[P({l1:[-5,-80,10]}),P({x:16,air:14,a1:[60,60],a2:[60,60],l1:[-5,-80,10],l2:[-10,-10,40]}),P({x:32,t:155,a1:[70,70],a2:[70,70],l1:[-5,-80,10],l2:[55,-15]})],k:[[0,0,300],[1,280,0],[2,280,1000]],cx:-16},
  lathop:{view:'front',f:[P({t:180,x:-18,a1:[-30,-30],a2:[30,30],l1:[0,0],l2:[25,60]}),P({t:180,x:0,air:12,a1:[-50,-50],a2:[50,50],l1:[0,0,-90],l2:[25,60]}),P({t:172,x:18,a1:[-35,-35],a2:[35,35],l1:[-30,-55],l2:[12,-8]})],k:[[0,0,300],[1,260,0],[2,260,1000]]},
  calf:{f:[P({l1:[0,0,90],l2:[0,0,90]}),P({l1:[0,0,35],l2:[0,0,35]})]},
  slcalf:{f:[P({l1:[-5,-80,10],l2:[0,0,95],rest:16}),P({l1:[-5,-80,10],l2:[0,0,35],rest:16})],props:[{box:[-8,30,16]}]},
  squeeze:{f:[P(supine),P(supine)],props:[{ball:'k2'}],hold:1},
  nordic:{f:[P(kneel),P({t:125,a1:[45,45],a2:[48,48],l1:[-55,-90,-90],l2:[-55,-90,-90]})],k:[[0,700,300],[1,2600,300]],props:[{pad:-48}],anc:['k2',0,0]},
  copen:{view:'front',f:[P({t:108,a1:[0,90],a2:[178,178],l1:[-78,-60,-150],l2:[-72,-72,0]}),P({t:107,a1:[0,90],a2:[180,180],l1:[-79,-60,-150],l2:[-73,-73,0]})],props:[{box:[-80,-40,26]}],hold:1},
  neck:{f:[P({a2:[125,-150],a1:[120,-148]}),P({hd:8,a2:[125,-150],a1:[120,-148]})],hold:1},
  armcircle:{view:'front',f:[P({a1:[-90,-90],a2:[90,90]}),P({a1:[-100,-100],a2:[100,100]}),P({a1:[-90,-90],a2:[90,90]}),P({a1:[-80,-80],a2:[80,80]})],k:[[0,220,0],[1,220,0],[2,220,0],[3,220,0]]},
  ytw:{view:'front',f:[P({a1:[-150,-150],a2:[150,150]}),P({a1:[-90,-90],a2:[90,90]}),P({a1:[-70,-160],a2:[70,160]})],k:[[0,600,600],[1,600,600],[2,600,600]]},
  scappush:{f:[P(plankHi),P(Object.assign({},plankHi,{t:107}))]},
  wallslide:{view:'front',f:[P({a1:[-80,-175],a2:[80,175]}),P({a1:[-155,-160],a2:[155,160]})]},
  extrot:{view:'front',f:[P({a1:[-4,-4],a2:[8,-75]}),P({a1:[-4,-4],a2:[8,75]})],props:[{band:'h2'}]}
};

/* ---- geometry ---- */
function joints(p,front){
  const j={},H=[0,0];j.H=H;
  j.S=add(H,V(p.t,L.torso));const ht=p.t+(p.hd||0);
  j.N=add(j.S,V(ht,L.neck));j.C=add(j.N,V(ht,L.head));
  [['1',p.a1],['2',p.a2]].forEach(([s,a])=>{j['e'+s]=add(j.S,V(a[0],L.ua));j['h'+s]=add(j['e'+s],V(a[1],L.fa));});
  [['1',p.l1,-1],['2',p.l2,1]].forEach(([s,l,sg])=>{j['k'+s]=add(H,V(l[0],L.th));j['a'+s]=add(j['k'+s],V(l[1],L.sh));
    const fa=l[2]!=null?l[2]:(front?l[1]+90*sg:90);j['t'+s]=add(j['a'+s],V(fa,L.ft));});
  return j;
}
function place(p,j,cx){
  let dx=CX+(cx||0)+(p.x||0),dy;
  if(p.anc){const q=j[p.anc[0]];dx=CX+p.anc[1]-q[0];dy=G-p.anc[2]-q[1];}
  else{let m=-1e9;for(const k in j){let y=j[k][1];if(k==='C')y+=L.head;if(k!=='H'&&k!=='S'&&k!=='N')y+=3.5;else y+=3.5;m=Math.max(m,y);}dy=G-(p.rest||0)-(p.air||0)-m;}
  const o={};for(const k in j)o[k]=[j[k][0]+dx,j[k][1]+dy];return o;
}
function lerp(a,b,t){
  if(typeof a==='number')return a+(b-a)*t;
  if(Array.isArray(a))return a.map((v,i)=>lerp(v,b[i]==null?v:b[i],t));
  if(a&&typeof a==='object'){const o={};for(const k in a)o[k]=b[k]==null?a[k]:lerp(a[k],b[k],t);for(const k in b)if(!(k in o))o[k]=b[k];return o;}
  return b;
}
const ease=t=>.5-Math.cos(Math.PI*t)/2;
function def(id){let d=A[id];if(typeof d==='string')d=A[d];return d;}
function seq(d){return d.k||[[0,d.hold?1400:750,d.hold?200:300],[1,d.hold?1400:750,d.hold?200:300]];}
function poseAt(d,ms){
  const k=seq(d),tot=k.reduce((a,x)=>a+x[1]+x[2],0);let t=ms%tot;
  for(let i=0;i<k.length;i++){
    const [fi,mv,hd]=k[i],prev=d.f[k[(i-1+k.length)%k.length][0]],cur=d.f[fi];
    if(t<mv)return lerp(prev,cur,ease(t/mv));t-=mv;
    if(t<hd)return cur;t-=hd;
  }
  return d.f[k[0][0]];
}
/* resolve anchors so anchored poses interpolate in placed space */
function frameJoints(d,ms){const p=poseAt(d,ms);return {p,j:place(p,joints(p,d.view==='front'),d.cx)};}

/* ---- drawing ---- */
const seg=(a,b,c,w)=>`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w||6}" stroke-linecap="round"/>`;
function propsSVG(d,j){
  let s='';(d.props||[]).forEach(pr=>{
    if(pr.box){const [x1,x2,h]=pr.box;s+=`<rect x="${CX+x1}" y="${G-h+3}" width="${x2-x1}" height="${h}" rx="3" fill="#c98f55" stroke="#140f10" stroke-width="2"/><line x1="${CX+x1+3}" y1="${G-h+9}" x2="${CX+x2-3}" y2="${G-h+9}" stroke="#a8743f" stroke-width="2"/>`;}
    if(pr.wall!=null)s+=`<rect x="${CX+pr.wall-10}" y="${G-120}" width="10" height="123" fill="#e9d5b4" stroke="#140f10" stroke-width="2"/>`;
    if(pr.bar){const [x,h]=pr.bar;s+=`<line x1="${CX+x+26}" y1="${G-h}" x2="${CX+x+26}" y2="${G+3}" stroke="#4b5563" stroke-width="4"/><line x1="${CX+x-26}" y1="${G-h}" x2="${CX+x+28}" y2="${G-h}" stroke="#140f10" stroke-width="6" stroke-linecap="round"/><line x1="${CX+x-26}" y1="${G-h}" x2="${CX+x+28}" y2="${G-h}" stroke="#9ca3af" stroke-width="3.5" stroke-linecap="round"/>`;}
    if(pr.pad!=null)s+=`<rect x="${CX+pr.pad-10}" y="${G-12}" width="18" height="15" rx="5" fill="var(--gold)" stroke="#140f10" stroke-width="2"/>`;
  });return s;
}
function propsFront(d,j){
  let s='';(d.props||[]).forEach(pr=>{
    if(pr.ball){const q=j[pr.ball];s+=`<circle cx="${q[0].toFixed(1)}" cy="${(q[1]).toFixed(1)}" r="7.5" fill="var(--gold)" stroke="#140f10" stroke-width="2"/>`;}
    if(pr.pack){const q=j[pr.pack];s+=`<rect x="${(q[0]-9).toFixed(1)}" y="${(q[1]-7).toFixed(1)}" width="18" height="20" rx="5" fill="#3b82f6" stroke="#140f10" stroke-width="2"/><rect x="${(q[0]-5).toFixed(1)}" y="${(q[1]+1).toFixed(1)}" width="10" height="7" rx="2" fill="#2563eb" stroke="#140f10" stroke-width="1.4"/>`;}
    if(pr.band){const q=j[pr.band];s+=`<line x1="${(q[0]).toFixed(1)}" y1="${q[1].toFixed(1)}" x2="${CX-62}" y2="${q[1].toFixed(1)}" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round"/><rect x="${CX-68}" y="${(q[1]-10).toFixed(1)}" width="7" height="20" rx="2" fill="#6b7280" stroke="#140f10" stroke-width="1.5"/>`;}
  });return s;
}
/* Cartoon character: outlined rounded limbs, big head with a face, kit in the sport's colours. */
const INK='#140f10',SKIN='#f0b48c',SKIN_D='#d99a73',HAIR='#3b2417',SHORTS='#1d2433',SOCK='#f4efe6',BOOT='#18181b';
const f1=n=>n.toFixed(1);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const ln=(a,b,c,w,extra)=>`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra||''}/>`;
/* a limb: outline, then colour bands along it (list of [fromFrac,toFrac,colour]) */
function limb(a,b,w,bands,shade){
  let o=ln(a,b,INK,w+3.6);
  bands.forEach(([p,q,c])=>{o+=ln(mix(a,b,p),mix(a,b,q),c,w);});
  if(shade)o+=ln(a,b,'rgba(0,0,0,.22)',w);
  return o;
}
function armSVG(j,s,shade){
  const S=j.S,E=j['e'+s],Hn=j['h'+s];
  return limb(S,E,8.5,[[0,.55,'var(--red)'],[.55,1,SKIN]],shade)+limb(E,Hn,7.5,[[0,1,SKIN]],shade)
    +`<circle cx="${f1(Hn[0])}" cy="${f1(Hn[1])}" r="5" fill="${shade?SKIN_D:SKIN}" stroke="${INK}" stroke-width="1.8"/>`;
}
function legSVG(j,s,shade){
  const H=j.H,K=j['k'+s],A=j['a'+s],T=j['t'+s];
  return limb(H,K,10.5,[[0,.6,SHORTS],[.6,1,SKIN]],shade)
    +limb(K,A,9,[[0,.3,SKIN],[.3,1,SOCK]],shade)+ln(mix(K,A,.34),mix(K,A,.42),'var(--red)',9)
    +ln(mix(A,T,-.25),mix(A,T,1.05),INK,10.5)+ln(mix(A,T,-.2),T,BOOT,7.5);
}
function headSVG(j,p,front){
  const C=j.C,r=L.head,rot=((p.t+(p.hd||0))-180);
  let face;
  if(front){
    face=`<path d="M${-r},-1 A${r} ${r} 0 0 1 ${r},-1 Q${r*.4},${-r*.55} 0,${-r*.6} Q${-r*.4},${-r*.55} ${-r},-1Z" fill="${HAIR}"/>`
      +`<ellipse cx="-4.2" cy="1.2" rx="1.6" ry="2.1" fill="${INK}"/><ellipse cx="4.2" cy="1.2" rx="1.6" ry="2.1" fill="${INK}"/><circle cx="-3.7" cy=".5" r=".6" fill="#fff"/><circle cx="4.7" cy=".5" r=".6" fill="#fff"/>`
      +`<path d="M-3.6 5.2 Q0 8.4 3.6 5.2" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
      +`<circle cx="-6.4" cy="4.6" r="1.6" fill="#ef8a7a" opacity=".55"/><circle cx="6.4" cy="4.6" r="1.6" fill="#ef8a7a" opacity=".55"/>`;
  } else {
    face=`<path d="M${-r},1 A${r} ${r} 0 0 1 ${r*.85},${-r*.5} Q${r*.2},${-r*.25} ${-r*.1},${-r*.15} Q${-r*.5},${r*.1} ${-r*.55},${r*.55} Q${-r*.9},${r*.55} ${-r},1Z" fill="${HAIR}"/>`
      +`<ellipse cx="-2.6" cy="2" rx="1.8" ry="2.4" fill="${SKIN_D}"/>`
      +`<ellipse cx="6" cy="0.4" rx="1.6" ry="2.1" fill="${INK}"/><circle cx="6.5" cy="-0.3" r=".6" fill="#fff"/><path d="M4 -3.6 Q6.4 -4.6 8.6 -3.6" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`
      +`<path d="M5.6 6 Q8.4 7.8 10.4 5.4" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
      +`<circle cx="8.4" cy="3.8" r="1.6" fill="#ef8a7a" opacity=".6"/>`;
  }
  return `<g transform="translate(${f1(C[0])} ${f1(C[1])}) rotate(${f1(rot)})"><circle r="${r}" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>${face}</g>`;
}
function torsoSVG(j,front){
  const H=j.H,S=j.S,w=front?21:18;
  return ln(H,S,INK,w+3.6)+ln(mix(H,S,-.05),S,'var(--red)',w)
    +ln(mix(H,S,.08),mix(H,S,.22),'rgba(255,255,255,.28)',w*.62)
    +ln(H,mix(H,S,.06),SHORTS,w)
    +ln(S,j.N,INK,7.5)+ln(S,j.N,SKIN,4.5);
}
function svgAt(id,ms,fi){
  const d=def(id);if(!d)return '';
  const fr=d.view==='front';
  let p,j;
  if(fi!=null){p=d.f[fi];j=place(p,joints(p,fr),d.cx);}else{const r=frameJoints(d,ms);p=r.p;j=r.j;}
  const air=Math.max(0,G-(Math.max(j.t1[1],j.t2[1])+3.5));
  let s=`<rect width="200" height="150" fill="#d6ecfa"/><circle cx="172" cy="24" r="12" fill="#ffe08a"/>`
    +`<g fill="#fff" opacity=".9"><ellipse cx="38" cy="26" rx="16" ry="6"/><ellipse cx="50" cy="22" rx="11" ry="7"/><ellipse cx="128" cy="40" rx="13" ry="5"/></g>`
    +`<rect x="0" y="${G+3}" width="200" height="${150-G}" fill="#7cc86a"/><rect x="0" y="${G+3}" width="200" height="2.5" fill="#5aa84a"/>`;
  s+=`<ellipse cx="${f1(j.H[0])}" cy="${G+5}" rx="${f1(Math.max(10,26-air*.35))}" ry="3.4" fill="rgba(0,0,0,.22)"/>`;
  s+=propsSVG(d,j);
  s+=legSVG(j,'1',!fr)+armSVG(j,'1',!fr);
  s+=torsoSVG(j,fr)+headSVG(j,p,fr);
  s+=legSVG(j,'2',false)+armSVG(j,'2',false);
  s+=propsFront(d,j);
  return s;
}
const has=id=>!!def(id);

/* ---- one animation loop drives every demo on screen ---- */
let raf=0,t0=performance.now(),last=0;
function tick(now){
  const els=document.querySelectorAll('svg[data-demo]');
  if(!els.length){raf=0;return;}
  if(now-last<33){raf=requestAnimationFrame(tick);return;}last=now;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  els.forEach(el=>{const id=el.dataset.demo,off=+(el.dataset.off||0);el.innerHTML=svgAt(id,reduce?seq(def(id))[0][1]+1:(now-t0+off));});
  raf=requestAnimationFrame(tick);
}
function start(){if(!raf)raf=requestAnimationFrame(tick);}
function svg(id,cls,vb){if(!has(id))return '';start();return `<svg class="${cls||'demo'}" viewBox="${vb||'0 0 200 150'}" data-demo="${id}" role="img" aria-label="Animated demonstration">${svgAt(id,0)}</svg>`;}
window.Demo={svg,has,svgAt,frames:id=>def(id).f.length,start,ids:()=>Object.keys(A)};
})();
