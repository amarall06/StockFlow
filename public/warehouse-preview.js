(() => {
'use strict';
const canvas=document.getElementById('warehouse'),ctx=canvas.getContext('2d');
const angle=document.getElementById('angle'),zoom=document.getElementById('zoom');
const racks=[{x:115,y:55,w:145,d:52},{x:160,y:215,w:180,d:65},{x:150,y:350,w:190,d:65},{x:150,y:500,w:275,d:70},{x:145,y:650,w:290,d:70}];
let selected=-1,top=false,hits=[];
function project(x,y,z=0){const a=Number(angle.value)*Math.PI/180,s=Number(zoom.value)/100;const dx=x-260,dy=y-410;return [500+(dx*Math.cos(a)-dy*Math.sin(a))*s,460+((dx*Math.sin(a)+dy*Math.cos(a))*(top?1:.72)-z)*s]}
function polygon(points,fill,stroke='#a78b61'){const p=points.map(v=>project(...v));ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke()}return p}
function cuboid(x,y,w,d,h,color){polygon([[x,y,0],[x+w,y,0],[x+w,y,h],[x,y,h]],color);polygon([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],'#705e39');return polygon([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],color)}
function text(label,x,y,z,color='#f4d8ac'){const p=project(x,y,z);ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(label,...p)}
function draw(){ctx.clearRect(0,0,1000,850);hits=[];
polygon([[25,20,0],[280,20,0],[325,75,0],[490,270,0],[490,800,0],[25,800,0]],'#514533','#a28e70');
for(let y=100;y<800;y+=100)polygon([[25,y,0],[490,y,0],[490,y+1,0],[25,y+1,0]],'#ffffff09',null);
cuboid(60,100,16,320,top?0:30,'#b95041');text('EMBALAGEM',105,260,top?0:34,'#ffd6cd');
polygon([[100,18,2],[175,18,2],[175,27,2],[100,27,2]],'#dd80b5',null);
for(const y of [625,720])polygon([[23,y,2],[33,y,2],[33,y+50,2],[23,y+50,2]],'#dd80b5',null);
const order=racks.map((r,i)=>({r,i,depth:project(r.x+r.w/2,r.y+r.d/2)[1]})).sort((a,b)=>a.depth-b.depth);
for(const {r,i} of order){const color=i===selected?'#ffc16b':'#c6a55e';if(top){hits.push({i,p:polygon([[r.x,r.y,1],[r.x+r.w,r.y,1],[r.x+r.w,r.y+r.d,1],[r.x,r.y+r.d,1]],color)})}else{
for(const x of [r.x,r.x+r.w-4])for(const y of [r.y,r.y+r.d-4])cuboid(x,y,4,4,82,'#b3a17d');
for(let level=0;level<4;level++){const z=8+level*23;const p=polygon([[r.x,r.y,z],[r.x+r.w,r.y,z],[r.x+r.w,r.y+r.d,z],[r.x,r.y+r.d,z]],color);if(level===3)hits.push({i,p});}
}text('Bloco '+(i+1),r.x+r.w/2,r.y+r.d/2,top?3:100,i===selected?'#fff1d5':'#f4d8ac');}
}
function select(i){selected=i;document.querySelectorAll('#racks button').forEach((b,index)=>b.setAttribute('aria-pressed',String(index===i)));document.getElementById('selection').textContent='Bloco '+(i+1)+' — prévia';document.getElementById('description').textContent='Quatro níveis de altura. Numeração das faces e quantidade de módulos ainda não definidas. Ocupação e capacidade não vinculadas ao estoque.';draw()}
racks.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.textContent='Bloco '+(i+1);b.setAttribute('aria-pressed','false');b.onclick=()=>select(i);document.getElementById('racks').append(b)});
canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*1000/rect.width,y=(event.clientY-rect.top)*850/rect.height;for(const hit of [...hits].reverse()){let inside=false;const p=hit.p;for(let a=0,b=p.length-1;a<p.length;b=a++){if(((p[a][1]>y)!==(p[b][1]>y))&&(x<(p[b][0]-p[a][0])*(y-p[a][1])/(p[b][1]-p[a][1])+p[a][0]))inside=!inside}if(inside){select(hit.i);break}}});
angle.oninput=draw;zoom.oninput=draw;document.getElementById('view').onclick=()=>{top=!top;document.getElementById('view').textContent=top?'Ver em 3D':'Ver de cima';draw()};document.getElementById('reset').onclick=()=>{angle.value='-20';zoom.value='100';top=false;document.getElementById('view').textContent='Ver de cima';draw()};
function connection(){document.getElementById('connection').textContent=navigator.onLine?'Prévia ilustrativa · sem dados de estoque':'Offline · prévia salva neste aparelho'}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();draw();
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{document.getElementById('connection').textContent='Prévia aberta · não foi possível preparar o acesso offline'});
})();
