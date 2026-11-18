/** Small loader. Neither React nor Three.js is fetched before an island is needed. */
export function bootstrap(document, window, importers = {
  hero: () => import('./hero-3d.jsx'),
  logo: () => import('./liquid-logo.jsx'),
}) {
  if (!window.IntersectionObserver || !window.MutationObserver) return () => {};
  const targets = [
    {kind:'hero',element:document.querySelector('#hero-stage'),container:document.querySelector('#hero-3d')},
    {kind:'logo',element:document.querySelector('#liquid-logo'),container:document.querySelector('#liquid-logo-canvas')},
  ].filter(item=>item.element&&item.container).map(item=>({...item,seen:false,status:'idle',dispose:null}));
  let disposed = false;
  const permitted = () => {
    if (document.hidden || window.navigator?.connection?.saveData) return false;
    if (document.body.classList.contains('motion-paused')) return false;
    return document.body.classList.contains('motion-enabled') || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  };
  const start = item => {
    if (disposed || !item.seen || item.status!=='idle' || !permitted()) return;
    item.status='loading';
    importers[item.kind]().then(module=>{
      if (disposed) return;
      // A changed preference during the download keeps the original artwork visible.
      if (!item.seen || !permitted()) { item.status='idle'; return; }
      item.dispose = item.kind==='hero' ? module.mountHero(item.container,item.element) : module.mountLogo(item.container,item.element);
      item.status='mounted';
    }).catch(()=>{item.status='failed';});
  };
  const refresh = () => targets.forEach(start);
  const intersection = new window.IntersectionObserver(entries=>{
    for(const entry of entries){const item=targets.find(item=>item.element===entry.target);if(item){item.seen=entry.isIntersecting;start(item);}}
  },{rootMargin:'140px 0px',threshold:0});
  targets.forEach(item=>intersection.observe(item.element));
  const motion = new window.MutationObserver(refresh);
  motion.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',refresh);
  window.navigator?.connection?.addEventListener?.('change',refresh);
  return () => {
    disposed=true;intersection.disconnect();motion.disconnect();
    document.removeEventListener('visibilitychange',refresh);
    window.navigator?.connection?.removeEventListener?.('change',refresh);
    targets.forEach(item=>item.dispose?.());
  };
}

if(typeof document!=='undefined'&&typeof window!=='undefined') bootstrap(document,window);
