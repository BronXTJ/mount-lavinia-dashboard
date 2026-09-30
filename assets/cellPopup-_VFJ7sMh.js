import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{f as t}from"./leaflet-CYOuIKG6.js";import{c as n}from"./index-DVo-vOK4.js";import{t as r}from"./escapeHtml-C8QiiDyi.js";var i=n();function a({error:e,onRetry:t}){return e?(0,i.jsxs)(`div`,{role:`alert`,className:`pointer-events-auto absolute left-3 top-3 z-[1100] max-w-sm rounded-md border border-rose-500/40 bg-[#1a0f12]/95 px-3 py-2 text-[11px] text-rose-100 shadow-lg`,children:[(0,i.jsx)(`p`,{className:`font-medium`,children:`Map data failed to load`}),(0,i.jsx)(`p`,{className:`mt-0.5 text-rose-200/80`,children:String(e.message||e)}),t?(0,i.jsx)(`button`,{type:`button`,onClick:t,className:`mt-1.5 rounded border border-rose-400/50 px-2 py-0.5 text-[10px] font-medium text-rose-100 hover:bg-rose-500/20`,children:`Retry`}):null]}):null}var o=e(t(),1),s={maxWidth:320,offset:[0,-12],autoPanPadding:[48,48],className:`cell-info-popup`};function c(e){try{let t=o.default.geoJSON(e).getBounds();return[t.getNorth(),t.getCenter().lng]}catch{return null}}function l(e){try{let t=o.default.geoJSON(e).getBounds().getCenter();return[t.lat,t.lng]}catch{return null}}function u(e,t=`#94a3b8`){return`<div style="margin-top:4px;height:6px;border-radius:3px;background:#2a3a4a;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,(Number(e)||0)*100))}%;background:${t}"></div></div>`}function d(e){let t=String(e??``).replace(`#`,``).trim();if(t.length!==3&&t.length!==6)return`#ffffff`;let n=t.length===3?t.split(``).map(e=>e+e).join(``):t,r=parseInt(n.slice(0,2),16)/255,i=parseInt(n.slice(2,4),16)/255,a=parseInt(n.slice(4,6),16)/255;return .2126*r+.7152*i+.0722*a>.55?`#0f172a`:`#ffffff`}function f({title:e,primaryLabel:t,primaryValue:n,badge:i=null,metrics:a=[],footer:o=null}){let s=i==null?``:`<span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:${i.color};color:${i.textColor??`#ffffff`}">${r(i.label)}</span>`,c=t!=null||n!=null||i?`<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        ${t==null?``:`<span style="font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:0.02em">${r(t)}</span>`}
        ${n==null?``:`<span style="font-weight:700;font-size:13px;color:#f8fafc">${r(n)}</span>`}
        ${s}
      </div>`:``,l=Math.min(3,Math.max(1,a.length||1)),d=a.length>0?`<div style="margin-top:10px;display:grid;grid-template-columns:repeat(${l},1fr);gap:8px;font-size:11px">
        ${a.map(e=>`<div>
          <div style="color:#94a3b8">${r(e.label)}</div>
          <div style="font-weight:600;margin-top:2px">${r(e.value)}</div>
          ${e.bar!=null&&Number.isFinite(Number(e.bar))?u(e.bar,e.barColor):``}
        </div>`).join(``)}
      </div>`:``,f=o==null?``:`<div style="margin-top:12px;padding:8px 10px;border-radius:8px;text-align:center;font-size:13px;font-weight:800;letter-spacing:0.02em;background:${o.color};color:${o.textColor??`#ffffff`};box-shadow:0 0 0 1px rgba(255,255,255,0.25),0 4px 12px rgba(0,0,0,0.35)">${r(o.label)}</div>`;return`
    <div style="min-width:220px;font-family:system-ui,sans-serif;color:#e2e8f0">
      <strong style="font-size:13px;color:#f8fafc">${r(e)}</strong>
      ${c}
      ${d}
      ${f}
    </div>
  `}export{c as a,l as i,f as n,a as o,d as r,s as t};