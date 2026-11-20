/* Full Season: sports, age bands and the exercise library.
   Safety basis (summarised in the app's "Train safe" screen):
   - Youth resistance training is safe and effective with good technique and supervision
     (NSCA 2009 position statement; 2014 International Consensus, BJSM).
   - Long-Term Athlete Development stages set the age bands: 6-8 FUNdamentals, 9-11 Learn to Train,
     12-14 Train to Train (around the growth spurt), 15-17 Train to Compete.
   - Injury-prevention content follows FIFA 11+, Netball Australia's KNEE program and World Rugby Activate
     (landing, balance, Nordic hamstring and Copenhagen adductor work, neck strength for collision sports).
   - No body weight or BMI is asked: in children these are poor guides to safe training load.
     Load is set by age, training experience and whether the athlete is in a growth spurt. */
(function(){
"use strict";

/* ---------- Age bands ----------
   mul: rep multiplier vs the 12-14 base. tmul: hold-time multiplier.
   rounds: circuit rounds per phase [Foundations, Build, Reload, Match Fit].
   plyo: max jump contacts in the circuit per session. rest: rest multiplier on conditioning. */
const BANDS={
  mini:  {id:'mini',  label:'6–8',  stage:'FUNdamentals',     min:6, max:8,  mul:.55,tmul:.6, rounds:[2,2,1,2],sprint:.6, cond:.55,skillT:90, plyo:40, tempo:false,rest:1.6,
          note:'Play first. Short, fun bursts with plenty of rest. Bodyweight only, no maximum efforts.'},
  junior:{id:'junior',label:'9–11', stage:'Learn to Train',    min:9, max:11, mul:.75,tmul:.75,rounds:[2,2,2,2],sprint:.8, cond:.75,skillT:120,plyo:60, tempo:false,rest:1.3,
          note:'The best age to learn skills and speed. Bodyweight strength with perfect technique.'},
  teen:  {id:'teen',  label:'12–14',stage:'Train to Train',    min:12,max:14, mul:1,  tmul:1,  rounds:[2,3,2,3],sprint:1,  cond:.9, skillT:150,plyo:80, tempo:true, rest:1.1,
          note:'Growth-spurt years. Build the engine and strength steadily. Ease off jumps if you are growing fast.'},
  senior:{id:'senior',label:'15–18',stage:'Train to Compete',  min:15,max:18, mul:1.2,tmul:1.2,rounds:[3,3,2,3],sprint:1.15,cond:1.1,skillT:180,plyo:100,tempo:true, rest:1,
          note:'Ready for more volume and intensity. Keep 2 rest days a week and sleep 8–10 hours.'}
};
function bandFor(age){if(age<=8)return BANDS.mini;if(age<=11)return BANDS.junior;if(age<=14)return BANDS.teen;return BANDS.senior;}

const EXPERIENCE={new:{n:'New to training',mul:.85},some:{n:'Play a bit',mul:1},lots:{n:'Train most weeks',mul:1.1}};

/* Four phases across 8 weeks. Week 5 is a lighter reload week. */
const PHASES=[
  {name:'Foundations',weeks:'Wk 1–2',f:1,   note:'Nail the technique.'},
  {name:'Build',      weeks:'Wk 3–4',f:1.15,note:'A bit more each session.'},
  {name:'Reload',     weeks:'Wk 5',  f:.85, note:'Lighter week so your body catches up and gets stronger.'},
  {name:'Match Fit',  weeks:'Wk 6–8',f:1.25,note:'Sharpest work of the pre-season. Finish strong.'}
];
const phaseOf=w=>w<=2?0:(w<=4?1:(w===5?2:3));

/* ---------- Exercise library ----------
   t: reps | time.  a: base amount for ages 12-14.  min: youngest age allowed.  sub: what to use if too young.
   kid: preferred for ages 6-8.  plyo: counts as jump contacts.  cap: hard upper limit. */
const EX={
  // Legs
  squat:{n:'Squats',t:'reps',a:12,cat:'legs',min:6,kid:1,cue:'Feet shoulder-width, chest up, sit back to knee height.',why:'Strong legs for every sprint and jump.'},
  wallsit:{n:'Wall sit',t:'time',a:30,cat:'legs',min:9,sub:'squat',cue:'Back flat on the wall, thighs level with the ground.',why:'Legs that last the whole game.'},
  stepup:{n:'Step-ups',t:'reps',a:8,each:'leg',cat:'legs',min:9,sub:'squat',cue:'Whole foot on a low step, drive up through the heel.',why:'Single-leg drive.'},
  splitsquat:{n:'Split squats',t:'reps',a:8,each:'leg',cat:'legs',min:12,sub:'squat',cue:'Long stance, drop the back knee straight down.',why:'Single-leg strength and balance.'},
  bagsquat:{n:'Backpack squats',t:'reps',a:10,cat:'legs',min:12,sub:'squat',cue:'Hug a lightly loaded backpack to your chest. Technique first.',why:'A little extra load, safely.'},
  // Push
  inclinepush:{n:'Incline push-ups',t:'reps',a:12,cat:'push',min:6,kid:1,cue:'Hands on a bench or step, body straight as a plank.',why:'Upper-body strength, made easier.'},
  bear:{n:'Bear crawl',t:'time',a:20,cat:'push',min:6,kid:1,cue:'Hands and feet, knees just off the ground. Crawl forwards and back.',why:'Shoulders, core and coordination.'},
  pushup:{n:'Push-ups',t:'reps',a:10,cat:'push',min:9,sub:'inclinepush',cue:'Body straight, chest to a fist off the ground. Knees down is fine.',why:'Upper body for contests and fends.'},
  taps:{n:'Plank shoulder taps',t:'time',a:30,cat:'push',min:9,sub:'bear',cue:'High plank, tap opposite shoulder, hips still.',why:'Shoulders and core together.'},
  widepush:{n:'Wide push-ups',t:'reps',a:10,cat:'push',min:12,sub:'pushup',cue:'Hands wider than shoulders, lower slowly.',why:'Chest strength.'},
  dips:{n:'Bench dips',t:'reps',a:10,cat:'push',min:12,sub:'inclinepush',cue:'Hands on a bench behind you, elbows point back. Stop at 90°.',why:'Arm strength.'},
  // Lunge
  walklunge:{n:'Giant-step lunges',t:'reps',a:8,each:'leg',cat:'lunge',min:6,kid:1,cue:'Big steps forward, chest tall, back knee gently down.',why:'Stride power and balance.'},
  revlunge:{n:'Reverse lunges',t:'reps',a:8,each:'leg',cat:'lunge',min:9,sub:'walklunge',cue:'Step back, both knees to 90°, push through the front heel.',why:'Balance and leg drive.'},
  latlunge:{n:'Side lunges',t:'reps',a:8,each:'side',cat:'lunge',min:9,sub:'walklunge',cue:'Step wide, sit into one hip, other leg straight.',why:'Change of direction.'},
  curtsy:{n:'Curtsy lunges',t:'reps',a:8,each:'leg',cat:'lunge',min:12,sub:'revlunge',cue:'Step back and across, like a curtsy.',why:'Hip strength for sidesteps.'},
  // Pull
  superman:{n:'Superman pulls',t:'reps',a:10,cat:'pull',min:6,kid:1,cue:'Lie face down, lift chest, pull elbows back, squeeze.',why:'Posture and upper back.'},
  row:{n:'Inverted rows',t:'reps',a:8,cat:'pull',min:9,sub:'superman',cue:'Under a low park bar, body straight, pull your chest to the bar.',why:'Back strength and posture.'},
  bagrow:{n:'Backpack rows',t:'reps',a:12,cat:'pull',min:12,sub:'superman',cue:'Hinge forward, flat back, pull a light backpack to your belly.',why:'Back strength, anywhere.'},
  chinneg:{n:'Chin-up negatives',t:'reps',a:4,cap:6,cat:'pull',min:12,sub:'row',cue:'Jump to the top, lower yourself slowly over 3–5 seconds.',why:'Grip and pulling power.'},
  // Hips
  bridge:{n:'Glute bridges',t:'reps',a:12,cat:'hips',min:6,kid:1,cue:'Feet flat, squeeze your bum, lift hips high.',why:'Glutes power every sprint.'},
  crab:{n:'Crab walk',t:'time',a:20,cat:'hips',min:6,kid:1,cue:'Hands behind, hips up, walk like a crab.',why:'Hips, shoulders and fun.'},
  slbridge:{n:'Single-leg bridges',t:'reps',a:8,each:'leg',cat:'hips',min:9,sub:'bridge',cue:'One foot down, other leg straight, hips level.',why:'Protects the hamstrings.'},
  hipthrust:{n:'Bench hip thrusts',t:'reps',a:12,cat:'hips',min:12,sub:'bridge',cue:'Shoulders on a bench, drive hips to the sky.',why:'Top-speed engine.'},
  // Core
  plank:{n:'Plank',t:'time',a:30,cat:'core',min:6,kid:1,cue:'Forearms down, straight line from head to heels.',why:'A strong middle in every contest.'},
  deadbug:{n:'Dead bugs',t:'reps',a:10,each:'side',cat:'core',min:6,kid:1,cue:'Back pressed flat, opposite arm and leg reach out slowly.',why:'Core control.'},
  birddog:{n:'Bird dogs',t:'reps',a:8,each:'side',cat:'core',min:6,kid:1,cue:'On all fours, reach opposite arm and leg, hold 2 sec.',why:'Balance and a healthy back.'},
  sideplank:{n:'Side plank',t:'time',a:20,each:'side',cat:'core',min:9,sub:'plank',cue:'Elbow under shoulder, hips high.',why:'Stay upright in contact.'},
  climbers:{n:'Mountain climbers',t:'time',a:30,cat:'core',min:9,sub:'plank',cue:'High plank, drive knees to chest.',why:'Core plus fitness.'},
  hollow:{n:'Hollow hold',t:'time',a:20,cat:'core',min:9,sub:'deadbug',cue:'Lower back down, arms and legs off the ground.',why:'Gymnast-strong core.'},
  // Power (jumps)
  frog:{n:'Frog jumps',t:'reps',a:6,cat:'power',min:6,kid:1,plyo:1,cue:'Squat low, jump forward like a frog, land soft and quiet.',why:'Spring in the legs.'},
  starjump:{n:'Star jumps',t:'time',a:20,cat:'power',min:6,kid:1,cue:'Arms and legs out wide, then back in. Light feet.',why:'Coordination and fitness.'},
  hops:{n:'Pogo hops',t:'time',a:20,cat:'power',min:6,kid:1,cue:'Small fast bounces, stiff ankles, quiet landings.',why:'Springy feet for speed.'},
  jumpsquat:{n:'Squat jumps',t:'reps',a:8,cat:'power',min:9,sub:'frog',plyo:1,cue:'Squat down, explode up, land soft with knees over toes.',why:'Vertical spring.'},
  broad:{n:'Broad jumps',t:'reps',a:5,cat:'power',min:9,sub:'frog',plyo:1,cue:'Swing your arms, jump forward, stick the landing for 2 sec.',why:'Explosive first step.'},
  skater:{n:'Skater bounds',t:'reps',a:6,each:'side',cat:'power',min:9,sub:'frog',plyo:1,cue:'Bound sideways off one leg, land and hold on the other.',why:'Sidestep power.'},
  tuck:{n:'Tuck jumps',t:'reps',a:6,cat:'power',min:12,sub:'jumpsquat',plyo:1,cue:'Jump and pull knees up, land soft and reset each time.',why:'Leap for the ball.'},
  // Landing and balance (ACL and ankle protection)
  stick:{n:'Jump & freeze',t:'reps',a:6,cat:'land',min:6,kid:1,plyo:1,cue:'Jump up, land on two feet, knees over toes, freeze for 2 sec.',why:'Safe landings protect knees.'},
  stork:{n:'Stork stand',t:'time',a:20,each:'leg',cat:'land',min:6,kid:1,cue:'Stand on one leg, arms out. Eyes closed if it is easy.',why:'Ankle control.'},
  reach:{n:'Single-leg reach',t:'reps',a:6,each:'leg',cat:'land',min:9,sub:'stork',cue:'Balance on one leg, reach the other foot forward, side and back.',why:'Balance for cutting and landing.'},
  hopstick:{n:'Hop & stick',t:'reps',a:5,each:'leg',cat:'land',min:12,sub:'stick',plyo:1,cue:'Hop forward on one leg, land soft, knee over toe, hold 2 sec.',why:'Knee control on one leg.'},
  lathop:{n:'Side hop & stick',t:'reps',a:5,each:'side',cat:'land',min:12,sub:'stork',plyo:1,cue:'Hop sideways onto one leg, freeze, knee stays over toe.',why:'Ankle and knee protection.'},
  // Injury prevention
  calf:{n:'Calf raises',t:'reps',a:15,cat:'prev',min:6,kid:1,cue:'Rise high onto your toes, lower slowly.',why:'Healthy ankles and Achilles.'},
  squeeze:{n:'Ball squeeze',t:'time',a:20,cat:'prev',min:6,kid:1,cue:'Lie on your back, knees bent, squeeze a ball between your knees.',why:'Groin strength.'},
  slcalf:{n:'Single-leg calf raises',t:'reps',a:12,each:'leg',cat:'prev',min:12,sub:'calf',cue:'One foot on a step edge, rise up, lower slowly.',why:'Achilles and ankle strength.'},
  nordic:{n:'Nordic hamstring lowers',t:'reps',a:4,cap:8,cat:'prev',min:12,sub:'slbridge',cue:'Kneel, someone holds your ankles. Lower forward as slowly as you can, catch with your hands.',why:'Proven to cut hamstring strains.'},
  copen:{n:'Copenhagen plank',t:'time',a:15,each:'side',cat:'prev',min:12,sub:'squeeze',cue:'Side plank with your top knee on a bench, bottom leg tucked. Short and steady.',why:'Proven to cut groin injuries.'},
  neck:{n:'Neck holds',t:'time',a:20,cat:'prev',min:12,sub:'plank',cue:'Press your head gently into your hands: front, back, each side, 5 sec each. Head stays still.',why:'A strong neck for contact.'},
  // Arm care (throwing, serving, bowling)
  armcircle:{n:'Arm circles',t:'time',a:30,cat:'arm',min:6,kid:1,cue:'Small circles growing bigger, then reverse.',why:'Warm, mobile shoulders.'},
  ytw:{n:'Y-T-W raises',t:'reps',a:6,cat:'arm',min:9,sub:'armcircle',cue:'Lie face down, lift arms into a Y, then T, then W. Thumbs up.',why:'Shoulder blades that protect the arm.'},
  scappush:{n:'Scap push-ups',t:'reps',a:10,cat:'arm',min:9,sub:'armcircle',cue:'High plank, arms straight, squeeze then spread the shoulder blades.',why:'Shoulder stability.'},
  wallslide:{n:'Wall slides',t:'reps',a:10,cat:'arm',min:9,sub:'armcircle',cue:'Back and arms on a wall, slide arms up and down slowly.',why:'Overhead mobility.'},
  extrot:{n:'Band external rotations',t:'reps',a:12,each:'arm',cat:'arm',min:12,sub:'ytw',cue:'Elbow tucked at your side, rotate the band out slowly.',why:'Rotator cuff strength for throwing.'}
};
const CAT={legs:'Legs',push:'Push',lunge:'Lunges',pull:'Pull',hips:'Hips',core:'Core',power:'Jumps',land:'Landing',prev:'Injury prevention',arm:'Arm care'};

/* ---------- Sports ----------
   Themes: pri (work colour), deep, abyss (dark end of gradients), acc (accent), on (text on pri), hero1 (hero start colour).
   Scoring: big = main session (Sat/Sun), small = club training, bonus session and medals. */
const SPORTS={
  afl:{name:'Aussie Rules',short:'Footy',tag:'Big in Australia',ball:'afl',field:'oval',
    pri:'#e3122f',deep:'#9e0a1f',abyss:'#4a0610',acc:'#f3b53f',on:'#ffffff',
    bigW:'Goal',bigP:6,smallW:'Behind',smallP:1,afl:true,week:'Round',table:'The ladder',title:'Premiers',
    levels:['Rookie','Development List','Senior List','Best 22','Vice-Captain','Captain','Club Legend'],
    wu:[['Leg swings',60,'10 front-to-back and 10 side-to-side each leg.'],['Hip openers + arm circles',60,'Open the gate both ways, then big arm circles.']],
    speed:[{n:'Hill sprint',d:18,cue:'Drive your arms, lean into the hill, quick feet.',reps:[6,8,5,8],restN:'Walk back down'},
           {n:'Lead & spin',d:6,cue:'Sprint 10 m, plant, spin and sprint back like leading for a mark.',reps:[3,4,3,4]}],
    cond:{n:'Tempo run',w:30,r:30,reps:[6,8,5,10],cue:'Three-quarter pace across the oval, walk the rest.'},condLabel:'Run',mode:'swim',skip:true,
    circuit:['squat','pushup','revlunge','row','bridge','nordic','sideplank','broad'],bonus:['plank','reach','deadbug'],
    skills:[['Wall kicks',"Kick to a wall or fence 15 m away. Alternate left and right foot."],['Handball to target','Hit a target with both hands, 5 m then 10 m.'],
      ['Marking practice','Throw the ball high and mark it at the highest point. Strong hands.'],['Ground balls','Roll the ball, run through and pick it up cleanly, one hand then two.'],
      ['Snaps at goal','From a tight angle, snap around your body. Both feet.'],['Bounce runs','Run and bounce every 15 m. Keep your eyes up.']],
    tips:['Hamstring strains are the most common footy injury. Nordic lowers (ages 12+) are proven to cut them.','Heel pain in 9–14 year olds is often Sever\'s disease from growing bones. Tell a parent and ease off running if it lasts.']},
  soccer:{name:'Soccer',short:'Football',tag:'Big everywhere',ball:'soccer',field:'pitch',
    pri:'#16a34a',deep:'#0d6b31',abyss:'#06301a',acc:'#facc15',on:'#ffffff',rest:'#60a5fa',
    bigW:'Goal',bigP:3,smallW:'Assist',smallP:1,week:'Matchday',table:'The table',title:'Champions',
    levels:['Trialist','Academy','Youth Team','Reserves','First Team','Captain','Club Legend'],
    wu:[['Jog with hip in and out',60,'Jog and open the knee out like stepping over a hurdle, then in.'],['Shuffle and heel flicks',60,'Side shuffle both ways, then flick heels to your bum.']],
    speed:[{n:'Acceleration sprint',d:4,cue:'Sprint 20 m from a standing start. Lean forward, punch the arms.',reps:[6,8,5,8]},
           {n:'Cut & go',d:6,cue:'Sprint 10 m, plant and cut at 45°, sprint away. Knee stays over toe.',reps:[4,5,3,6]}],
    cond:{n:'15-15 run',w:15,r:15,reps:[10,14,8,16],cue:'Run hard for 15 sec, jog 15 sec. Like box-to-box running.'},condLabel:'Run',mode:'field',
    circuit:['squat','latlunge','nordic','copen','slbridge','plank','hopstick','skater'],bonus:['sideplank','reach','copen'],
    skills:[['Juggling','Keep it up with feet, thighs and head-free touches. Beat your record.'],['Wall passes','Pass against a wall with both feet, one and two touch.'],
      ['Cone dribbling','Weave through cones using both feet, inside and outside.'],['First touch','Pass hard into a wall and take your first touch away from the cone.'],
      ['Shooting at target','Aim for the corners. Laces for power, side-foot for placement.'],['Turns','Cruyff, drag-back and inside hook turns. Both feet.']],
    tips:['The FIFA 11+ warm-up, which this program borrows from, cuts injuries by up to a third in young players.','Leave heading out of solo training. Most junior programs limit it.']},
  basketball:{name:'Basketball',short:'Hoops',tag:'Big in AU, US & Europe',ball:'basketball',field:'court',
    pri:'#f26b1d',deep:'#a3410b',abyss:'#3d1804',acc:'#fde047',on:'#ffffff',
    bigW:'Three',bigP:3,smallW:'Free throw',smallP:1,week:'Game',table:'Standings',title:'Champions',
    levels:['Walk-on','Bench','Rotation','Sixth Man','Starter','Captain','Hall of Famer'],
    wu:[['Defensive slides',60,'Low stance, slide side to side, feet never cross.'],['Skips with arm swings',60,'Skip high, swing the arms. Land softly.']],
    speed:[{n:'Closeout sprint',d:5,cue:'Sprint 10 m, chop your feet, hands high as if closing out a shooter.',reps:[6,8,5,8]},
           {n:'Lane agility',d:12,cue:'Sprint, slide, backpedal and slide around a square of cones.',reps:[3,4,3,4]}],
    cond:{n:'Court sprint',w:25,r:50,reps:[4,6,4,8],cue:'Sprint to each line and back. Full recovery between.'},condLabel:'Court',mode:'field',skip:true,
    circuit:['squat','jumpsquat','stick','latlunge','pushup','calf','deadbug','bridge'],bonus:['plank','lathop','calf'],
    skills:[['Form shooting','Close to the ring, one hand, perfect follow-through.'],['Ball-handling','Pound dribbles, crossovers, between the legs. Eyes up.'],
      ['Layups','Both hands, both sides. Right foot, left foot rhythm.'],['Free throws','Same routine every shot. Count how many you make.'],
      ['Cone dribble weave','Dribble through cones, change hands at every cone.'],['Wall passing','Chest and bounce passes to a wall target. Step into it.']],
    tips:['Ankle sprains are the most common basketball injury. Balance and landing drills help prevent them.','Pain just below the kneecap in growing players (Osgood-Schlatter) means fewer jumps for a while. Tell a parent.']},
  netball:{name:'Netball',short:'Netball',tag:'Big in Australia, NZ & UK',ball:'netball',field:'netball',
    pri:'#e0187a',deep:'#8d0c4a',abyss:'#360419',acc:'#fde047',on:'#ffffff',
    bigW:'Super Shot',bigP:2,smallW:'Intercept',smallP:1,week:'Round',table:'The ladder',title:'Premiers',
    levels:['Rookie','Development Squad','Reserves','Starting Seven','Vice-Captain','Captain','Club Legend'],
    wu:[['Skip and land',60,'Skip, then land on two feet with knees soft over toes.'],['Side steps and carioca',60,'Side step, then grapevine feet across. Both ways.']],
    speed:[{n:'Three-step dodge & lead',d:5,cue:'Dodge one way, push off and sprint the other. Land on two feet.',reps:[6,8,5,8]},
           {n:'Split-step sprint',d:4,cue:'Small hop to land on both feet, then sprint 10 m on the call.',reps:[4,6,4,6]}],
    cond:{n:'Court transition',w:20,r:40,reps:[6,8,5,10],cue:'Sprint end to end of a court length, walk back.'},condLabel:'Court',mode:'field',skip:true,
    circuit:['stick','squat','revlunge','nordic','slbridge','calf','sideplank','hops'],bonus:['reach','plank','lathop'],
    skills:[['Wall passing','Chest, bounce and shoulder passes to a wall. Quick hands.'],['Shooting','Ring or target, balanced feet, elbow under the ball.'],
      ['Footwork','Land, pivot on the same foot, pass. Both landing feet.'],['Catch and land','Toss the ball ahead, run on, catch and land on one foot, balance.'],
      ['Defence','Arms over a partner or post, three feet, hold the shape.'],['Quick hands','Ball tosses wall-to-hand as fast as you can. Both hands.']],
    tips:['Most serious netball knee (ACL) injuries happen on landing. The landing drills here follow the Netball Australia KNEE program.','Land with knees bent and over your toes, never caving in.']},
  cricket:{name:'Cricket',short:'Cricket',tag:'Big in AU, UK & India',ball:'cricket',field:'cricket',
    pri:'#f59e0b',deep:'#a15c04',abyss:'#3b2102',acc:'#38bdf8',on:'#1b1205',hero1:'#c97406',
    bigW:'Six',bigP:6,smallW:'Single',smallP:1,week:'Round',table:'The ladder',title:'Champions',
    levels:['Twelfth Man','Nets Bowler','Squad Player','First XI','Vice-Captain','Captain','Club Legend'],
    wu:[['Leg swings',60,'Front-to-back and side-to-side, 10 each leg.'],['Shoulder rolls + arm circles',60,'Warm the shoulders before any throwing or bowling.']],
    speed:[{n:'Run two',d:8,cue:'Sprint between two cones 17 m apart and back. Turn low, bat-hand reach.',reps:[5,6,4,7]},
           {n:'Pounce and sprint',d:5,cue:'Ready stance, pounce forward 5 m like fielding, then sprint 10 m.',reps:[4,6,4,6]}],
    cond:{n:'Tempo run',w:30,r:45,reps:[6,8,5,10],cue:'Three-quarter pace, walk the recovery.'},condLabel:'Run',mode:'field',
    circuit:['squat','revlunge','ytw','row','bridge','sideplank','birddog','broad'],bonus:['sideplank','birddog','scappush'],
    skills:[['Catching','Underarm catches off a wall with a tennis ball. Soft hands.'],['Shadow batting','Front foot drive, back foot defence. Head still.'],
      ['Bowling to a target','Bowl at a cone. Count every ball and stay within your junior bowling limits.'],['Ground fielding','Attack the ball, long barrier, then a throw at the stumps.'],
      ['Underarm flicks','Run in and flick at one stump. Quick release.'],['High catches','Throw it high, call it, catch with fingers up.']],
    tips:['Young fast bowlers can get stress fractures in the lower back. Stick to Cricket Australia junior bowling limits and avoid twisting back-bends in the gym.','Back pain that lasts more than a week or two needs a physio, not more bowling.']},
  rugby:{name:'Rugby',short:'Rugby',tag:'League & Union: AU, NZ, UK, France',ball:'rugby',field:'rugby',
    pri:'#2563eb',deep:'#1a3f9e',abyss:'#0a1a45',acc:'#facc15',on:'#ffffff',
    bigW:'Try',bigP:4,smallW:'Conversion',smallP:1,week:'Round',table:'The ladder',title:'Premiers',
    levels:['Waterboy','Development','Bench','Starting Side','Vice-Captain','Captain','Club Legend'],
    wu:[['Leg swings',60,'Front-to-back and side-to-side, 10 each leg.'],['Neck and shoulder warm-up',60,'Slow nods, side tilts and big arm circles.']],
    speed:[{n:'Get-up sprint',d:5,cue:'Lie on your front, jump up and sprint 15 m.',reps:[6,8,5,8]},
           {n:'Side-step run',d:6,cue:'Run at a cone, step off one foot and accelerate away.',reps:[4,5,3,6]}],
    cond:{n:'Repeat effort',w:20,r:40,reps:[6,8,5,10],cue:'Down to the ground, up, sprint 20 m. Walk back.'},condLabel:'Run',mode:'field',
    circuit:['squat','pushup','row','neck','hipthrust','walklunge','plank','broad'],bonus:['neck','sideplank','birddog'],
    skills:[['Spin pass','Pass to a wall target, both sides, hands to the target.'],['High-ball catching','Throw it high, call it, catch on your chest.'],
      ['Footwork through cones','Ball in two hands, quick feet through cones, change direction.'],['Kicking','Grubbers and punts to a target, both feet.'],
      ['Pop passes','Short passes to a wall, soft hands, step and pop.'],['Tackle shape','Shadow the body position only: cheek to cheek, ring of steel. No contact.']],
    tips:['Practise tackling only with your coach. This app builds the neck and body to make it safer.','Any knock to the head: stop, sit out the rest of the day and see a doctor before returning.']},
  gridiron:{name:'American Football',short:'Football',tag:'Big in the US',ball:'gridiron',field:'gridiron',
    pri:'#7c3aed',deep:'#4c1d95',abyss:'#1e0b3d',acc:'#facc15',on:'#ffffff',
    bigW:'Touchdown',bigP:6,smallW:'Extra point',smallP:1,week:'Week',table:'Standings',title:'Champions',
    levels:['Walk-on','Scout Team','Special Teams','Starter','Team Captain','All-Star','Hall of Famer'],
    wu:[['High knees + butt kicks',60,'10 m of each, light and quick.'],['Lateral shuffle',60,'Low hips, shuffle both ways.']],
    speed:[{n:'Three-point start',d:3,cue:'Start from a three-point stance and burst 10 yards.',reps:[6,8,5,8]},
           {n:'Three-cone drill',d:8,cue:'Sprint to a cone, back, around in an L shape. Stay low on the turns.',reps:[3,4,3,4]}],
    cond:{n:'Play-length sprint',w:6,r:30,reps:[10,12,8,15],cue:'Sprint as if running a play, walk back to the huddle.'},condLabel:'Field',mode:'field',skip:true,
    circuit:['squat','pushup','row','neck','hipthrust','latlunge','plank','broad'],bonus:['neck','sideplank','deadbug'],
    skills:[['Catching','Catch with your hands, not your chest. Tuck it away.'],['Route running','Run a slant, out and curl around cones. Sharp cuts.'],
      ['Throwing form','Step, turn, follow through. No more than 30 throws a session.'],['Stance and start','Get into your stance and fire out. Low pad level.'],
      ['Ball security','High and tight, run through cones while switching arms.'],['Footwork','Quick feet over chalk lines or a ladder.']],
    tips:['Pre-season is often in summer heat. Build up over 1–2 weeks and drink before you are thirsty.','Any knock to the head: stop, sit out the rest of the day and see a doctor before returning.']},
  baseball:{name:'Baseball & Softball',short:'Ball',tag:'Big in the US, Japan & LatAm',ball:'baseball',field:'diamond',
    pri:'#f43f5e',deep:'#9f1239',abyss:'#3d0716',acc:'#38bdf8',on:'#ffffff',
    bigW:'Home run',bigP:4,smallW:'Base hit',smallP:1,week:'Series',table:'Standings',title:'Champions',
    levels:['Bat Kid','Bench','Utility','Starter','Cleanup Hitter','Captain','Hall of Famer'],
    wu:[['Arm circles + band warm-up',60,'Small to big circles, both ways. Warm before throwing.'],['Lateral shuffles',60,'Low and quick, like fielding a grounder.']],
    speed:[{n:'Home to first',d:5,cue:'Swing-start, sprint through the bag. Do not slow down early.',reps:[5,6,4,7]},
           {n:'Steal start',d:3,cue:'Crossover step and burst 10 m. Stay low.',reps:[4,6,4,6]}],
    cond:{n:'Base-path run',w:10,r:40,reps:[8,10,6,12],cue:'Run home to second around the bags. Walk back.'},condLabel:'Run',mode:'field',
    circuit:['squat','latlunge','ytw','scappush','row','bridge','sideplank','skater'],bonus:['ytw','sideplank','birddog'],
    skills:[['Throwing progression','Easy throws at short distance, then longer. Stop if your elbow or shoulder hurts.'],['Wall ball fielding','Throw a ball off a wall and field the rebound. Glove down, eyes on the ball.'],
      ['Dry swings','Balanced stance, load, stride and swing. Quality, not quantity.'],['Short hops','Field short hops off a wall. Soft hands.'],
      ['Base running turns','Round the bag, hit the inside corner.'],['Pop flies','Toss it high, call it, catch above your eyes.']],
    tips:['Pitchers: follow pitch count limits like MLB Pitch Smart. No pitching through pain, and not on back-to-back days.','Pain on the inside of the elbow means stop throwing and tell a parent.']},
  volleyball:{name:'Volleyball',short:'Volleyball',tag:'Big in Europe, US & Asia',ball:'volleyball',field:'volley',
    pri:'#facc15',deep:'#8a6d04',abyss:'#2e2402',acc:'#60a5fa',on:'#1d1702',hero1:'#b38c05',rest:'#60a5fa',
    bigW:'Ace',bigP:3,smallW:'Dig',smallP:1,week:'Round',table:'Standings',title:'Champions',
    levels:['Rookie','Practice Squad','Bench','Starter','Libero of the Year','Captain','Hall of Famer'],
    wu:[['Shuffle and block jumps',60,'Shuffle, then a small two-foot jump with hands up. Soft landings.'],['Arm circles + wall slides',60,'Warm the shoulders before hitting or serving.']],
    speed:[{n:'Approach jump',d:5,cue:'Three-step approach, arms back, jump, land on two feet.',reps:[5,6,4,7]},
           {n:'Block shuffle',d:6,cue:'Shuffle along the net line, stop, small block jump.',reps:[4,5,3,6]}],
    cond:{n:'Rally shuttle',w:15,r:30,reps:[8,10,6,12],cue:'Shuttle 3 m and 6 m lines, touch the floor each time.'},condLabel:'Court',mode:'field',
    circuit:['stick','jumpsquat','squat','calf','ytw','plank','slbridge','latlunge'],bonus:['wallslide','reach','plank'],
    skills:[['Forearm passing','Pass to a wall target, platform flat, legs do the work.'],['Setting','Set to a wall above head height. Fingers, not palms.'],
      ['Serving technique','Toss and contact. Focus on the toss being the same every time.'],['Approach footwork','Practise left-right-left (or reverse) approaches without jumping.'],
      ['Self pass-set','Bump, set, bump, set. Keep it alive.'],['Defensive ready','Low stance, react to a ball thrown left or right.']],
    tips:['Pain just below the kneecap is common in jumpers. Fewer jumps for a while and tell a parent if it lasts.','Land on two feet with knees soft. That protects knees and ankles.']},
  icehockey:{name:'Ice Hockey',short:'Hockey',tag:'Big in Canada, US & Nordics',ball:'puck',field:'rink',
    pri:'#06b6d4',deep:'#0e6a80',abyss:'#062a33',acc:'#f43f5e',on:'#032026',hero1:'#0891b2',
    bigW:'Goal',bigP:3,smallW:'Assist',smallP:1,week:'Game',table:'Standings',title:'Champions',
    levels:['Rink Rat','Scratch','Fourth Line','Top Six','Alternate Captain','Captain','Hall of Famer'],
    wu:[['Lateral lunges',60,'Slow side lunges to open the groin.'],['Skater swings',60,'Swing each leg out to the side and back, like a stride.']],
    speed:[{n:'Stance start',d:4,cue:'From a low athletic stance, burst 10 m with short choppy steps.',reps:[6,8,5,8]},
           {n:'Crossover run',d:6,cue:'Run a tight circle using crossover steps both ways.',reps:[4,5,3,6]}],
    cond:{n:'Shift interval',w:40,r:80,reps:[4,6,4,8],cue:'Work like a shift: hard for 40 sec, then rest on the bench.'},condLabel:'Off-ice',mode:'field',skip:true,
    circuit:['squat','latlunge','copen','skater','slbridge','sideplank','row','pushup'],bonus:['copen','sideplank','reach'],
    skills:[['Stickhandling','Off-ice ball, quick hands side to side and front to back.'],['Wrist shots','Shoot at a target from a pad or smooth surface.'],
      ['Passing','Pass to a rebounder or wall, receive on both sides.'],['Toe drags','Pull the ball in with the toe of the blade, around a cone.'],
      ['Backhand','Backhand passes and shots. Weak side gets strong.'],['Balance strides','Hold a one-leg skating stride for 5 sec, swap.']],
    tips:['Groin strains are common in skaters. Copenhagen planks (ages 12+) are proven to help.','This plan is all off-ice. Keep your on-ice training with your club.']},
  tennis:{name:'Tennis',short:'Tennis',tag:'Big in Europe, US & AU',ball:'tennis',field:'tennis',
    pri:'#a3e635',deep:'#4d7c0f',abyss:'#1a2b05',acc:'#f472b6',on:'#132004',hero1:'#5f9c10',rest:'#60a5fa',
    bigW:'Ace',bigP:3,smallW:'Winner',smallP:1,week:'Round',table:'Rankings',title:'Champion',
    levels:['Ball Kid','Qualifier','Main Draw','Seeded','Top 10','World No. 1','Hall of Famer'],
    wu:[['Split steps and shuffles',60,'Split step, shuffle 3 steps, recover. Both ways.'],['Arm circles + wall slides',60,'Warm the shoulders before serving.']],
    speed:[{n:'Spider drill',d:15,cue:'From the middle, sprint to 5 cones and back to the middle each time.',reps:[3,4,3,4]},
           {n:'Split-step reaction',d:5,cue:'Split step, then sprint 5 m left or right on a call.',reps:[5,6,4,7]}],
    cond:{n:'Point-play shuttle',w:10,r:20,reps:[10,14,8,16],cue:'Shuttle side to side like a rally, then rest like between points.'},condLabel:'Court',mode:'field',
    circuit:['latlunge','squat','ytw','scappush','hopstick','sideplank','bridge','skater'],bonus:['extrot','sideplank','reach'],
    skills:[['Forehand wall rally','Keep it going against a wall. Turn your shoulders.'],['Backhand wall rally','Same again on the backhand side.'],
      ['Shadow swings','Full swings with no ball. Perfect technique.'],['Serve toss','Practise the toss only: same height, same spot.'],
      ['Footwork recovery','Hit-and-recover shadow drill back to the centre.'],['Volleys','Short punch volleys against a wall.']],
    tips:['Shoulder and elbow pain usually comes from too many serves. Keep serve practice short and do your arm-care exercises.','Pain that changes how you swing means stop and tell a parent.']},
  hockey:{name:'Field Hockey',short:'Hockey',tag:'Big in Europe, India & AU',ball:'hockey',field:'hpitch',
    pri:'#14b8a6',deep:'#0b6b62',abyss:'#04291f',acc:'#facc15',on:'#032420',hero1:'#0f9488',rest:'#a78bfa',
    bigW:'Goal',bigP:3,smallW:'Short corner',smallP:1,week:'Round',table:'The ladder',title:'Premiers',
    levels:['Rookie','Development','Reserves','First XI','Vice-Captain','Captain','Club Legend'],
    wu:[['Low lunges with reach',60,'Long lunge, reach the opposite hand to the ground.'],['Side shuffles',60,'Low position, both ways.']],
    speed:[{n:'Low-carry sprint',d:5,cue:'Sprint 20 m in a low position, stick in two hands.',reps:[6,8,5,8]},
           {n:'Dodge & accelerate',d:6,cue:'Dodge a cone one way and burst away.',reps:[4,5,3,6]}],
    cond:{n:'Pitch interval',w:20,r:30,reps:[8,10,6,12],cue:'Hard running for 20 sec, jog the recovery.'},condLabel:'Run',mode:'field',
    circuit:['squat','walklunge','copen','nordic','bridge','sideplank','row','skater'],bonus:['copen','birddog','sideplank'],
    skills:[['Indian dribble','Ball in front, quick side-to-side taps with open and reverse stick.'],['Push passes','Push to a wall target. Step and stay low.'],
      ['Receiving','Receive off a wall on the open and reverse side.'],['Hitting','Hit at a target. Feet set, eyes on the ball.'],
      ['Reverse control','Run with the ball on the reverse side through cones.'],['Tackle stance','Low, patient jab tackles on a cone. No lunging.']],
    tips:['The low playing position loads the back and groin. Copenhagen planks and bird dogs help protect them.','Wear a mouthguard and shin pads in any training with a ball and stick.']}
};
const SPORT_ORDER=['afl','soccer','basketball','netball','cricket','rugby','gridiron','baseball','volleyball','icehockey','tennis','hockey'];

/* Train-safe guidance shown in the app. */
const SAFE=[
  ['Listen to pain','Muscle tiredness is normal. Sharp pain, pain in a joint or bone, or pain that changes how you move means stop and tell a parent. If it lasts more than a few days, see a physio or GP.'],
  ['Growth spurts','When you grow fast, bones grow before muscles and tendons catch up. Turn on Growth spurt in the Locker and the app cuts jumps and sprints back while you grow.'],
  ['Rest days','Have at least 2 rest days a week. A good rule: hours of organised sport a week should be no more than your age in years.'],
  ['Sleep and food','Kids 6–13 need 9–11 hours of sleep, teens 14–17 need 8–10. Eat proper meals and snacks around training. No diets or supplements needed.'],
  ['Heat','Train early or late on hot days. Drink water before, during and after. Stop if you feel dizzy, sick or get a headache.'],
  ['Head knocks','Any knock to the head with symptoms: stop, no more training that day, and see a doctor before returning.'],
  ['Health first','If you have asthma, a heart condition or a recent injury, check with your doctor or physio before starting.']
];

window.PSB={BANDS,bandFor,EXPERIENCE,PHASES,phaseOf,EX,CAT,SPORTS,SPORT_ORDER,SAFE};
})();
