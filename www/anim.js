/* Full Season: animated exercise demos.
   A stick figure posed by absolute joint angles (degrees from straight down: 0 down, 90 forward, 180 up, -90 back).
   Side view faces right. Front view (view:'front') shows the figure facing you: a1/l1 = screen-left limbs. */
(function(){
"use strict";
const TOP=15,L={torso:36,neck:4,head:12.5,ua:19,fa:18,th:24,sh:24,ft:7},G=136,CX=100;
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
  stepup:{f:[P({l2:[60,0],l1:[-5,-5]}),P({x:22,rest:12,l1:[0,0],l2:[0,0]})],props:[{box:[2,60,12]}]},
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
  slcalf:{f:[P({l1:[-5,-80,10],l2:[0,0,95],rest:10}),P({l1:[-5,-80,10],l2:[0,0,35],rest:10})],props:[{box:[-8,30,10]}]},
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
  /* limb roots: arms hang from just below the neck; facing you, shoulders and hips sit out to each side (1 = screen-left) */
  const tl=Math.hypot(j.S[0],j.S[1])||1,tu=[j.S[0]/tl,j.S[1]/tl],tn=[-tu[1],tu[0]];
  const root=(base,down,side)=>[base[0]-tu[0]*down+tn[0]*side,base[1]-tu[1]*down+tn[1]*side];
  j.r1=root(j.S,front?4:0,front?-8.2:0);j.r2=root(j.S,front?4:0,front?8.2:0);
  j.p1=root(H,0,front?-4.4:0);j.p2=root(H,0,front?4.4:0);
  [['1',p.a1],['2',p.a2]].forEach(([s,a])=>{j['e'+s]=add(j['r'+s],V(a[0],L.ua));j['h'+s]=add(j['e'+s],V(a[1],L.fa));});
  [['1',p.l1,-1],['2',p.l2,1]].forEach(([s,l,sg])=>{j['k'+s]=add(j['p'+s],V(l[0],L.th));j['a'+s]=add(j['k'+s],V(l[1],L.sh));
    const fa=l[2]!=null?l[2]:(front?l[1]+90*sg:90);j['t'+s]=add(j['a'+s],V(fa,L.ft));});
  return j;
}
function place(p,j,cx){
  let dx=CX+(cx||0)+(p.x||0),dy;
  if(p.anc){const q=j[p.anc[0]];dx=CX+p.anc[1]-q[0];dy=G-p.anc[2]-q[1];}
  else{let m=-1e9;for(const k in j){let y=j[k][1];if(k==='C')y+=L.head-1;else if(k==='H'||k==='S')y+=Math.max(3.5,6.5*Math.abs(Math.sin(p.t*Math.PI/180)));else y+=3.5;m=Math.max(m,y);}dy=G-(p.rest||0)-(p.air||0)-m;
    /* keep jumps inside the frame (thumbnails crop to y>=8, see THUMB): lower the jump height if the head would go off the top */
    if(p.air){let top=1e9;for(const k in j){let y=j[k][1];if(k==='C')y-=L.head+2;else if(k[0]==='h')y-=9;else y-=6;top=Math.min(top,y);}const over=TOP-(top+dy);if(over>0)dy+=Math.min(p.air,over);}}
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
/* Cartoon character: tapered outlined limbs, shaped body, kit in the sport's colours
   (jumper = --red, trim = --red-deep, chest band = --gold), hands, boots, a face with hair and ears. */
const INK='#140f10',SKIN='#f0b48c',SKIN_D='#d99a73',HAIR='#3b2417',SHORTS='#1d2433',SHORTS_L='#2c3547',SOCK='#f4efe6',BOOT='#18181b',SOLE='#52525b';
const PRI='var(--red)',DEEP='var(--red-deep)',ACC='var(--gold)',OL=1.9;
const f1=n=>n.toFixed(1);
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const unit=v=>{const l=Math.hypot(v[0],v[1])||1;return [v[0]/l,v[1]/l];};
const nrm=u=>[-u[1],u[0]];
const ln=(a,b,c,w,extra)=>`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra||''}/>`;
/* tapered capsule from a (radius ra) to b (radius rb), as path data */
function capD(a,b,ra,rb){
  const u=unit(sub(b,a)),n=nrm(u);
  const p=(c,r,s)=>`${f1(c[0]+n[0]*r*s)} ${f1(c[1]+n[1]*r*s)}`;
  return `M${p(a,ra,1)}L${p(b,rb,1)}A${f1(rb)} ${f1(rb)} 0 0 0 ${p(b,rb,-1)}L${p(a,ra,-1)}A${f1(ra)} ${f1(ra)} 0 0 0 ${p(a,ra,1)}Z`;
}
/* A body part is a list of shapes [pathData(grow), fill, outlined?]. Drawn as one silhouette outline, then fills, then optional shade. */
function Part(){
  const sh=[];
  return {
    cap(a,b,ra,rb,fill,ol){sh.push([g=>capD(a,b,ra+g,rb+g),fill,ol!==false]);return this;},
    ell(c,rx,ry,rot,fill,ol){sh.push([g=>{const r=rot*Math.PI/180,ux=Math.cos(r),uy=Math.sin(r),X=rx+g,Y=ry+g,
      p=(s)=>`${f1(c[0]+ux*X*s)} ${f1(c[1]+uy*X*s)}`;return `M${p(1)}A${f1(X)} ${f1(Y)} ${f1(rot)} 1 0 ${p(-1)}A${f1(X)} ${f1(Y)} ${f1(rot)} 1 0 ${p(1)}Z`;},fill,ol!==false]);return this;},
    raw(svg){sh.push([null,svg,false]);return this;},
    /* flat stripe across a limb between a and b, w wide */
    band(a,b,w,col){sh.push([null,`<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${col}" stroke-width="${f1(w)}"/>`,false]);return this;},
    svg(shade){
      let o='',f='',s='';
      sh.forEach(([d,fill,ol])=>{
        if(!d){f+=fill;return;}
        if(ol)o+=`<path d="${d(OL)}" fill="${INK}"/>`;
        f+=`<path d="${d(0)}" fill="${fill}"/>`;
        if(shade&&ol)s+=`<path d="${d(0)}" fill="rgba(20,15,16,.24)"/>`;
      });
      return o+f+s;
    }
  };
}
function armSVG(j,s,shade,front){
  const S=j['r'+s],E=j['e'+s],Hn=j['h'+s],u=unit(sub(Hn,E)),ang=Math.atan2(u[1],u[0])*180/Math.PI,n=nrm(u);
  const pt=Part();
  pt.cap(S,E,4.5,3.7,SKIN).cap(E,Hn,3.7,3,SKIN)
    .cap(S,mix(S,E,.48),5.3,4.9,PRI)
    .band(mix(S,E,.4),mix(S,E,.48),9.9,DEEP)
    .ell([Hn[0]+u[0]*2.6,Hn[1]+u[1]*2.6],4.4,3.6,ang,SKIN)
    .ell([Hn[0]+u[0]*1.4+n[0]*(s==='1'?-3:3)*(front?1:-1),Hn[1]+u[1]*1.4+n[1]*(s==='1'?-3:3)*(front?1:-1)],2.3,1.6,ang+35,SKIN);
  return pt.svg(shade);
}
function legSVG(j,s,shade,front){
  const H=j['p'+s],K=j['k'+s],A=j['a'+s],T=j['t'+s];
  const u=unit(sub(T,A)),n=nrm(u),side=front?(s==='1'?1:-1):1;
  const heel=[A[0]-u[0]*2.6,A[1]-u[1]*2.6],toe=[T[0]+u[0]*1.2,T[1]+u[1]*1.2];
  const r=(t)=>4.5+(3.4-4.5)*t;
  const pt=Part();
  pt.cap(H,K,6.2,4.7,SKIN).cap(K,A,4.7,3.4,SKIN)
    .ell(mix(K,A,.3),5,4.3,Math.atan2(A[1]-K[1],A[0]-K[0])*180/Math.PI,SKIN,false)
    .cap(mix(K,A,.36),A,r(.36)+.25,3.65,SOCK)
    .band(mix(K,A,.43),mix(K,A,.5),2*r(.46)+.4,PRI)
    .band(mix(K,A,.55),mix(K,A,.6),2*r(.57)+.4,DEEP)
    .cap(H,mix(H,K,.56),7.4,6.9,SHORTS)
    .band(mix(H,K,.5),mix(H,K,.56),14.4,SHORTS_L)
    .cap(heel,toe,4.3,3.5,BOOT)
    .raw(ln([heel[0]+n[0]*side*3.4,heel[1]+n[1]*side*3.4],[toe[0]+n[0]*side*2.6,toe[1]+n[1]*side*2.6],SOLE,1.8))
    .raw(ln([heel[0]-n[0]*side*.6+u[0]*1.6,heel[1]-n[1]*side*.6+u[1]*1.6],[heel[0]-n[0]*side*1.4+u[0]*4.6,heel[1]-n[1]*side*1.4+u[1]*4.6],'#fff',1.3,' opacity=".85"'));
  return pt.svg(shade);
}
function torsoSVG(j,front){
  const H=j.H,S=j.S,u=unit(sub(S,H)),n=nrm(u),wh=front?9.6:7.6,wc=front?11.2:8.6;
  const at=(t,o)=>{const c=mix(H,S,t);return [c[0]+n[0]*o,c[1]+n[1]*o];};
  const pt=Part();
  /* jumper: flat-hemmed lower half (outline band then fill) under a capsule chest with round shoulders */
  const j0=mix(H,S,-.06),j1=mix(H,S,.42),ju=[u[0]*OL,u[1]*OL];
  pt.cap(S,j.N,3.3,3.1,SKIN)
    .band([j0[0]-ju[0],j0[1]-ju[1]],j1,2*wh+2*OL,INK)
    .band(j0,j1,2*wh,PRI)
    .cap(mix(H,S,.36),mix(H,S,.97),wh+(wc-wh)*.36,wc,PRI)
    .band(mix(H,S,.52),mix(H,S,.64),2*(wh+(wc-wh)*.58),ACC);
  /* shorts waist: a flat band over the bottom of the jumper (outline first) */
  const w0=mix(H,S,-.1),w1=mix(H,S,.13),wu=[u[0]*OL,u[1]*OL];
  if(front)pt.band([w0[0]-wu[0],w0[1]-wu[1]],[w1[0]+wu[0],w1[1]+wu[1]],2*wh+1.4+2*OL,INK).band(w0,w1,2*wh+1.4,SHORTS);
  else pt.cap(mix(H,S,-.02),mix(H,S,.08),wh+.6,wh+.5,SHORTS); /* side on: rounded seat so no corner sticks out */
  pt.band(mix(H,S,.09),mix(H,S,.13),2*wh+(front?1.4:.6),SHORTS_L);
  if(front){
    const V=mix(S,H,.16),a=[S[0]+n[0]*4.6,S[1]+n[1]*4.6],b=[S[0]-n[0]*4.6,S[1]-n[1]*4.6];
    pt.raw(`<path d="M${f1(a[0])} ${f1(a[1])}L${f1(V[0])} ${f1(V[1])}L${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${DEEP}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`);
  } else {
    const c=at(.97,wc*.45);pt.ell(c,3.6,1.9,Math.atan2(n[1],n[0])*180/Math.PI,DEEP,false);
  }
  return pt.svg(false);
}
function headSVG(j,p,front){
  const C=j.C,r=L.head,rot=((p.t+(p.hd||0))-180);
  let o,face;
  if(front){
    o=`<ellipse cx="${-r+.6}" cy="1.6" rx="2.9" ry="3.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.9"/><ellipse cx="${r-.6}" cy="1.6" rx="2.9" ry="3.6" fill="${SKIN}" stroke="${INK}" stroke-width="1.9"/>`
      +`<circle r="${r}" fill="${SKIN}" stroke="${INK}" stroke-width="2.2"/>`;
    face=`<path d="M${-r+.4},1 C${-r-.4},${-r*1.3} ${r+.4},${-r*1.3} ${r-.4},1 L${r*.82},-2.2 L${r*.58},-5.4 L${r*.32},-3 L${r*.05},-6.2 L${-r*.22},-3.2 L${-r*.5},-5.8 L${-r*.72},-2.4 Z" fill="${HAIR}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`
      +`<path d="M-6.6 -1.6 Q-4.4 -3 -2.4 -1.9M2.4 -1.9 Q4.4 -3 6.6 -1.6" fill="none" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round"/>`
      +`<ellipse cx="-4.3" cy="1.6" rx="1.7" ry="2.2" fill="${INK}"/><ellipse cx="4.3" cy="1.6" rx="1.7" ry="2.2" fill="${INK}"/><circle cx="-3.8" cy=".8" r=".7" fill="#fff"/><circle cx="4.8" cy=".8" r=".7" fill="#fff"/>`
      +`<path d="M-.3 3.4 Q.9 5 -.6 5.4" fill="none" stroke="${SKIN_D}" stroke-width="1.3" stroke-linecap="round"/>`
      +`<path d="M-3.6 7 Q0 9.8 3.6 7" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
      +`<circle cx="-6.8" cy="5.2" r="1.8" fill="#ef8a7a" opacity=".55"/><circle cx="6.8" cy="5.2" r="1.8" fill="#ef8a7a" opacity=".55"/>`;
  } else {
    o=`<circle cx="${r-.8}" cy="3.2" r="2.6" fill="${INK}"/><circle r="${r+1.1}" fill="${INK}"/>`
      +`<circle r="${r}" fill="${SKIN}"/><circle cx="${r-.8}" cy="3.2" r="1.6" fill="${SKIN}"/>`;
    face=`<path d="M${-r+.2},2.6 C${-r*1.12},${-r*1.15} ${r*.75},${-r*1.35} ${r*.98},${-r*.3} L${r*.7},-2.6 L${r*.5},-5 L${r*.3},-2.2 L${r*.05},-4.6 L${-r*.12},-1 Q${-r*.42},${r*.12} ${-r*.5},${r*.62} Q${-r*.86},${r*.66} ${-r+.2},2.6Z" fill="${HAIR}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`
      +`<ellipse cx="-2.3" cy="2.4" rx="2.4" ry="3.1" fill="${SKIN}" stroke="${INK}" stroke-width="1.4"/><path d="M-2.6 1.2 Q-1.6 2.4 -2.6 3.6" fill="none" stroke="${SKIN_D}" stroke-width="1.2" stroke-linecap="round"/>`
      +`<path d="M3.8 -2.4 Q6 -3.6 8.4 -2.6" fill="none" stroke="${HAIR}" stroke-width="1.5" stroke-linecap="round"/>`
      +`<ellipse cx="6.1" cy="1" rx="1.6" ry="2.2" fill="${INK}"/><circle cx="6.6" cy=".2" r=".65" fill="#fff"/>`
      +`<path d="M5.2 7 Q8 8.8 10.2 6.6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`
      +`<circle cx="8" cy="4.8" r="1.7" fill="#ef8a7a" opacity=".6"/>`;
  }
  return `<g transform="translate(${f1(C[0])} ${f1(C[1])}) rotate(${f1(rot)})">${o}${face}</g>`;
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
  if(fr){ /* facing you: both legs behind the body, both arms in front */
    s+=legSVG(j,'1',false,fr)+legSVG(j,'2',false,fr)+torsoSVG(j,fr)+headSVG(j,p,fr)+armSVG(j,'1',false,fr)+armSVG(j,'2',false,fr);
  } else { /* side on: far limbs shaded and behind, near limbs in front */
    s+=legSVG(j,'1',true,fr)+armSVG(j,'1',true,fr);
    s+=torsoSVG(j,fr)+headSVG(j,p,fr);
    s+=legSVG(j,'2',false,fr)+armSVG(j,'2',false,fr);
  }
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
/* thumbnail crop: 4:3, trimmed a little off each side but keeping heads, boots and the grass in view */
const THUMB='10 8 180 135';
window.Demo={THUMB,svg,has,svgAt,frames:id=>def(id).f.length,start,ids:()=>Object.keys(A)};
})();
