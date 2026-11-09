import {useEffect,useId,useRef} from 'react';

export function BuilderDrawer({title,description,onClose,children,footer}) {
 const dialog=useRef(null), headingId=useId();
 useEffect(()=>{const node=dialog.current;const previous=document.activeElement;const overflow=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return ()=>{node.close();document.body.style.overflow=overflow;previous?.focus?.();};},[]);
 return <dialog ref={dialog} className="builder-drawer builder-workspace" aria-labelledby={headingId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header><div><h2 id={headingId}>{title}</h2>{description&&<p>{description}</p>}</div><button autoFocus aria-label="Close / Kapat" onClick={onClose}>×</button></header>
  <div className="builder-drawer-body">{children}</div>
  <footer>{footer}</footer>
 </dialog>;
}
