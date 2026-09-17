/* Means and SDs are transcribed percentages. Only means are displayed.
   WB-WAM and overall SDs: active paper Table I (2026-09-17).
   Baseline task-wise values: supplied HumanoidArena SONIC-row screenshots.
   Overall SDs are preserved as reported, never averaged or reconstructed. */
'use strict';
const simulationVideoRoot='assets/simulation-web-1080p60';
function simulationVideo(task,stem,poster){
  return {task,quality:'1080p · 60 fps',
    views:{world:simulationVideoRoot+'/world_camera/'+stem+'third_60fps.mp4',ego:simulationVideoRoot+'/ego_camera/'+stem+'first_60fps.mp4'},
    posters:{world:'assets/video-posters/'+poster+'-world.jpg',ego:'assets/video-posters/'+poster+'-ego.jpg'}
  };
}
function realVideo(task,stem,note,collection='real'){
  return {task,note,file:'assets/real-web/'+collection+'/'+stem+'.mp4',poster:'assets/real-web/'+collection+'/'+stem+'.jpg'};
}
window.WB_DATA = {
  tasks: ['Football','DoubleDesk','P&PBox','OpenDoor','SitSofa','Boxing','VisNavi'],
  models: [
    {id:'act',name:'ACT',color:'#8692a2',dash:'4 4',marker:'triangle',mean:[16.7,18.3,56.7,78.3,73.3,56.7,33.3],sd:[6.2,4.7,2.6,9.4,8.5,6.2,2.4],overall:47.6,overallSd:24.2},
    {id:'dp',name:'DP',color:'#bb8937',dash:'9 4',marker:'diamond',mean:[45,36.7,75,85,78.3,76.7,23.3],sd:[10.8,4.7,4.1,10.8,14.3,2.4,6.2],overall:60,overallSd:24.2},
    {id:'fm',name:'FM',color:'#4b8e80',dash:'2 3',marker:'square',mean:[13.3,38.3,73.3,70,15,70,38.3],sd:[2.4,4.7,6.2,4.1,7.1,8.2,14.3],overall:45.5,overallSd:25.2},
    {id:'pi05',name:'π₀.₅',color:'#a5759c',dash:'9 3 2 3',marker:'circle',mean:[10,43.3,71.7,66.7,73.3,70,23.3],sd:[4.1,6.2,11.8,6.2,2.4,0,6.2],overall:51.2,overallSd:24.8},
    {id:'wbwam',name:'WB-WAM',color:'#286dc9',dash:'',marker:'circle',mean:[73.3,58.3,90,93.3,96.7,81.7,78.3],sd:[6.2,4.7,0,2.4,4.7,2.4,2.4],overall:81.7,overallSd:12.8}
  ],
  source:{baseline:'Supplied HumanoidArena table, SONIC rows only',wbwam:'WB-WAM paper, active Table I (2026-09-17)',grain:'model × task',unit:'percent success',rounding:'One decimal as reported',scope:'No TWIST2 rows; no synthetic task-wise-best model'},
  // Add local asset paths when final media are available. Empty paths show placeholders.
  methodFigure:'assets/method-pipeline.png',
  methodFigurePdf:'assets/method-pipeline.pdf',
  // Rounded duration shares transcribed from assets/datasets-overview.png.
  // Preserve these published percentages; do not infer per-source hours.
  pretrainingCorpus:{totalHours:1880.2,groups:[
    {id:'vbh',name:'Video + body + hand',color:'#3d637b',tint:'#e2ecf1',share:42.9,sources:[
      {id:'xperience',name:'Xperience',share:19.1,color:'#3d637b'},
      {id:'hiw',name:'HIW-500',share:17.7,color:'#63889c'},
      {id:'uniforl',name:'Unitree UnifoRL',share:5.1,color:'#8daabc'},
      {id:'everyday',name:'Humanoid-Everyday-G1',share:0.9,color:'#b1c5d1'},
      {id:'gr00t',name:'GR00T-Teleop-G1',share:0.1,color:'#d0dee5'}
    ]},
    {id:'vh',name:'Video + hand',color:'#9d6c52',tint:'#f3e7df',share:34.9,sources:[
      {id:'egodex',name:'EgoDex',share:34.5,color:'#bb8c72'},
      {id:'psi',name:'PSI-Real',share:0.4,color:'#dcc5b5'}
    ]},
    {id:'tb',name:'Text + body motion',color:'#776a85',tint:'#ede8f1',share:22.2,sources:[
      {id:'bones',name:'Bones-SEED',share:14.6,color:'#80738f'},
      {id:'motionmillion',name:'MotionMillion',share:7.6,color:'#a99cb6'}
    ]}
  ]},
  // Leave resource URLs empty until the actual project pages are available.
  resources:{paper:'',code:'',huggingface:''},
  videos:{
    sim:[
      simulationVideo('Football','kick-football_03_','football'),
      simulationVideo('DoubleDesk','hammer_01_','doubledesk'),
      simulationVideo('P&PBox','box_shelf_native50_idm_d20_r20_hd1080__seed_2__repeat_11__episode_51__success__','ppbox'),
      simulationVideo('OpenDoor','open-door_02_','opendoor'),
      simulationVideo('SitSofa','sit-sofa_02_','sitsofa'),
      simulationVideo('Boxing','punch-markers_03_','boxing'),
      simulationVideo('VisNavi','obstacle-navigation_03_','visnavi')
    ],
    real:[
      realVideo('Wipe the table','wipe-table','Approach the table and wipe its surface.'),
      realVideo('Close the curtain','curtain','Approach the curtain and pull it closed.'),
      {...realVideo('Make the bed','make-the-bed','Flatten a lifted corner of the bed.'),file:'assets/real-web/real/make-the-bed.mp4?v=20260917-replacement',poster:'assets/real-web/real/make-the-bed.jpg?v=20260917-replacement'},
      realVideo('Move the pillow','pillow','Pick and place a pillow.'),
      realVideo('Push the cart','push-the-cart','Grasp the handle and move the cart.'),
      realVideo('Checkout','checkout','Pick up an item, move it across the scanner, and place it down.'),
      realVideo('Tidy up cloth','cloth','Place a garment in a laundry basket.'),
      {task:'Pick & place fruit',note:'A single WB-WAM policy selects the instructed fruit and completes pick-and-place without separate policies for different targets.',variants:[
        {...realVideo('Apple','apple',''),id:'apple'},
        {...realVideo('Orange','orange',''),id:'orange'},
        {...realVideo('Lemon','lemon',''),id:'lemon'}
      ]}
    ],
    success:[
      {...realVideo('Close the curtain','curtain','Five consecutive successful executions of closing the curtain.','success'),file:'assets/real-web/success-fast/curtain.mp4',encodedSpeed:5},
      {...realVideo('Tidy up cloth','cloth','Five consecutive successful executions of placing a garment in the laundry basket.','success'),file:'assets/real-web/success-fast/cloth.mp4',encodedSpeed:5}
    ]
  }
};
