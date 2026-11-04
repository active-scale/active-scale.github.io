(() => {
  'use strict';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const seen=new WeakSet();
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-revealed');observer.unobserve(entry.target);
    });
  },{threshold:.06,rootMargin:'0px 0px -35px 0px'});
  const selector='.section-title,.section-copy,.motivation-recordings,.motivation-context,#viewpoint-demo,.recorded-demo,.assembly,.hardware-grid,.transfer,#dataset-wall,#model-lab,#evaluation-lab,#progress-definition,.qr-study,.efficiency,.closing-grid,.citation,.reading';
  function register(node){
    if(seen.has(node))return;seen.add(node);
    // A direct hash destination is visible immediately; entrance motion never hides it.
    const rect=node.getBoundingClientRect();
    if(rect.top<innerHeight&&rect.bottom>0){node.classList.add('is-revealed');return;}
    node.classList.add('entry-reveal');observer.observe(node);
  }
  document.querySelectorAll(selector).forEach(register);
  new MutationObserver(records=>{
    for(const record of records)for(const added of record.addedNodes){
      if(added.nodeType!==1)continue;
      if(added.matches(selector))register(added);
      added.querySelectorAll(selector).forEach(register);
    }
  }).observe(document.querySelector('main'),{childList:true,subtree:true});
})();
