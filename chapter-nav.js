(() => {
  'use strict';
  const sidebar=document.querySelector('.chapter-sidebar');if(!sidebar)return;
  const toggle=sidebar.querySelector('.chapter-toggle');
  const links=[...sidebar.querySelectorAll('.chapter-links a')];
  const sections=links.map(link=>document.getElementById(link.hash.slice(1)));
  const setOpen=open=>{sidebar.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));};
  toggle.addEventListener('click',()=>setOpen(sidebar.dataset.open!=='true'));
  links.forEach(link=>link.addEventListener('click',()=>setOpen(false)));
  document.addEventListener('pointerdown',event=>{if(!sidebar.contains(event.target))setOpen(false);});
  sidebar.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);toggle.focus();}});
  let scheduled=false;
  function update(){
    scheduled=false;
    const guide=innerHeight*.32;
    let active=-1;
    sections.forEach((section,index)=>{if(section&&section.getBoundingClientRect().top<=guide)active=index;});
    links.forEach((link,index)=>{if(index===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(document.querySelector('main'));update();
})();
