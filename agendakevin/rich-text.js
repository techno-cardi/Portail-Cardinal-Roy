(() => {
'use strict';
const M={b:'\u2061',i:'\u2062',u:'\u2063'}, RX=/[\u2061\u2062\u2063]/g, ST={b:'bold',i:'italic',u:'underline'};
let lastRange=null,lastEl=null,composing=false;
const strip=s=>String(s??'').replace(RX,'');
const styleOf=e=>e?.tagName==='B'||e?.tagName==='STRONG'?'b':e?.tagName==='I'||e?.tagName==='EM'?'i':e?.tagName==='U'?'u':'';
function tokensNode(n){
 if(n.nodeType===3)return n.nodeValue||'';
 if(!(n instanceof HTMLElement))return'';
 if(n.classList.contains('rt-mark'))return n.textContent||'';
 const inner=[...n.childNodes].map(tokensNode).join(''),k=styleOf(n);
 return k&&n.dataset.rt!=='1'?M[k]+inner+M[k]:inner;
}
const tokens=e=>[...e.childNodes].map(tokensNode).join('');
function mark(c){const s=document.createElement('span');s.className='rt-mark';s.contentEditable='false';s.ariaHidden='true';s.textContent=c;return s}
function wrap(n,k){const e=document.createElement(k==='b'?'strong':k==='i'?'em':'u');e.dataset.rt='1';e.append(n);return e}
function offsets(e){
 const sel=getSelection(),len=strip(e?.textContent).length;if(!sel?.rangeCount||!e)return{start:len,end:len};
 const r=sel.getRangeAt(0);if(!e.contains(r.startContainer)||!e.contains(r.endContainer))return{start:len,end:len};
 const one=(n,o)=>{const x=document.createRange();x.selectNodeContents(e);try{x.setEnd(n,o)}catch{return len}return strip(x.toString()).length};
 const start=one(r.startContainer,r.startOffset),end=one(r.endContainer,r.endOffset);return{start,end:Math.max(start,end)};
}
function point(e,w){
 let rem=Math.max(0,w),last=null;const it=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('.rt-mark')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 for(let n=it.nextNode();n;n=it.nextNode()){last=n;const l=n.nodeValue?.length||0;if(rem<=l)return[n,rem];rem-=l}
 if(last)return[last,last.nodeValue?.length||0];const n=document.createTextNode('');e.append(n);return[n,0];
}
function restore(e,o,focus=false){
 if(!e||!o)return;const sel=getSelection();if(!sel)return;if(focus)e.focus({preventScroll:true});
 const a=point(e,o.start),b=point(e,o.end),r=document.createRange();try{r.setStart(...a);r.setEnd(...b);sel.removeAllRanges();sel.addRange(r)}catch{}
}
function render(e,t,preserve=true){
 if(!e)return;const sel=getSelection(),o=preserve&&sel?.anchorNode&&e.contains(sel.anchorNode)?offsets(e):null;
 const f=document.createDocumentFragment(),a={b:false,i:false,u:false};let buf='';
 const flush=()=>{if(!buf)return;let n=document.createTextNode(buf);for(const k of ['b','i','u'])if(a[k])n=wrap(n,k);f.append(n);buf=''};
 for(const c of String(t??'')){const k=c===M.b?'b':c===M.i?'i':c===M.u?'u':'';if(!k){buf+=c;continue}flush();f.append(mark(c));a[k]=!a[k]}flush();
 e.replaceChildren(f);e.dataset.rtReady='1';if(o)restore(e,o);
}
function normalize(e,force=false){
 if(!e?.matches?.('.block-text')||composing)return false;const t=tokens(e),raw=e.textContent||'',need=force||e.dataset.rtReady!=='1'||t!==raw;
 if(need)render(e,t,document.activeElement===e);return need;
}
function within(r){if(r?.matches?.('.block-text'))normalize(r,true);r?.querySelectorAll?.('.block-text').forEach(e=>normalize(e,true))}
function remember(){
 const s=getSelection();if(!s?.rangeCount)return;const r=s.getRangeAt(0),p=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement,e=p?.closest?.('.block-text');
 if(!e||!e.contains(r.endContainer))return;lastRange=r.cloneRange();lastEl=e;state();
}
function restoreLast(){if(!lastRange||!lastEl?.isConnected)return false;const s=getSelection();try{lastEl.focus({preventScroll:true});s.removeAllRanges();s.addRange(lastRange.cloneRange());return true}catch{return false}}
function state(){
 const tb=document.getElementById('agendaRichTextToolbar');if(!tb)return;const ok=!!lastEl?.isConnected;tb.querySelectorAll('button').forEach(b=>{b.disabled=!ok;b.classList.remove('active')});
 if(!ok)return;for(const [k,c] of Object.entries(ST)){let on=false;try{on=document.queryCommandState(c)}catch{}tb.querySelector(`[data-k="${k}"]`)?.classList.toggle('active',!!on)}
}
function materialize(e,o){
 e.querySelectorAll('.rt-mark').forEach(n=>n.remove());
 e.querySelectorAll('[data-rt="1"]').forEach(n=>delete n.dataset.rt);
 e.dataset.rtReady='0';restore(e,o,true);
}
function cmd(k,e=lastEl){
 if(!e?.matches?.('.block-text'))return;const sel=getSelection();if(!e.contains(sel?.anchorNode)&&!restoreLast())return;
 const range=getSelection()?.rangeCount?getSelection().getRangeAt(0):null,collapsed=!range||range.collapsed,o=offsets(e);
 materialize(e,o);
 try{document.execCommand(ST[k],false,null)}catch{}
 if(collapsed){remember();return}
 normalize(e,true);e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:k==='b'?'formatBold':k==='i'?'formatItalic':'formatUnderline'}));queueMicrotask(remember);
}
function idx(t,w){let v=0,i=0;while(i<t.length){if(t[i]===M.b||t[i]===M.i||t[i]===M.u){i++;continue}if(v>=w)break;v++;i++}while(i<t.length&&(t[i]===M.b||t[i]===M.i||t[i]===M.u))i++;return i}
function active(t,n){const a={b:false,i:false,u:false};for(let i=0;i<n;i++){const k=t[i]===M.b?'b':t[i]===M.i?'i':t[i]===M.u?'u':'';if(k)a[k]=!a[k]}return a}
function split(t,s,e){
 t=String(t??'');const a=idx(t,s),b=idx(t,e),x=active(t,a),y=active(t,b),bm=z=>['b','i','u'].filter(k=>z[k]).map(k=>M[k]).join('');
 let l=t.slice(0,a)+bm(x),r=bm(y)+t.slice(b);if(!strip(l))l='';if(!strip(r))r='';return{left:l,right:r};
}
function setup(){
 if(!document.getElementById('agendaRichTextStyle')){const s=document.createElement('style');s.id='agendaRichTextStyle';s.textContent='.rt-mark{display:none!important}#agendaRichTextToolbar{display:inline-flex;gap:3px;margin-left:5px;padding-left:6px;border-left:1px solid #d6e0e5}#agendaRichTextToolbar button{width:27px;height:27px;padding:0;border:1px solid #c8d5dd;border-radius:7px;background:#fff;color:#173246;font-weight:850;cursor:pointer}#agendaRichTextToolbar button.active{background:#d9edf7;border-color:#8fbacd;color:#07577f}#agendaRichTextToolbar button:disabled{opacity:.35}#agendaRichTextToolbar [data-k=i]{font-style:italic}#agendaRichTextToolbar [data-k=u]{text-decoration:underline}@media print{#agendaRichTextToolbar{display:none!important}}';document.head.append(s)}
 let tb=document.getElementById('agendaRichTextToolbar'),row=document.querySelector('.status-row');if(!tb&&row){tb=document.createElement('div');tb.id='agendaRichTextToolbar';tb.innerHTML='<button type="button" data-k="b" title="Gras (Ctrl+B)"><b>B</b></button><button type="button" data-k="i" title="Italique (Ctrl+I)">I</button><button type="button" data-k="u" title="Souligné (Ctrl+U)">U</button>';row.append(tb);tb.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault()});tb.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b&&!b.disabled){restoreLast();cmd(b.dataset.k)}})}
 within(document);state();
 document.addEventListener('selectionchange',remember);
 document.addEventListener('compositionstart',e=>{if(e.target.closest?.('.block-text'))composing=true},true);
 document.addEventListener('compositionend',e=>{composing=false;const x=e.target.closest?.('.block-text');if(x)normalize(x,true)},true);
 document.addEventListener('focusin',e=>{const x=e.target.closest?.('.block-text');if(x){lastEl=x;normalize(x);queueMicrotask(remember)}});
 document.addEventListener('focusout',e=>{const x=e.target.closest?.('.block-text');if(x&&x.dataset.rtReady==='0')normalize(x,true)},true);
 document.addEventListener('input',e=>{const x=e.target.closest?.('.block-text');if(x&&!composing){normalize(x);lastEl=x;queueMicrotask(remember)}},true);
 document.addEventListener('keydown',e=>{const x=e.target.closest?.('.block-text');if(!x||e.isComposing)return;if(e.key==='Backspace'&&!strip(x.textContent).trim()){x.replaceChildren();x.dataset.rtReady='1';return}if(!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey)return;const k=e.key.toLowerCase(),m=k==='b'?'b':k==='i'?'i':k==='u'?'u':'';if(!m)return;e.preventDefault();e.stopImmediatePropagation();lastEl=x;remember();cmd(m,x)},true);
 new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)within(n)}).observe(document.body,{childList:true,subtree:true});
}
window.CRAgendaRichText=Object.freeze({stripMarkers:strip,tokensFromElement:tokens,renderTokens:render,visibleSelectionOffsets:offsets,restoreVisibleSelection:restore,splitTokensAtVisibleRange:split});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
