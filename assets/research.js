'use strict';
document.documentElement.classList.add('js');
const data=window.WB_DATA;
const $=id=>document.getElementById(id);
const ns='http://www.w3.org/2000/svg';
function svgNode(name,attrs={},text){const n=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;}
const visibleModels=new Set(data.models.map(m=>m.id));

// Animate only headline statistics; their accessible text always retains the final value.
const numberMotion=matchMedia('(prefers-reduced-motion: reduce)');
const headlineCounters=new Map();
function finishCounter(state){
  cancelAnimationFrame(state.frame);state.visual.textContent=state.label;state.played=true;
}
function animateCounter(state){
  if(state.played)return;
  state.played=true;
  if(numberMotion.matches){finishCounter(state);return;}
  const start=performance.now(),duration=1400;
  state.visual.textContent=state.format.format(0);
  const step=now=>{
    const progress=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-progress,3);
    state.visual.textContent=progress===1?state.label:state.format.format(Math.floor(state.target*eased*state.scale)/state.scale);
    if(progress<1)state.frame=requestAnimationFrame(step);
  };
  state.frame=requestAnimationFrame(step);
}
const counterObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const state=headlineCounters.get(entry.target);if(!state)return;
  state.visible=entry.isIntersecting;
  if(state.visible)animateCounter(state);
}),{threshold:.4});
function setHeadlineNumber(element,label){
  let state=headlineCounters.get(element);
  if(!state){
    const accessible=document.createElement('span'),visual=document.createElement('span');
    accessible.className='sr-only';visual.setAttribute('aria-hidden','true');visual.className='counter-value';
    element.replaceChildren(accessible,visual);
    state={accessible,visual,visible:false,played:false,frame:0};headlineCounters.set(element,state);
    counterObserver.observe(element);
  }
  cancelAnimationFrame(state.frame);
  const decimals=(label.split('.')[1]||'').length;
  Object.assign(state,{label,target:Number(label.replaceAll(',','')),scale:10**decimals,played:false,format:new Intl.NumberFormat('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})});
  state.accessible.textContent=label;
  state.visual.textContent=label;
  if(state.visible)animateCounter(state);
}
document.querySelectorAll('.dataset-duration strong,.dataset-stats dd:not(.dataset-task-count),.dataset-task-count [data-counter-number]').forEach(el=>setHeadlineNumber(el,el.textContent.trim()));
numberMotion.addEventListener('change',()=>{if(numberMotion.matches)headlineCounters.forEach(finishCounter);});

// Seven evenly spaced task axes share a fixed, linear 0–100% scale.
// Both legend and plot use this single marker definition.
function modelMarker(model,x,y,size=3){
  const attrs={fill:model.id==='wbwam'?model.color:'white',stroke:model.color,'stroke-width':1.8,class:'radar-marker'};
  if(model.marker==='square')return svgNode('rect',{...attrs,x:x-size,y:y-size,width:2*size,height:2*size});
  if(model.marker==='diamond')return svgNode('polygon',{...attrs,points:`${x},${y-size*1.3} ${x+size*1.3},${y} ${x},${y+size*1.3} ${x-size*1.3},${y}`});
  if(model.marker==='triangle')return svgNode('polygon',{...attrs,points:`${x},${y-size*1.35} ${x+size*1.3},${y+size} ${x-size*1.3},${y+size}`});
  return svgNode('circle',{...attrs,cx:x,cy:y,r:size});
}
function drawRadar(){
  if($('simulation-chart').hidden)return;
  const width=$('radar-canvas').clientWidth;if(!width)return;
  const height=Math.max(315,Math.min(540,width*.88)),cx=width/2,cy=height/2+5;
  const radius=Math.min(width*.31,(height-78)/2),labelRadius=radius+26;
  const svg=$('radar-chart');svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.style.height=height+'px';
  svg.querySelectorAll(':scope > g').forEach(n=>n.remove());
  const point=(i,r)=>[cx+r*Math.cos(-Math.PI/2+i*2*Math.PI/7),cy+r*Math.sin(-Math.PI/2+i*2*Math.PI/7)];
  const points=r=>data.tasks.map((_,i)=>point(i,r).join(',')).join(' ');
  const grid=svgNode('g',{'aria-hidden':'true'});
  [20,40,60,80,100].forEach(v=>grid.append(svgNode('polygon',{points:points(radius*v/100),class:'radar-grid'})));
  data.tasks.forEach((task,i)=>{
    const [x,y]=point(i,radius),[lx,ly]=point(i,labelRadius);
    grid.append(svgNode('line',{x1:cx,y1:cy,x2:x,y2:y,class:'radar-spoke'}));
    const label=svgNode('text',{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'middle',class:'radar-label','font-size':width<430?14:16},task);
    grid.append(label);
  });
  [20,40,60,80,100].forEach(v=>grid.append(svgNode('text',{x:cx+8,y:cy-radius*v/100+4,class:'radar-tick'},String(v))));
  svg.append(grid);
  data.models.forEach(model=>{
    const g=svgNode('g',{'data-model':model.id,opacity:visibleModels.has(model.id)?1:0,'aria-hidden':'true'});
    if(!visibleModels.has(model.id))g.style.pointerEvents='none';
    const coords=model.mean.map((v,i)=>point(i,radius*v/100));
    const polygon=svgNode('polygon',{points:coords.map(p=>p.join(',')).join(' '),class:'radar-series',stroke:model.color,'stroke-dasharray':model.dash,fill:model.id==='wbwam'?model.color:'none','fill-opacity':'.07'});
    g.append(polygon);
    coords.forEach(([x,y],i)=>{
      const marker=modelMarker(model,x,y);
      marker.append(svgNode('title',{},model.name+' · '+data.tasks[i]+': '+model.mean[i].toFixed(1)+'%'));
      g.append(marker);
    });
    svg.append(g);
  });
}
data.models.forEach(model=>{
  const button=document.createElement('button');button.className='legend-button';button.setAttribute('aria-pressed','true');button.setAttribute('aria-label',model.name+': show or hide results');
  const key=svgNode('svg',{viewBox:'0 0 24 24','aria-hidden':'true'});key.append(modelMarker(model,12,12,5));
  button.append(key,document.createTextNode(model.name));
  button.addEventListener('click',()=>{if(visibleModels.has(model.id)){if(visibleModels.size===1)return;visibleModels.delete(model.id);}else visibleModels.add(model.id);button.setAttribute('aria-pressed',String(visibleModels.has(model.id)));drawRadar();});
  $('radar-legend').append(button);
});
const heading=document.createElement('tr');
['Method',...data.tasks,'Mean SR'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;heading.append(th);});
$('simulation-table').querySelector('thead').append(heading);
const baselines=data.models.filter(model=>model.id!=='wbwam');
const ours=data.models.find(model=>model.id==='wbwam');
function simulationValue(mean,sd){
  const value=document.createElement('strong'),spread=document.createElement('span');
  spread.className='metric-sd';spread.textContent=' ± '+sd.toFixed(1);
  value.append(document.createTextNode(mean.toFixed(1)),spread);
  return value;
}
const bestRow=document.createElement('tr');
const bestName=document.createElement('th');bestName.scope='row';bestName.textContent='Best baseline';
const bestDetail=document.createElement('span');bestDetail.className='table-sublabel';bestDetail.textContent='reported, per task';bestName.append(bestDetail);bestRow.append(bestName);
data.tasks.forEach((_,i)=>{
  const best=baselines.reduce((a,b)=>b.mean[i]>a.mean[i]?b:a);
  const td=document.createElement('td'),name=document.createElement('span'),value=simulationValue(best.mean[i],best.sd[i]);
  name.className='baseline-name';name.textContent=best.name;td.append(name,value);bestRow.append(td);
});
const means=document.createElement('td');means.className='baseline-means';
const meanList=document.createElement('div');meanList.className='mean-list';
[...baselines].sort((a,b)=>a.overall-b.overall).forEach(model=>{
  const item=document.createElement('span'),name=document.createElement('span'),value=simulationValue(model.overall,model.overallSd);
  name.textContent=model.name;item.append(name,value);meanList.append(item);
});
means.append(meanList);bestRow.append(means);
const oursRow=document.createElement('tr');oursRow.className='ours';
const oursName=document.createElement('th');oursName.scope='row';oursName.textContent=ours.name;oursRow.append(oursName);
const oursStd=[...ours.sd,ours.overallSd];
[...ours.mean,ours.overall].forEach((value,i)=>{const td=document.createElement('td');td.append(simulationValue(value,oursStd[i]));oursRow.append(td);});
$('simulation-table').querySelector('tbody').append(bestRow,oursRow);
const results={
  sim:{eyebrow:'HumanoidArena · SONIC',value:'81.9',title:'Mean success across seven tasks.',description:'WB-WAM exceeds the strongest reported SONIC baseline on all seven HumanoidArena tasks, spanning locomotion, posture adjustment, and object interaction.',footnote:'Baseline results are reported by HumanoidArena under the SONIC setting.'},
  real:{eyebrow:'Five real-world tasks',value:'84.0',title:'Mean success on the physical robot.',description:'The advantage extends to physical task execution. Without PICO mid-training, WB-WAM achieves 84.0% mean success across five tasks, compared with 80.0% for OpenWAM, the strongest evaluated baseline.',footnote:'Six baselines · Same task-specific robot demonstrations · 20 trials per task and policy.',chart:'Mean success rate (%)',rows:[['ACT',20],['π₀.₅',52],['GR00T N1.6',42],['Fast-WAM',6],['DiT4DiT',31],['OpenWAM',80],['WB-WAM',84,true]]},
  pico:{eyebrow:'Task-aligned PICO transfer',value:'73.8',title:'Mid-training with fewer robot demonstrations.',description:'Task-aligned PICO mid-training achieves higher mean success with 30 robot demonstrations per task than direct post-training with 100, reducing robot demonstration requirements by 70%.',footnote:'Four-task transfer study. PICO includes human demonstrations of the evaluated tasks.',chart:'Mean success rate (%)',rows:[['Direct · 30',48.75],['Direct · 100',65],['PICO + 30',73.75,true]]}
};
function selectResult(key,focus=false){
  const r=results[key];
  document.querySelectorAll('[data-result]').forEach(b=>{const active=b.dataset.result===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
  $('results-panel').setAttribute('aria-labelledby','tab-'+key);
  $('results-panel').dataset.view=key;
  ['eyebrow','title','description','footnote'].forEach(f=>$('result-'+f).textContent=r[f]);
  setHeadlineNumber($('result-value'),r.value);
  $('simulation-chart').hidden=key!=='sim';$('comparison-chart').hidden=key==='sim';$('simulation-values').hidden=key!=='sim';
  $('result-video-link').textContent=key==='sim'?'Simulation task videos ↑':'Real-robot task videos ↑';
  $('result-video-link').dataset.domain=key==='sim'?'sim':'real';
  if(key==='sim'){requestAnimationFrame(drawRadar);return;}
  $('chart-title').textContent=r.chart;
  $('bar-chart').replaceChildren(...r.rows.map(([name,value,ours],index)=>{
    const row=document.createElement('div');row.className='bar-row'+(ours?' highlight':'');
    const label=document.createElement('span');label.className='bar-label';label.textContent=name;
    if(key==='pico'){
      label.textContent=ours?'PICO mid-training + post-training':'Direct post-training';
      const detail=document.createElement('span');detail.className='bar-detail';detail.textContent=(index===1?'100':'30')+' robot demonstrations / task';label.append(detail);
    }
    const track=document.createElement('div');track.className='bar-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('div');fill.className='bar-fill';fill.dataset.width=value;track.append(fill);
    const number=document.createElement('span');number.className='bar-value';number.textContent=value.toFixed(1)+'%';
    row.append(label,track,number);return row;
  }));
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.dataset.width+'%')));
}
document.querySelectorAll('[data-result]').forEach(b=>b.addEventListener('click',()=>selectResult(b.dataset.result)));
function keyboardTabs(container,attribute,handler){
  container.addEventListener('keydown',e=>{
    const buttons=[...container.querySelectorAll('button')],current=buttons.indexOf(document.activeElement);if(current<0)return;
    let next;if(e.key==='ArrowRight')next=(current+1)%buttons.length;if(e.key==='ArrowLeft')next=(current+buttons.length-1)%buttons.length;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;
    if(next!==undefined){e.preventDefault();handler(buttons[next].dataset[attribute],true);}
  });
}
keyboardTabs(document.querySelector('.results-tabs'),'result',selectResult);
new ResizeObserver(()=>requestAnimationFrame(drawRadar)).observe($('radar-canvas'));
selectResult('sim');

const videoCollections={
  sim:{rate:1,label:'Simulation rollout',badge:'Simulation · HumanoidArena',heading:'Simulation tasks',note:'Two camera views of each simulation rollout. Switching views preserves playback progress.'},
  real:{rate:2,label:'Real robot · Unitree G1',badge:'Real robot · Unitree G1',heading:'Real-robot tasks',note:'Real-world deployments cover locomotion and manipulation, together with language-conditioned fruit selection and placement. Videos play at 2× speed by default.'},
  success:{rate:5,label:'Five consecutive successes',badge:'Real robot · Consecutive successes',heading:'Repeated task execution',note:'Each video shows five consecutive successful task executions. Videos play at 5× speed by default.'}
};
let videoDomain='sim',videoIndex=0,videoView='world',videoFruit='apple',pendingVideo=null,videoRequest=0;
const player=$('task-video');
function updatePlaybackSpeed(){
  const encodedSpeed=data.videos[videoDomain][videoIndex].encodedSpeed||1;
  const effectiveRate=Math.round(player.playbackRate*encodedSpeed*100)/100;
  $('playback-speed').textContent='Playback: '+effectiveRate+'× speed';
}
function renderVideo(preserveProgress=false,autoplay=false){
  const request=++videoRequest;
  const item=data.videos[videoDomain][videoIndex];
  const collection=videoCollections[videoDomain];
  const variant=item.variants?.find(v=>v.id===videoFruit);
  const previous=pendingVideo||{time:player.currentTime||0,resume:!player.paused&&!player.ended,rate:player.playbackRate};
  player.pause();
  player.muted=true;player.defaultMuted=true;
  const file=variant?.file||item.views?.[videoView]||item.file||'',hasViews=Boolean(item.views);
  const playbackRate=preserveProgress?previous.rate:collection.rate/(item.encodedSpeed||1);
  player.defaultPlaybackRate=playbackRate;player.playbackRate=playbackRate;
  $('video-toolbar').hidden=!file;
  $('camera-switch').hidden=!hasViews;
  $('fruit-switch').hidden=!item.variants;
  document.querySelectorAll('[data-camera]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.camera===videoView));b.disabled=!item.views?.[b.dataset.camera];});
  document.querySelectorAll('[data-fruit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fruit===videoFruit)));
  $('video-quality').textContent=item.quality||collection.label;
  $('playback-speed').hidden=videoDomain==='sim';updatePlaybackSpeed();
  $('video-task-title').textContent=item.task;
  $('video-caption-title').textContent=item.task+(variant?' · '+variant.task:'');
  $('video-caption-text').textContent=item.note||(videoDomain==='sim'?'HumanoidArena evaluation with SONIC as the execution backend.':'Real-robot task demonstration.');
  $('video-position').textContent=String(videoIndex+1).padStart(2,'0')+' / '+String(data.videos[videoDomain].length).padStart(2,'0');
  $('video-placeholder').querySelector('p').textContent='Video unavailable.';
  $('video-badge').hidden=Boolean(file);$('video-stage-footer').hidden=Boolean(file);
  player.hidden=!file;$('video-placeholder').hidden=Boolean(file);
  $('video-status').textContent='';
  if(!file){pendingVideo=null;$('video-loading-poster').hidden=true;player.removeAttribute('src');player.removeAttribute('poster');player.load();return;}
  const viewLabel=hasViews?(videoView==='world'?'Third-person':'First-person'):'';
  player.setAttribute('aria-label',[item.task,variant?.task,viewLabel,'task video'].filter(Boolean).join(' · '));
  const poster=variant?.poster||item.posters?.[videoView]||item.poster;
  if(poster)player.poster=poster;else player.removeAttribute('poster');
  $('video-loading-poster').hidden=!poster;
  if(poster)$('video-loading-poster').src=poster;
  pendingVideo={src:new URL(file,document.baseURI).href,time:preserveProgress?previous.time:0,resume:preserveProgress?previous.resume:autoplay,rate:playbackRate};
  $('video-status').textContent='Loading '+(viewLabel?viewLabel.toLowerCase()+' view…':'video…');
  player.autoplay=pendingVideo.resume;
  player.src=file;player.load();
  if(pendingVideo.resume)player.play().catch(error=>{
    if(request===videoRequest&&error.name!=='AbortError')$('video-status').textContent='Video ready. Press play to continue.';
  });
}
function selectVideo(index,autoplay=true){
  videoIndex=index;videoFruit='apple';
  document.querySelectorAll('.task-button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  renderVideo(false,autoplay);
}
function selectCamera(view){
  const item=data.videos[videoDomain][videoIndex];
  if(view===videoView||!item.views?.[view])return;
  videoView=view;renderVideo(true);
}
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>selectCamera(b.dataset.camera)));
document.querySelectorAll('[data-fruit]').forEach(b=>b.addEventListener('click',()=>{
  if(videoFruit===b.dataset.fruit)return;
  videoFruit=b.dataset.fruit;renderVideo(false,true);
}));
player.addEventListener('ratechange',updatePlaybackSpeed);
player.addEventListener('loadedmetadata',()=>{
  const pending=pendingVideo;if(!pending||player.src!==pending.src)return;
  player.playbackRate=pending.rate;
  const end=Number.isFinite(player.duration)?Math.max(0,player.duration-.05):pending.time;
  if(pending.time>0)player.currentTime=Math.min(pending.time,end);
});
player.addEventListener('loadeddata',()=>{
  if(player.readyState>=2)$('video-loading-poster').hidden=true;
});
player.addEventListener('canplay',()=>{
  if(!pendingVideo||player.src!==pendingVideo.src)return;
  pendingVideo=null;$('video-status').textContent='';
});
player.addEventListener('error',()=>{
  if(!player.getAttribute('src'))return;
  $('video-loading-poster').hidden=true;
  pendingVideo=null;player.hidden=true;$('video-placeholder').hidden=false;$('video-badge').hidden=false;
  $('video-placeholder').querySelector('p').textContent='Video unavailable — please try another task or camera view.';
  $('video-status').textContent='This video could not be loaded.';
});
function selectDomain(domain,focus=false,autoplay=true){
  videoDomain=domain;videoIndex=0;
  const collection=videoCollections[domain];
  document.querySelectorAll('[data-video-domain]').forEach(b=>{const active=b.dataset.videoDomain===domain;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
  $('video-panel').setAttribute('aria-labelledby','video-tab-'+domain);
  $('video-badge').textContent=collection.badge;
  $('video-list-title').textContent=collection.heading;
  $('media-note').textContent=collection.note;
  $('task-buttons').replaceChildren(...data.videos[domain].map((item,i)=>{
    const b=document.createElement('button');b.className='task-button';b.setAttribute('aria-pressed',String(i===0));
    const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');b.append(number,document.createTextNode(item.task));b.addEventListener('click',()=>selectVideo(i));return b;
  }));selectVideo(0,autoplay);
}
document.querySelectorAll('[data-video-domain]').forEach(b=>b.addEventListener('click',()=>selectDomain(b.dataset.videoDomain)));
keyboardTabs(document.querySelector('.video-tabs'),'videoDomain',selectDomain);
$('result-video-link').addEventListener('click',()=>selectDomain($('result-video-link').dataset.domain));
selectDomain('sim',false,false);
if(data.methodFigure)$('method-image').src=data.methodFigure;
if(data.methodFigure){$('method-figure-link').href=data.methodFigure;$('method-fullsize-link').href=data.methodFigure;}
const resourceButtons=[...document.querySelectorAll('[data-resource]')];
resourceButtons.forEach(button=>{
  const url=data.resources?.[button.dataset.resource];if(!url)return;
  let parsed;try{parsed=new URL(url);}catch{return;}if(parsed.protocol!=='https:')return;
  const link=document.createElement('a');link.className=button.className;link.href=parsed.href;link.target='_blank';link.rel='noopener';link.dataset.resource=button.dataset.resource;
  link.append(...button.childNodes);button.replaceWith(link);
});
if(!document.querySelector('.paper-resources button[disabled]'))$('resources-status').hidden=true;
const citationCopy=$('copy-bibtex');
if(citationCopy) citationCopy.disabled=!$('bibtex-code').textContent.trim();
if(citationCopy) citationCopy.addEventListener('click',async()=>{
  const citation=$('bibtex-code').textContent.trim();if(!citation)return;
  try{
    await navigator.clipboard.writeText(citation);
    $('citation-status').textContent='Copied to clipboard.';
  }catch{
    const range=document.createRange();range.selectNodeContents($('bibtex-code'));
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    $('citation-status').textContent='Copy the selected citation using your keyboard.';
  }
});
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
let scrollPending=false;
function progress(){const range=document.documentElement.scrollHeight-innerHeight;document.querySelector('.reading-progress').style.transform='scaleX('+(range>0?scrollY/range:0)+')';scrollPending=false;}
addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(progress);}},{passive:true});
addEventListener('resize',progress);progress();
