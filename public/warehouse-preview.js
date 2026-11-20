(() => {
'use strict';
if(window.parent!==window)document.body.classList.add('embedded');
const canvas=document.getElementById('warehouse'),ctx=canvas.getContext('2d'),dialog=document.getElementById('rack-dialog'),face=document.getElementById('face');
// Identificadores ilustrativos: não modificam endereços cadastrados no estoque.
const racks=[{x:115,y:55,w:145,d:52,modules:3},{x:160,y:200,w:180,d:65,modules:3},{x:150,y:330,w:190,d:65,modules:3},{x:150,y:470,w:275,d:70,modules:4},{x:145,y:610,w:290,d:70,modules:4},{x:145,y:750,w:290,d:70,modules:4},{x:145,y:890,w:290,d:70,modules:4}];
let selected=-1,hovered=-1,top=false,hits=[],stock=null,stockTime=0,address='';
let yaw=-20,scale=100,tilt=.78,keyboardIndex=0,keyboardMode=false,drag=null,pinch=null;const pointers=new Map();
function project(x,y,z=0){const a=yaw*Math.PI/180,s=scale/100*.82,dx=x-260,dy=y-525;return [500+(dx*Math.cos(a)-dy*Math.sin(a))*s,550+((dx*Math.sin(a)+dy*Math.cos(a))*(top?1:tilt)-z)*s]}
function polygon(points,fill,stroke='#a78b61'){const p=points.map(v=>project(...v));ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke()}return p}
function cuboid(x,y,w,d,h,color){polygon([[x,y,0],[x+w,y,0],[x+w,y,h],[x,y,h]],color);polygon([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],'#705e39');polygon([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],color)}
function draw(){canvas.dataset.angle=String(Math.round(yaw));canvas.dataset.zoom=String(Math.round(scale));canvas.dataset.activeBlock=String(keyboardIndex+1);ctx.clearRect(0,0,1000,1000);hits=[];polygon([[25,20,0],[280,20,0],[325,75,0],[490,270,0],[490,1040,0],[25,1040,0]],'#514533','#a28e70');
const order=racks.map((r,i)=>({r,i,depth:project(r.x+r.w/2,r.y+r.d/2)[1]})).sort((a,b)=>a.depth-b.depth);
for(const {r,i} of order){const lit=i===hovered||i===selected||(keyboardMode&&document.activeElement===canvas&&i===keyboardIndex),color=lit?'#ffd486':'#b99b60';ctx.save();if(lit){ctx.shadowColor='#ffb450';ctx.shadowBlur=22}
if(top){polygon([[r.x,r.y,1],[r.x+r.w,r.y,1],[r.x+r.w,r.y+r.d,1],[r.x,r.y+r.d,1]],color)}else{
for(const x of [r.x,r.x+r.w-4])for(const y of [r.y,r.y+r.d-4])cuboid(x,y,4,4,82,lit?'#f1cf94':'#a49576');
for(let level=0;level<4;level++){const z=level*24;polygon([[r.x,r.y,z],[r.x+r.w,r.y,z],[r.x+r.w,r.y+r.d,z],[r.x,r.y+r.d,z]],color)}
}ctx.restore();
// A área de interação cobre toda a altura, inclusive os vãos entre níveis.
const p=top?[[r.x,r.y,0],[r.x+r.w,r.y,0],[r.x+r.w,r.y+r.d,0],[r.x,r.y+r.d,0]]:[[r.x,r.y,82],[r.x+r.w,r.y,82],[r.x+r.w,r.y+r.d,82],[r.x+r.w,r.y+r.d,0],[r.x,r.y+r.d,0],[r.x,r.y,0]];hits.push({i,p:p.map(v=>project(...v))});
const point=project(r.x+r.w/2,r.y+r.d/2,top?2:99);ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle=lit?'#fff4dc':'#eddbbd';ctx.fillText('Bloco '+(i+1),...point);
}}
function hitTest(event){const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*1000/rect.width,y=(event.clientY-rect.top)*1000/rect.height;for(const hit of [...hits].reverse()){let inside=false,p=hit.p;for(let a=0,b=p.length-1;a<p.length;b=a++)if(((p[a][1]>y)!==(p[b][1]>y))&&(x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0]))inside=!inside;if(inside)return hit.i}return -1}
function setHover(i){if(hovered===i)return;hovered=i;canvas.dataset.hoveredBlock=i<0?'':String(i+1);canvas.style.cursor=i<0?'grab':'pointer';draw()}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function reset(){yaw=-20;scale=100;tilt=.78;top=false;draw()}
function announce(){document.getElementById('map-selection').textContent='Prateleira '+(keyboardIndex+1)+' de 7. Enter para abrir.'}
function distance(){const values=[...pointers.values()];return Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y)}
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;canvas.focus({preventScroll:true});keyboardMode=false;
 pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);
 if(pointers.size===2){pinch={distance:distance(),scale};if(drag)drag.moved=true;return}
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,tilt,moved:false};canvas.style.cursor='grabbing';
});
canvas.addEventListener('pointermove',event=>{
 if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(pointers.size===2&&pinch){scale=clamp(pinch.scale*distance()/Math.max(1,pinch.distance),60,150);draw();return}
 if(drag&&event.pointerId===drag.id){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){yaw=drag.yaw+dx*.25;tilt=clamp(drag.tilt+dy*.003,.35,1);draw()}return}
 keyboardMode=false;setHover(hitTest(event));
});
canvas.addEventListener('pointerup',event=>{
 const tap=drag&&event.pointerId===drag.id&&!drag.moved&&pointers.size===1;
 pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 if(!pointers.size){drag=null;pinch=null;canvas.style.cursor='grab'}
 if(tap){const i=hitTest(event);if(i>=0)select(i)}
});
canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);drag=null;pinch=null;canvas.style.cursor='grab'});
canvas.addEventListener('lostpointercapture',event=>{pointers.delete(event.pointerId);if(drag?.id===event.pointerId){drag=null;pinch=null;canvas.style.cursor='grab'}});
canvas.addEventListener('pointerleave',()=>{if(!drag)setHover(-1)});
canvas.addEventListener('wheel',event=>{event.preventDefault();scale=clamp(scale*Math.exp(-event.deltaY*.0015),60,150);draw()},{passive:false});
canvas.addEventListener('focus',()=>{keyboardMode=true;announce();draw()});canvas.addEventListener('blur',()=>draw());
canvas.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','+','=','-','_','Home','0','v','V'].includes(event.key))return;
 event.preventDefault();keyboardMode=true;hovered=-1;
 if(event.key==='ArrowDown')keyboardIndex=(keyboardIndex+1)%racks.length;
 else if(event.key==='ArrowUp')keyboardIndex=(keyboardIndex+racks.length-1)%racks.length;
 else if(event.key==='ArrowLeft')yaw-=5;else if(event.key==='ArrowRight')yaw+=5;
 else if(['+','='].includes(event.key))scale=clamp(scale+10,60,150);else if(['-','_'].includes(event.key))scale=clamp(scale-10,60,150);
 else if(['Home','0'].includes(event.key))reset();else if(['v','V'].includes(event.key))top=!top;
 else if(event.key==='Enter'||event.key===' ')select(keyboardIndex);
 announce();draw();
});
function renderProducts(){const target=document.getElementById('product-rows');target.replaceChildren();const rows=stock&&Date.now()-stockTime<900000?stock.filter(row=>row.location.toUpperCase()===address&&/^A[A-Z]{2}-/.test(row.code)):null;
if(!rows?.length){const p=document.createElement('p');p.textContent=rows?'Sem amortecedores vinculados a este endereço.':'Abra o mapa pelo Painel conectado para consultar os amortecedores. A numeração desta prévia ainda é provisória.';target.append(p);return}
for(const row of rows){const div=document.createElement('div');div.className='product-row';const code=document.createElement('strong'),detail=document.createElement('span');code.textContent=row.code;detail.textContent=row.boxes+' caixas · '+row.status;div.append(code,detail);target.append(div)}}
function showAddress(value){address=value;document.getElementById('products').hidden=false;document.getElementById('address').textContent=value;document.querySelectorAll('.level button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===value)));renderProducts()}
function renderLevels(){const target=document.getElementById('levels');target.replaceChildren();address='';document.getElementById('products').hidden=true;for(let level=4;level>=1;level--){const row=document.createElement('div');row.className='level';row.style.setProperty('--modules',racks[selected].modules);const label=document.createElement('span');label.textContent=level===1?'Chão':String(level)+'º nível';row.append(label);for(const letter of 'ABCD'.slice(0,racks[selected].modules)){const b=document.createElement('button');b.type='button';b.textContent=face.value+'-'+letter+'-'+level;b.setAttribute('aria-pressed','false');b.onclick=()=>showAddress(b.textContent);row.append(b)}target.append(row)}}
function select(i){selected=i;keyboardIndex=i;document.getElementById('rack-title').textContent='Bloco '+(i+1);face.replaceChildren();for(const number of [3+i*2,4+i*2]){const option=document.createElement('option');option.value='T'+String(number).padStart(2,'0');option.textContent=option.value;face.append(option)}renderLevels();draw();if(!dialog.open)dialog.showModal();document.getElementById('close').focus()}
face.onchange=renderLevels;document.getElementById('close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{selected=-1;hovered=-1;address='';document.getElementById('products').hidden=true;canvas.focus({preventScroll:true});draw()});
window.addEventListener('message',event=>{if(window.parent===window||event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='liber:warehouse-stock')return;const rows=event.data.rows;if(!Array.isArray(rows)||rows.length>50000||rows.some(r=>!r||typeof r.code!=='string'||typeof r.location!=='string'||typeof r.status!=='string'||!Number.isSafeInteger(r.boxes)||r.boxes<0))return;stock=rows;stockTime=Date.now();if(address)renderProducts()});
if(window.parent!==window)window.parent.postMessage({type:'liber:warehouse-ready'},location.origin);
function connection(){document.getElementById('connection').textContent=navigator.onLine?'Mapa ilustrativo':'Offline — mapa salvo neste aparelho'}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();draw();setInterval(()=>{if(address&&stock&&Date.now()-stockTime>=900000){stock=null;renderProducts()}},1000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();