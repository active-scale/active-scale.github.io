(() => {
  'use strict';
  const sidebar=document.querySelector('.chapter-sidebar');if(!sidebar)return;
  const toggle=sidebar.querySelector('.chapter-toggle');
  const nav=sidebar.querySelector('.chapter-links');
  const links=[...nav.querySelectorAll('a')];
  const sections=links.map(link=>document.getElementById(link.hash.slice(1)));
  const robot=document.createElement('button');
  robot.type='button';robot.className='chapter-scrubber';robot.textContent='🤖';
  robot.setAttribute('role','slider');robot.setAttribute('aria-label','Reading progress. Drag to browse; click to auto-read.');
  robot.setAttribute('aria-valuemin','0');robot.setAttribute('aria-valuemax','100');
  robot.setAttribute('aria-orientation','vertical');
  robot.title='Drag to browse · click to auto-read';nav.append(robot);
  const hint=document.createElement('p');hint.className='chapter-reading-hint';hint.textContent='Drag or tap the robot';nav.before(hint);
  const root=document.documentElement;
  const maxScroll=()=>Math.max(0,root.scrollHeight-innerHeight);
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  let scheduled=false,autoFrame=0,lastTime=0,drag=null;
  const setOpen=open=>{sidebar.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));schedule();};
  function stopAuto(){cancelAnimationFrame(autoFrame);autoFrame=0;lastTime=0;root.classList.remove('is-auto-reading');robot.classList.remove('is-auto-reading');}
  function autoRead(time){
    if(document.hidden){stopAuto();return;}
    const dt=lastTime?Math.min((time-lastTime)/1000,.1):0;lastTime=time;
    scrollTo(0,Math.min(maxScroll(),scrollY+dt*52));
    if(scrollY>=maxScroll()-1){stopAuto();return;}
    autoFrame=requestAnimationFrame(autoRead);
  }
  function toggleAuto(){
    if(autoFrame){stopAuto();return;}
    root.classList.add('is-auto-reading');robot.classList.add('is-auto-reading');
    if(scrollY>=maxScroll()-2)scrollTo(0,0);
    autoFrame=requestAnimationFrame(autoRead);
  }
  function stops(){
    const bounds=nav.getBoundingClientRect();
    if(!bounds.height)return null;
    const markerY=links.map(link=>link.getBoundingClientRect().top-bounds.top+18);
    return [{y:Math.max(0,markerY[0]-20),scroll:0},...sections.map((s,i)=>({y:markerY[i],scroll:clamp(s.offsetTop-innerHeight*.32,0,maxScroll())})),{y:Math.min(bounds.height,markerY.at(-1)+22),scroll:maxScroll()}];
  }
  function interpolate(value,list,key,out){
    let i=0;while(i<list.length-2&&value>list[i+1][key])i++;
    const a=list[i],b=list[i+1],span=b[key]-a[key];
    const t=span>0?clamp((value-a[key])/span,0,1):0;
    return a[out]+t*(b[out]-a[out]);
  }
  const colors=[[249,246,252],[241,234,248],[246,242,235],[244,236,250],[250,247,252],[242,239,249],[237,245,241],[249,246,252]];
  function update(){
    scheduled=false;let active=-1;
    const guide=innerHeight*.32;
    sections.forEach((section,index)=>{if(section&&section.getBoundingClientRect().top<=guide)active=index;});
    links.forEach((link,index)=>{if(index===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    const track=stops();if(track)robot.style.top=`${interpolate(scrollY,track,'scroll','y')-13}px`;
    robot.setAttribute('aria-valuenow',String(Math.round(maxScroll()?scrollY/maxScroll()*100:0)));
    robot.setAttribute('aria-valuetext',`${active<0?'Introduction':links[active].textContent.trim()} · ${robot.getAttribute('aria-valuenow')} percent`);
    const anchors=[0,...sections.map(s=>Math.max(1,s.offsetTop-guide))];
    let i=0;while(i<anchors.length-2&&scrollY>anchors[i+1])i++;
    const t=clamp((scrollY-anchors[i])/Math.max(1,anchors[i+1]-anchors[i]),0,1);
    const mix=t*t*(3-2*t);
    root.style.setProperty('--reading-bg',`rgb(${colors[i].map((c,j)=>Math.round(c+(colors[i+1][j]-c)*mix)).join(' ')})`);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  function dragTo(clientY){
    const track=stops();if(!track)return;
    const y=clientY-nav.getBoundingClientRect().top;
    scrollTo(0,interpolate(y,track,'y','scroll'));
  }
  robot.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const wasAuto=!!autoFrame;stopAuto();drag={id:event.pointerId,start:event.clientY,moved:false,wasAuto};robot.setPointerCapture(event.pointerId);event.preventDefault();
  });
  robot.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(Math.abs(event.clientY-drag.start)>4)drag.moved=true;
    if(drag.moved){root.classList.add('is-progress-dragging');dragTo(event.clientY);}
  });
  robot.addEventListener('pointerup',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const {moved,wasAuto}=drag;drag=null;root.classList.remove('is-progress-dragging');
    if(robot.hasPointerCapture(event.pointerId))robot.releasePointerCapture(event.pointerId);
    if(!moved&&!wasAuto)toggleAuto();
  });
  robot.addEventListener('pointercancel',()=>{drag=null;root.classList.remove('is-progress-dragging');});
  robot.addEventListener('keydown',event=>{
    let target=null;
    if(event.key==='Home')target=0;
    if(event.key==='End')target=maxScroll();
    if(['ArrowUp','ArrowLeft'].includes(event.key))target=scrollY-maxScroll()*.02;
    if(['ArrowDown','ArrowRight'].includes(event.key))target=scrollY+maxScroll()*.02;
    if(event.key==='PageUp')target=scrollY-innerHeight*.8;
    if(event.key==='PageDown')target=scrollY+innerHeight*.8;
    if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleAuto();return;}
    if(target!==null){event.preventDefault();stopAuto();scrollTo({top:clamp(target,0,maxScroll()),behavior:'instant'});}
  });
  toggle.addEventListener('click',()=>setOpen(sidebar.dataset.open!=='true'));
  links.forEach(link=>link.addEventListener('click',()=>{stopAuto();setOpen(false);}));
  document.addEventListener('pointerdown',event=>{if(!robot.contains(event.target))stopAuto();if(!sidebar.contains(event.target))setOpen(false);});
  document.addEventListener('wheel',stopAuto,{passive:true});document.addEventListener('touchstart',event=>{if(!robot.contains(event.target))stopAuto();},{passive:true});
  document.addEventListener('keydown',event=>{if(!robot.contains(event.target))stopAuto();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();});
  sidebar.addEventListener('keydown',event=>{if(event.key==='Escape'){stopAuto();setOpen(false);toggle.focus();}});
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{stopAuto();schedule();});
  new ResizeObserver(schedule).observe(document.querySelector('main'));update();
})();
