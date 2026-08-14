const header=document.querySelector('#header'),toggle=document.querySelector('.menu-toggle'),mobileNav=document.querySelector('.mobile-nav');

const updateHeader=()=>header.classList.toggle('scrolled',window.scrollY>24);updateHeader();window.addEventListener('scroll',updateHeader,{passive:true});
toggle?.addEventListener('click',()=>{const open=mobileNav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Đóng menu':'Mở menu')});
mobileNav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{mobileNav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});
document.querySelectorAll('.reveal').forEach((el,index)=>{el.style.transitionDelay=`${Math.min(index%3,2)*70}ms`;observer.observe(el)});

const ecosystemOrbit=document.querySelector('.eco-orbit');
const ecosystemNodes=[...document.querySelectorAll('.eco-node')];
if(ecosystemOrbit&&ecosystemNodes.length){
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let orbitFrame;
  const renderOrbit=time=>{
    const width=ecosystemOrbit.clientWidth;
    const height=ecosystemOrbit.clientHeight;
    const radiusX=Math.min(width*.39,285);
    const radiusY=Math.min(height*.31,168);
    const progress=reduceMotion.matches?0:(time/24000)*Math.PI*2;
    ecosystemNodes.forEach((node,index)=>{
      const angle=progress+(index/ecosystemNodes.length)*Math.PI*2;
      const depth=(Math.sin(angle)+1)/2;
      const x=Math.cos(angle)*radiusX;
      const y=Math.sin(angle)*radiusY;
      const scale=.68+depth*.43+(node.classList.contains('academy') ? .09 : 0);
      const opacity=.48+depth*.52;
      const blur=(1-depth)*.55;
      node.style.transform=`translate(-50%,-50%) translate3d(${x}px,${y}px,${Math.round(depth*90-45)}px) scale(${scale})`;
      node.style.opacity=opacity;
      node.style.filter=`blur(${blur}px)`;
      node.style.zIndex=String(3+Math.round(depth*8));
    });
    if(!reduceMotion.matches) orbitFrame=requestAnimationFrame(renderOrbit);
  };
  const startOrbit=()=>{cancelAnimationFrame(orbitFrame);renderOrbit(performance.now())};
  startOrbit();
  reduceMotion.addEventListener?.('change',startOrbit);
  window.addEventListener('resize',startOrbit,{passive:true});
}
