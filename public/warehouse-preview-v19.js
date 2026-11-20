(() => {
'use strict';
if(window.parent!==window)document.body.classList.add('embedded');
const canvas=document.getElementById('warehouse'),ctx=canvas.getContext('2d'),dialog=document.getElementById('rack-dialog'),face=document.getElementById('face');
// Identificadores ilustrativos: não modificam endereços cadastrados no estoque.
const racks=[{x:115,y:55,w:145,d:52,modules:4},{x:160,y:200,w:180,d:65,modules:4},{x:150,y:330,w:190,d:65,modules:4},{x:150,y:470,w:275,d:70,modules:4},{x:145,y:610,w:290,d:70,modules:4},{x:145,y:750,w:290,d:70,modules:4},{x:145,y:890,w:290,d:70,modules:4}];
let selected=-1,hovered=-1,top=false,hits=[],stock=null,stockTime=0,address='',sales=[],hoverCell=null,directMode=false;
let yaw=-20,scale=100,tilt=.78,keyboardIndex=0,keyboardMode=false,drag=null,pinch=null;const pointers=new Map();
function project(x,y,z=0){const a=yaw*Math.PI/180,s=scale/100*.82,dx=x-260,dy=y-525;return [500+(dx*Math.cos(a)-dy*Math.sin(a))*s,550+((dx*Math.sin(a)+dy*Math.cos(a))*(top?1:tilt)-z)*s]}
function polygon(points,fill,stroke='#a78b61'){const p=points.map(v=>project(...v));ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke()}return p}
function cuboid(x,y,w,d,h,color,base=0){const a=yaw*Math.PI/180,front=Math.cos(a)>=0?y+d:y,side=Math.sin(a)>=0?x+w:x;polygon([[x,front,base],[x+w,front,base],[x+w,front,base+h],[x,front,base+h]],color);polygon([[side,y,base],[side,y+d,base],[side,y+d,base+h],[side,y,base+h]],'#765736');polygon([[x,y,base+h],[x+w,y,base+h],[x+w,y+d,base+h],[x,y+d,base+h]],color)}
const packing={x:28,y:130,w:38,d:325};
const packingOrder=racks.map((r,i)=>({i,d:Math.hypot(Math.max(r.x-packing.x-packing.w,0),Math.max(packing.y-r.y-r.d,r.y-packing.y-packing.d,0))})).sort((a,b)=>a.d-b.d).map(r=>r.i);
function textAt(value,x,y,z,size=12,color='#fff1d3'){const p=project(x,y,z);ctx.font='bold '+size+'px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(value,...p)}
function sampleBoxes(r,level){const bay=r.w/4;ctx.save();ctx.shadowBlur=0;for(const side of (Math.cos(yaw*Math.PI/180)>=0?['back','front']:['front','back']))for(let module=0;module<4;module++){const sizes=level===3?['small','small']:level===2?[module%2?'small':'medium']:level===1?[module%2?'medium':'small']:module===0?['small']:module%2?['large']:['medium','small'];sizes.forEach((size,n)=>{const factor=size==='large'?.73:size==='medium'?.5:.28,w=Math.min(bay-10,bay*factor),d=size==='large'?r.d*.4:size==='medium'?r.d*.3:r.d*.22,h=size==='large'?17:size==='medium'?11:7;const x=r.x+module*bay+5+n*(bay*.43),y=side==='front'?r.y+r.d-d-2:r.y+2;cuboid(x,y,w,d,h,size==='small'?'#d0b087':size==='medium'?'#b58d5c':'#9d754b',level*24+2);polygon([[x+w*.46,y,level*24+2+h+.2],[x+w*.54,y,level*24+2+h+.2],[x+w*.54,y+d,level*24+2+h+.2],[x+w*.46,y+d,level*24+2+h+.2]],'#e0caa1',null)})}ctx.restore()}
function drawPacking(){for(const y of [packing.y+5,packing.y+packing.d-9])for(const x of [packing.x+3,packing.x+packing.w-7])cuboid(x,y,4,4,23,'#776451');cuboid(packing.x,packing.y,packing.w,packing.d,4,'#a85f3d',23);textAt('Embalagem',packing.x+20,packing.y+packing.d/2,38,14,'#f6d8bf')}
function renderSuggestions(){const target=document.getElementById('packing-suggestions');target.replaceChildren();target.hidden=directMode||selected<0||packingOrder.indexOf(selected)>2;if(target.hidden)return;const heading=document.createElement('h3');heading.textContent='Perto da embalagem';target.append(heading);const note=document.createElement('p');note.textContent='Sugestão de organização para maior giro. Nenhuma localização do estoque foi alterada.';target.append(note);const rank=packingOrder.indexOf(selected),item=Date.now()-stockTime<900000?sales[rank]:null;const row=document.createElement('p');row.textContent=item?item.code+' · '+item.boxes+' caixas vendidas nos últimos 30 dias':'O ranking de amortecedores desta consulta aparecerá ao abrir pelo Painel.';target.append(row)}

function addressOf(i,bay,level,back){return 'T'+String(3+i*2+(back?1:0)).padStart(2,'0')+'-'+'ABCD'[bay]+'-'+level}
function shelfCells(r,i){const cells=[],back=Math.cos(yaw*Math.PI/180)<0,y=back?r.y:r.y+r.d,bayWidth=r.w/4;for(let bay=0;bay<4;bay++){
 for(let level=1;level<=4;level++){const low=(level-1)*24,high=level===4?88:level*24;cells.push({code:addressOf(i,bay,level,back),back,bay,level,surface:false,p:[[r.x+bay*bayWidth,y,low],[r.x+(bay+1)*bayWidth,y,low],[r.x+(bay+1)*bayWidth,y,high],[r.x+bay*bayWidth,y,high]].map(v=>project(...v))})}
 // In the top view only the upper tier is visible; the two halves are different faces.
 for(const rear of [true,false]){const from=rear?r.y:r.y+r.d/2,to=rear?r.y+r.d/2:r.y+r.d;cells.push({code:addressOf(i,bay,4,rear),back:rear,bay,level:4,surface:true,p:[[r.x+bay*bayWidth,from,top?1:72],[r.x+(bay+1)*bayWidth,from,top?1:72],[r.x+(bay+1)*bayWidth,to,top?1:72],[r.x+bay*bayWidth,to,top?1:72]].map(v=>project(...v))})}
 }return top?cells.filter(c=>c.surface):cells}
function within(p,x,y){let inside=false;for(let a=0,b=p.length-1;a<p.length;b=a++)if(((p[a][1]>y)!==(p[b][1]>y))&&(x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0]))inside=!inside;return inside}
function draw(){canvas.dataset.angle=String(Math.round(yaw));canvas.dataset.zoom=String(Math.round(scale));canvas.dataset.activeBlock=String(keyboardIndex+1);ctx.clearRect(0,0,1000,1000);hits=[];polygon([[25,20,0],[280,20,0],[325,75,0],[490,270,0],[490,1040,0],[25,1040,0]],'#514533','#a28e70');
polygon([[25,20,0],[25,1040,0],[25,1040,12],[25,20,12]],'#78664e','#ad9270');
const order=[...racks.map((r,i)=>({r,i,depth:project(r.x+r.w/2,r.y+r.d/2)[1]})),{r:packing,i:-1,depth:project(packing.x+packing.w/2,packing.y+packing.d/2)[1]}].sort((a,b)=>a.depth-b.depth);
for(const {r,i} of order){if(i===-1){drawPacking();continue}const suggested=sales.length>packingOrder.indexOf(i)&&packingOrder.indexOf(i)<3&&Date.now()-stockTime<900000;if(suggested)polygon([[r.x-5,r.y-5,0],[r.x+r.w+5,r.y-5,0],[r.x+r.w+5,r.y+r.d+5,0],[r.x-5,r.y+r.d+5,0]],'#bd742e44','#dd9b48');const lit=i===hovered||i===selected||(keyboardMode&&document.activeElement===canvas&&i===keyboardIndex),color=lit?'#ffd486':'#b99b60';ctx.save();if(lit){ctx.shadowColor='#ffb450';ctx.shadowBlur=22}
if(top){polygon([[r.x,r.y,1],[r.x+r.w,r.y,1],[r.x+r.w,r.y+r.d,1],[r.x,r.y+r.d,1]],color)}else{
for(let level=0;level<4;level++){const z=level*24;polygon([[r.x,r.y,z],[r.x+r.w,r.y,z],[r.x+r.w,r.y+r.d,z],[r.x,r.y+r.d,z]],color);sampleBoxes(r,level)}
for(let bay=0;bay<=4;bay++)for(const y of [r.y,r.y+r.d-3])cuboid(r.x+bay*(r.w/4)-(bay===4?3:0),y,3,3,83,lit?'#eed4a2':'#928267');
}for(let bay=0;bay<4;bay++){textAt('ABCD'[bay],r.x+(bay+.5)*(r.w/4),r.y+r.d+2,top?3:79,14,lit?'#fff6da':'#f5dfb7')}ctx.restore();
// A área de interação cobre toda a altura, inclusive os vãos entre níveis.
const p=top?[[r.x,r.y,0],[r.x+r.w,r.y,0],[r.x+r.w,r.y+r.d,0],[r.x,r.y+r.d,0]]:[[r.x,r.y,82],[r.x+r.w,r.y,82],[r.x+r.w,r.y+r.d,82],[r.x+r.w,r.y+r.d,0],[r.x,r.y+r.d,0],[r.x,r.y,0]];hits.push({i,p:p.map(v=>project(...v)),cells:shelfCells(r,i)});
const point=project(r.x+r.w/2,r.y+r.d/2,top?2:99);ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillStyle=lit?'#fff4dc':'#eddbbd';ctx.fillText('Bloco '+(i+1),...point);
}const hoveredShape=hoverCell?hits.flatMap(h=>h.cells).find(c=>c.code===hoverCell.code&&c.surface===hoverCell.surface):null;if(hoveredShape){ctx.save();ctx.beginPath();hoveredShape.p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#ffd78638';ctx.strokeStyle='#fff0bc';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore()}}

function hitTest(event){const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*1000/rect.width,y=(event.clientY-rect.top)*1000/rect.height;for(const hit of [...hits].reverse()){for(const cell of [...hit.cells].reverse())if(within(cell.p,x,y))return {i:hit.i,cell};if(within(hit.p,x,y))return {i:hit.i,cell:null}}return null}
function setHover(hit){const i=hit?.i??-1,cell=hit?.cell??null;if(hovered===i&&hoverCell?.code===cell?.code)return;hovered=i;hoverCell=cell;canvas.dataset.hoveredBlock=i<0?'':String(i+1);canvas.dataset.hoveredAddress=cell?.code??'';canvas.title=cell?.code??'';canvas.style.cursor=i<0?'grab':'pointer';draw()}
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
 if(drag&&event.pointerId===drag.id){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){hoverCell=null;hovered=-1;yaw=drag.yaw+dx*.25;tilt=clamp(drag.tilt+dy*.003,.35,1);draw()}return}
 keyboardMode=false;setHover(hitTest(event));
});
canvas.addEventListener('pointerup',event=>{
 const tap=drag&&event.pointerId===drag.id&&!drag.moved&&pointers.size===1;
 pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 if(!pointers.size){drag=null;pinch=null;canvas.style.cursor='grab'}
 if(tap){const i=hitTest(event);if(i)select(i.i,i.cell)}
});
canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);drag=null;pinch=null;canvas.style.cursor='grab'});
canvas.addEventListener('lostpointercapture',event=>{pointers.delete(event.pointerId);if(drag?.id===event.pointerId){drag=null;pinch=null;canvas.style.cursor='grab'}});
canvas.addEventListener('pointerleave',()=>{if(!drag)setHover(null)});
canvas.addEventListener('wheel',event=>{event.preventDefault();scale=clamp(scale*Math.exp(-event.deltaY*.0015),60,150);draw()},{passive:false});
canvas.addEventListener('focus',()=>{keyboardMode=true;announce();draw()});canvas.addEventListener('blur',()=>draw());
canvas.addEventListener('keydown',event=>{
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ','+','=','-','_','Home','0','v','V'].includes(event.key))return;
 event.preventDefault();keyboardMode=true;hovered=-1;hoverCell=null;
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
function showAddress(value){address=value;document.getElementById('products').hidden=false;document.getElementById('address').textContent=directMode?'Amortecedores neste endereço':value;document.querySelectorAll('.level button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===value)));renderProducts()}
function renderLevels(){const target=document.getElementById('levels');target.replaceChildren();address='';document.getElementById('products').hidden=true;for(let level=4;level>=1;level--){const row=document.createElement('div');row.className='level';row.style.setProperty('--modules',racks[selected].modules);const label=document.createElement('span');label.textContent=level===1?'Chão':String(level)+'º nível';row.append(label);for(const letter of 'ABCD'.slice(0,racks[selected].modules)){const b=document.createElement('button');b.type='button';b.textContent=face.value+'-'+letter+'-'+level;b.setAttribute('aria-pressed','false');b.onclick=()=>showAddress(b.textContent);row.append(b)}target.append(row)}}
function select(i,cell=null){selected=i;keyboardIndex=i;directMode=Boolean(cell);hoverCell=null;document.getElementById('rack-title').textContent='Bloco '+(i+1);face.replaceChildren();for(const number of [3+i*2,4+i*2]){const option=document.createElement('option');option.value='T'+String(number).padStart(2,'0');option.textContent=option.value;face.append(option)}if(cell)face.value='T'+String(3+i*2+(cell.back?1:0)).padStart(2,'0');renderLevels();document.getElementById('levels').hidden=directMode;document.querySelector('.face-choice').hidden=directMode;if(cell){document.getElementById('rack-title').textContent=cell.code;showAddress(cell.code)}renderSuggestions();draw();if(!dialog.open)dialog.showModal();document.getElementById('close').focus()}
face.onchange=renderLevels;document.getElementById('close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{selected=-1;hovered=-1;hoverCell=null;directMode=false;address='';document.getElementById('products').hidden=true;canvas.focus({preventScroll:true});draw()});
window.addEventListener('message',event=>{if(window.parent===window||event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='liber:warehouse-stock')return;const rows=event.data.rows;if(!Array.isArray(rows)||rows.length>50000||rows.some(r=>!r||typeof r.code!=='string'||typeof r.location!=='string'||typeof r.status!=='string'||!Number.isSafeInteger(r.boxes)||r.boxes<0))return;stock=rows;stockTime=Date.now();sales=Array.isArray(event.data.topSellers)?event.data.topSellers.filter(r=>r&&typeof r.code==='string'&&/^A[A-Z]{2}-/.test(r.code)&&Number.isSafeInteger(r.boxes)&&r.boxes>0).sort((a,b)=>b.boxes-a.boxes||a.code.localeCompare(b.code)).slice(0,3):[];if(address)renderProducts();if(selected>=0)renderSuggestions();draw()});
if(window.parent!==window)window.parent.postMessage({type:'liber:warehouse-ready'},location.origin);
function connection(){document.getElementById('connection').textContent=navigator.onLine?'Mapa ilustrativo':'Offline — mapa salvo neste aparelho'}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();draw();setInterval(()=>{if((address||selected>=0)&&stock&&Date.now()-stockTime>=900000){stock=null;sales=[];renderProducts();if(selected>=0)renderSuggestions();draw()}},1000);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.open&&window.parent!==window)window.parent.postMessage({type:'liber:warehouse-close'},location.origin)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();