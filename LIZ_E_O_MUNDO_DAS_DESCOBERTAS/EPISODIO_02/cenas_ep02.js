/* ================== EPISÓDIO 2 — A FLORESTA DOS ANIMAIS: cenários e cenas ================== */
const {coelho,leao,macaco,girafa,elefante}=LIZ;
const WHO={LIZ:['Liz','#FF4FA0'],LUMI:['Lumi','#B667F2'],PIPO:['Pipo','#C9773A'],LEAO:['Leão','#E8933F'],MACACO:['Macaquinho','#8B5A3C'],ELEFANTE:['Elefante','#7F93B5'],ROBI:['Robi','#2D8CFF']};
const SC=Object.fromEntries(SCENES.map(s=>[s[0],[s[1],s[2]]]));
const ALBUM=[['coelho',LS.coelho[3]],['leao',LS.leao[4]],['macaco',LS.macaco[2]],['girafa',LS.girafa[1]],['elefante',LS.elefante[4]]];

/* ---------- cenário: a mata encantada ---------- */
function borboletinha(x,y,t,cor){const f=Math.abs(Math.sin(t*16));return `<g transform="translate(${r1(x)} ${r1(y)})"><ellipse cx="-7" cy="0" rx="${r1(8*(.3+.7*f))}" ry="7" fill="${cor}"/><ellipse cx="7" cy="0" rx="${r1(8*(.3+.7*f))}" ry="7" fill="${cor}"/><ellipse cx="0" cy="0" rx="2" ry="6" fill="#5a3a2a"/></g>`;}
function cogumelo(x,y,s){return `<g transform="translate(${r1(x)} ${y}) scale(${s})"><rect x="-9" y="-34" width="18" height="34" rx="7" fill="#FFF3E0"/><path d="M-30 -30 Q 0 -66 30 -30 Z" fill="#F0453C"/><circle cx="-12" cy="-40" r="5" fill="#fff"/><circle cx="8" cy="-46" r="4" fill="#fff"/><circle cx="18" cy="-36" r="3" fill="#fff"/></g>`;}
function arbusto(x,y,s,c='#4FB54A'){return `<g transform="translate(${r1(x)} ${y}) scale(${s})"><circle cx="-40" cy="-30" r="40" fill="${c}"/><circle cx="20" cy="-44" r="52" fill="${c}"/><circle cx="70" cy="-26" r="36" fill="${c}"/><circle cx="0" cy="-60" r="26" fill="#6FD167" opacity=".7"/></g>`;}
function troncoGigante(x,larg,cor='#8A552B'){return `<g transform="translate(${x} 0)"><path d="M${-larg/2} 960 Q ${-larg/2+20} 500 ${-larg/2+30} -200 L ${larg/2-30} -200 Q ${larg/2-20} 500 ${larg/2} 960 Q ${larg/2+60} 990 ${larg/2+90} 1000 L ${-larg/2-90} 1000 Q ${-larg/2-60} 990 ${-larg/2} 960 Z" fill="${cor}"/><path d="M${-larg/4} 900 Q ${-larg/4+10} 500 ${-larg/5} 0 M${larg/5} 920 Q ${larg/5-12} 400 ${larg/4} -100" stroke="#6D3F1D" stroke-width="10" fill="none" opacity=".6"/></g>`;}
function mata(t,o={}){
  const sol=o.sol||0;
  let s=`<linearGradient id="mceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFEFFF"/><stop offset=".55" stop-color="#E4FAE0"/><stop offset="1" stop-color="#F6FFF0"/></linearGradient><rect x="-700" y="-700" width="3320" height="2200" fill="url(#mceu)"/>`;
  if(sol>0)s+=`<linearGradient id="pds" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A6B"/><stop offset=".5" stop-color="#FFC27A"/><stop offset="1" stop-color="#FFE3B0"/></linearGradient><rect x="-700" y="-700" width="3320" height="2200" fill="url(#pds)" opacity="${r1(sol*.9)}"/><circle cx="960" cy="560" r="${r1(110+sol*20)}" fill="#FFE08A" opacity="${r1(sol*.9)}" filter="url(#brilhoForte)"/>`;
  const R=rng(21);
  /* troncos ao fundo */
  for(let i=0;i<9;i++){const x=-200+i*280+R()*80,w=40+R()*40;s+=`<rect x="${r1(x)}" y="-300" width="${r1(w)}" height="1200" fill="${sol>0?'#C9A98E':'#A9D3A8'}" opacity=".55"/>`;}
  s+=arbusto(100,860,1.6,'#9FD99A')+arbusto(700,850,1.4,'#9FD99A')+arbusto(1400,860,1.7,'#9FD99A')+arbusto(1900,850,1.5,'#9FD99A');
  /* raios de sol */
  for(let i=0;i<5;i++){const x=200+i*380,op=.13+.05*Math.sin(t*1.2+i);s+=`<path d="M${x} -300 L ${x+120} -300 L ${x+420} 1000 L ${x+180} 1000 Z" fill="${sol>0?'#FFD7A0':'#FFF8D0'}" opacity="${r1(op)}"/>`;}
  /* chão */
  s+=`<path d="M-700 820 Q 300 760 900 800 Q 1500 840 2620 790 L 2620 1500 L -700 1500 Z" fill="#94D874"/><path d="M-700 905 Q 500 870 1100 900 Q 1700 930 2620 895 L 2620 1500 L -700 1500 Z" fill="#7FCB62"/>`;
  if(o.lago){s+=`<ellipse cx="1480" cy="910" rx="340" ry="84" fill="#2E8CF0"/><ellipse cx="1480" cy="896" rx="310" ry="64" fill="#4FB2FF"/>`;for(let i=0;i<3;i++){const p=((t*.45+i/3)%1);s+=`<ellipse cx="1480" cy="900" rx="${r1(60+p*230)}" ry="${r1(14+p*50)}" fill="none" stroke="#C8E8FF" stroke-width="4" opacity="${r1(.7*(1-p))}"/>`;}
    [1180,1210,1770,1800].forEach(x=>{s+=`<path d="M${x} 910 q -6 -50 4 -90" stroke="#3E9C42" stroke-width="6" fill="none"/><ellipse cx="${x+4}" cy="820" rx="6" ry="16" fill="#8A5A2E"/>`;});}
  /* árvores gigantes nas laterais */
  if(!o.semLaterais){s+=troncoGigante(-80,300)+troncoGigante(2020,320);}
  if(o.arvoreAlta){s+=troncoGigante(1660,150,'#9A6234');[[1660,180,150],[1540,240,110],[1780,250,110],[1640,90,100],[1720,140,90]].forEach(([x,y,r])=>{s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#4FB54A"/>`;});[[1590,280],[1700,300],[1560,200],[1760,210]].forEach(([x,y])=>{s+=`<ellipse cx="${x}" cy="${y}" rx="20" ry="11" fill="#6FD167" transform="rotate(30 ${x} ${y})"/>`;});}
  if(o.galho){s+=`<path d="M2100 330 Q 1600 300 900 360" stroke="#7B4A24" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M1300 330 q 30 -40 80 -50 M1600 320 q 20 -40 60 -60 M1050 350 q 10 -30 40 -50" stroke="#7B4A24" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    [[950,330],[1080,300],[1250,310],[1420,290],[1560,300],[1700,290],[1850,300]].forEach(([x,y],i)=>{s+=`<circle cx="${x}" cy="${y-20}" r="${30+i%3*8}" fill="${i%2?'#4FB54A':'#5CC25A'}"/>`;});
    if(!o.semBananas)s+=`<g transform="translate(1262 362)">${[0,1,2].map(i=>`<path transform="rotate(${-20+i*20})" d="M0 0 Q 8 34 30 40 Q 14 44 -2 34 Q -10 18 -6 0 Z" fill="#FFD84A" stroke="#D9A21E" stroke-width="2"/>`).join('')}</g>`;
    s+=`<g transform="translate(1250 965)"><rect x="-70" y="-70" width="140" height="70" rx="30" fill="#9A6234"/><ellipse cx="-70" cy="-35" rx="14" ry="35" fill="#C68B52"/><ellipse cx="-70" cy="-35" rx="7" ry="22" fill="#A9733F"/></g>`;}
  /* copa das árvores (topo) */
  if(!o.semCopa){for(let i=0;i<14;i++){const x=-500+i*230,y=-60+(i%3)*40;s+=`<circle cx="${x}" cy="${y}" r="${150+(i%2)*40}" fill="${i%2?'#3E9F45':'#4FB54A'}"/>`;}}
  /* chão com flores, cogumelos e tufos */
  for(let i=0;i<30;i++){const x=R()*2700-400,y=910+R()*180;s+=flor(x,y,.6+R()*.5,['#FF6FB5','#B667F2','#FFFFFF','#FFB13B','#FF5A5A'][i%5],t);}
  for(let i=0;i<5;i++)s+=cogumelo(-200+i*560+R()*100,940+R()*60,.9+R()*.4);
  for(let i=0;i<20;i++){const x=R()*2700-400,y=930+R()*160;s+=`<path d="M${r1(x)} ${r1(y)} l 6 -22 l 4 18 l 6 -26 l 4 28" stroke="#5DB34E" stroke-width="4" fill="none" stroke-linecap="round"/>`;}
  /* borboletinhas */
  for(let i=0;i<4;i++){const x=300+i*450+Math.sin(t*.7+i*2)*120,y=420+Math.cos(t*.9+i)*80+i*40;s+=borboletinha(x,y,t+i,['#FF9ED8','#FFD84A','#9FE6FF','#C9A2FF'][i]);}
  return s;}

/* ---------- utilidades de cena ---------- */
function folhas(t,t0){const p=prog(t,t0-.5,t0+.5);if(p<=0||p>=1)return '';const R=rng(31);let s='';
  for(let i=0;i<26;i++){const y=R()*1200-60,d=R()*.5,x=lerp(2400,-500,clamp((p-d*.4)/(1-d*.4)))+R()*300,sc=2.2+R()*2.2,rot=R()*360+p*200,c=['#3E9F45','#4FB54A','#5CC25A','#6FD167','#2F8A3A'][i%5];
    s+=`<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${r1(sc)})"><path d="M0 0 C 30 -46 96 -46 120 0 C 96 46 30 46 0 0 Z" fill="${c}"/><path d="M4 0 L 112 0" stroke="#2F7A35" stroke-width="3"/></g>`;}
  return s;}
function coracoes(t,t0,x,y,n=5){const p=prog(t,t0,t0+2.4);if(p<=0||p>=1)return '';let s='';for(let i=0;i<n;i++){const q=clamp(p*1.3-i*.06);const xx=x+Math.sin(q*6+i)*30+(i-n/2)*18,yy=y-q*220;s+=`<path transform="translate(${r1(xx)} ${r1(yy)}) scale(${r1(.8+.4*(i%2))})" d="M0 8 C -14 -4 -12 -16 0 -10 C 12 -16 14 -4 0 8 Z" fill="#FF5A8F" opacity="${r1(1-q)}"/>`;}return s;}
function aguaJato(x,y,t,t0,t1,dir=-1){if(t<t0||t>t1+1.4)return '';let s='';for(let i=0;i<34;i++){const born=t0+i*((t1-t0)/34);const age=t-born;if(age<0||age>1.4)continue;const vx=dir*(90+(i%5)*40),vy=-520-(i%4)*60;const px=x+vx*age,py=y+vy*age+540*age*age;s+=`<circle cx="${r1(px)}" cy="${r1(py)}" r="${6+(i%3)*2}" fill="#7CCBFF" opacity="${r1(.9*(1-age/1.4))}"/>`;}return s;}
function anelDestaque(x,y,t,t0,t1,cor='#FFD23F'){if(t<t0||t>t1)return '';const p=fade(t,t0,t0+.3,t1-.3,t1);return `<ellipse cx="${x}" cy="${y}" rx="${r1(90+10*Math.sin(t*6))}" ry="22" fill="none" stroke="${cor}" stroke-width="8" opacity="${r1(p)}" filter="url(#brilho)"/>`;}
function fade(t,a,b,c,d){return Math.min(prog(t,a,b),1-prog(t,c,d));}
const pulinho=(t,vel=1.6,alt=50)=>Math.abs(Math.sin(t*Math.PI*vel))*alt;
const fala=(w,t)=>boca(w,t);
/* álbum dos animais (HUD) */
function hudAlbum(t){const t0=SC.coelho[0]+.6,t1=SC.descoberta[1]-.3;if(t<t0-.5||t>t1)return '';const ap=E.back(prog(t,t0,t0+.6))*(1-prog(t,t1-.4,t1));
  let s=`<g transform="translate(960 86) scale(${r1(ap)})"><rect x="-330" y="-56" width="660" height="112" rx="56" fill="#fff" opacity=".93" filter="url(#sombraSuave)"/>`;
  const mini={coelho:o=>coelho(o),leao:o=>leao(o),macaco:o=>macaco(o),girafa:o=>girafa(o),elefante:o=>elefante(o)};
  const enq={coelho:[0,-130,.42],leao:[0,-165,.36],macaco:[0,-145,.5],girafa:[112,-812,.4],elefante:[0,-210,.33]};
  ALBUM.forEach(([k,ta],i)=>{const x=-240+i*120;const f=E.back(prog(t,ta,ta+.5));const [ox,oy,sc]=enq[k];
    s+=`<clipPath id="alb${i}"><circle cx="${x}" cy="0" r="40"/></clipPath><circle cx="${x}" cy="0" r="42" fill="${f>0?'#FFF4D6':'#EEE8F4'}" stroke="${f>0?'#FFD23F':'#CDBFE0'}" stroke-width="4"/>`;
    s+=`<g clip-path="url(#alb${i})"><g transform="translate(${x} 0) scale(${r1(f>0?lerp(.6,1,f):1)})" ${f>0?'':'filter="url(#cinzaAlbum)" opacity=".45"'}><g transform="scale(${sc}) translate(${-ox} ${-oy})">${mini[k]({sombra:false})}</g></g></g>`;
    if(f<=0)s+=`<text x="${x}" y="14" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#9C8BB5">?</text>`;});
  return s+`</g>`;}

/* ---------- cenas ---------- */
const S={};
S.abertura=(t)=>{
  let s=`<linearGradient id="abg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CCBFF"/><stop offset=".6" stop-color="#FFC6E6"/><stop offset="1" stop-color="#FFE9B8"/></linearGradient><rect width="1920" height="1080" fill="url(#abg)"/>`;
  for(let i=0;i<12;i++){const a=i*30+t*12;s+=`<path d="M960 560 L ${r1(960+Math.cos(a*Math.PI/180)*1600)} ${r1(560+Math.sin(a*Math.PI/180)*1600)} L ${r1(960+Math.cos((a+12)*Math.PI/180)*1600)} ${r1(560+Math.sin((a+12)*Math.PI/180)*1600)} Z" fill="#fff" opacity=".12"/>`;}
  s+=nuvem(220,880,1.6)+nuvem(1700,900,1.8)+nuvem(960,990,2.2)+nuvem(500,170,.9,.9)+nuvem(1500,140,1,.9)+brilhos(960,520,t,26,700,undefined,3);
  const pop=t0=>E.back(prog(t,t0,t0+.6));const lg=E.elastic(prog(t,8.5,10.5));
  s+=at(960,lerp(-300,330,lg),lg>0?.78:0,logoSVG());
  s+=at(330,985,1.0*pop(1.0),liz({expr:t>13?'rindo':'feliz',bracoD:t<6?150+Math.sin(t*10)*20:14,piscar:piscar(t),pulo:t>13?Math.abs(Math.sin(t*5))*30:0}));
  s+=at(590,990,1.05*pop(3.0),pipo({rabo:Math.sin(t*14)*24,latir:t>3.2&&t<3.7,piscar:piscar(t,1)}));
  s+=at(1600,990,1.0*pop(5.0),robi({expr:'feliz',bracoD:t>5.5&&t<8?150+Math.sin(t*9)*18:20,flutuar:Math.sin(t*3)*6+6}));
  const lp=prog(t,6.5,8.2);s+=voandoLumi(t,lerp(2100,1360,E.out(lp)),lerp(200,560,E.out(lp)),false);
  const tg=E.back(prog(t,11.6,12.2));
  s+=`<g transform="translate(960 708) scale(${r1(tg)})"><rect x="-470" y="-58" width="940" height="116" rx="58" fill="#3F9A3F" stroke="#fff" stroke-width="6"/><text y="-8" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#E6FFD9">EPISÓDIO 2</text><text y="38" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="50" fill="#fff">A Floresta dos Animais</text></g>`;
  for(let i=0;i<4;i++){const p=prog(t,12+i*.12,13+i*.12);if(p>0)s+=`<g transform="translate(${[520,1400,600,1330][i]} ${[640,630,770,780][i]}) rotate(${i*40+t*30}) scale(${r1(E.back(p)*1.1)})"><path d="M0 0 C 20 -30 64 -30 80 0 C 64 30 20 30 0 0 Z" fill="${['#4FB54A','#5CC25A','#3E9F45','#6FD167'][i]}"/></g>`;}
  const ep=prog(t,14.2,14.6)*(1-prog(t,15.6,16));s+=`<rect width="1920" height="1080" fill="#fff" opacity="${r1(ep*.9)}"/>`;
  return s;};
S.entrada=(t)=>{
  const [a,b]=SC.entrada,L=LS.entrada;
  const [cx,cy,z]=camK(t,[[a,860,600,1.0],[b-2.4,1000,610,1.06],[b,1240,610,1.06]]);
  let w=mata(t,{});
  const sai=t>=b-2.0;
  /* Pipo chega logo atrás */
  const pp=E.out(prog(t,a+.2,a+1.8));
  let px=lerp(160,980,pp),pl=t<a+1.8?Math.abs(Math.sin(t*14))*14:(fala('PIPO',t)?pulinho(t,3,26):0);
  if(sai)px=lerp(980,1560,prog(t,b-2.0,b));
  w+=at(px,968,.95,pipo({rabo:Math.sin(t*14)*24,latir:fala('PIPO',t),pulo:pl+(sai?Math.abs(Math.sin(t*14))*14:0),olharX:t>A.entrada.lumi?1:.4,piscar:piscar(t,.7)}));
  /* Liz caminha, olha em volta e depois segue a Lumi */
  if(t<a+1.4)w+=at(lerp(300,760,E.out(prog(t,a,a+1.4))),965,1.08,lizLado({expr:'sorriso',passo:t*12,pulo:Math.abs(Math.sin(t*12))*8}));
  else if(sai)w+=at(lerp(760,1360,prog(t,b-2.0,b)),965,1.08,lizLado({expr:'feliz',passo:t*12,pulo:Math.abs(Math.sin(t*12))*8}));
  else{let lo=lizPose(t,{});
    if(t<L[1])Object.assign(lo,{expr:'surpresa',olharX:Math.sin(t*1.8),olharY:-.6,bracoE:60,bracoD:60});
    else if(t<L[1]+2.7)Object.assign(lo,{expr:'pensativa',bracoD:160,olharX:-.6,olharY:-.9});
    if(t>=L[3]&&t<L[4])Object.assign(lo,{expr:'animada',bracoD:150,pulo:pulinho(t,2,22)});
    if(t>=L[4])Object.assign(lo,{expr:'feliz',olharX:.8,olharY:-.7});
    w+=at(760,965,1.08,liz(lo));}
  /* Lumi aparece */
  if(t>=A.entrada.lumi){const lp=E.inOut(prog(t,A.entrada.lumi,A.entrada.lumi+1.4));let x=lerp(2200,1260,lp),y=lerp(200,430,lp)-Math.sin(lp*Math.PI)*100;
    if(t>b-2.4){const q=E.inOut(prog(t,b-2.4,b));x=lerp(1260,2300,q);y=430-Math.sin(q*Math.PI)*120;}
    else x+=Math.sin(t*1.5)*60;
    const tr=[];for(let i=1;i<12;i++)tr.push([x+i*22,y+20+Math.sin(t*4+i)*10]);
    w+=rastro(t,tr)+voandoLumi(t,x,y,fala('LUMI',t));}
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.coelho=(t)=>{
  const [a,b]=SC.coelho,L=LS.coelho;
  const [cx,cy,z]=camK(t,[[a,960,600,1.05],[a+1.4,1010,620,1.12],[b,1010,630,1.16]]);
  let w=mata(t,{});
  w+=arbusto(1520,950,1.1)+[1180,1240,1380,1440].map((x,i)=>flor(x,960,1.1,['#FF6FB5','#FFD84A','#B667F2','#FFFFFF'][i],t)).join('');
  const juntos=t>=L[5]-.1&&t<L[5]+5.3;
  /* coelhinho */
  let cxb=1310,cpl=0;
  if(t<a+1.3){const q=prog(t,a,a+1.3);cxb=lerp(1760,1310,q);cpl=Math.abs(Math.sin(q*Math.PI*3))*70;}
  if(t>=A.coelho.pula&&t<A.coelho.pula+2.2)cpl=pulinho(t-A.coelho.pula,1.8,80);
  if(juntos)cpl=pulinho(t,1.6,70);
  const orl=(t>=L[1]&&t<L[2])?Math.sin(t*10)*16:Math.sin(t*2)*4;
  if(t>=L[1]&&t<L[2]+.2)w+=`<ellipse cx="${cxb-10}" cy="${r1(965-cpl-260)}" rx="80" ry="90" fill="#FFF6C8" opacity="${r1(.35+.2*Math.sin(t*6))}" filter="url(#brilhoForte)"/>`+brilhos(cxb,965-cpl-270,t,8,90,undefined,7);
  w+=at(cxb,965,1.15,coelho({pulo:cpl,orelha:orl,nariz:Math.abs(Math.sin(t*9)),piscar:piscar(t,.4),olharX:-.6}));
  /* Pipo e Liz */
  w+=at(620,968,.92,pipo({rabo:Math.sin(t*14)*24,olharX:1,pulo:juntos?pulinho(t+.15,1.6,50):0,inclinar:t<L[1]?12:0,piscar:piscar(t,1)}));
  let lo=lizPose(t,{olharX:.6});
  if(t>=L[0]&&t<L[1])Object.assign(lo,{expr:'animada',bracoD:100,apontarD:true});
  if(t>=L[1]&&t<L[2])Object.assign(lo,{expr:'feliz',bracoE:155,bracoD:155});
  if(t>=L[2]&&t<L[2]+1.8)Object.assign(lo,{expr:'pensativa',bracoD:160,olharX:.6,olharY:-.6});
  const c=comemora(t,L[3],1.5);if(c)Object.assign(lo,c);
  if(t>=L[4]&&t<L[5])Object.assign(lo,{expr:'animada',bracoE:70,bracoD:70});
  if(juntos)Object.assign(lo,{expr:'rindo',bracoE:150,bracoD:150,pulo:pulinho(t,1.6,60),inclinar:0,falar:fala('LIZ',t)});
  w+=at(840,965,1.05,liz(lo));
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.leao=(t)=>{
  const [a,b]=SC.leao,L=LS.leao;
  const [cx,cy,z]=camK(t,[[a,960,600,1.0],[a+2.2,1000,610,1.08],[L[3]-.2,1060,600,1.12],[b,1040,610,1.1]]);
  let w=mata(t,{});
  /* leão chega andando e senta */
  const lp=prog(t,a+.7,a+2.4);const lx=lerp(2150,1340,E.out(lp));const anda=lp>0&&lp<1;
  const rug=fala('LEAO',t)?.75+.25*Math.sin(t*30):0;
  w+=at(lx,968,1.08,leao({rugir:rug,juba:rug?Math.sin(t*40):Math.sin(t*2)*.3,rabo:Math.sin(t*3)*14,piscar:piscar(t,.3),olharX:-.7}));
  if(anda)w+=`<g opacity=".5">${[0,1,2].map(i=>`<ellipse cx="${r1(lx+70+i*30)}" cy="958" rx="${14+i*6}" ry="6" fill="#C9B08A"/>`).join('')}</g>`;
  /* Pipo se esconde atrás da Liz, depois espia e late */
  const esc=prog(t,a+.4,a+1.2);const espia=t>=L[5]-.4;
  let pxx=lerp(1020,700,E.out(esc));if(espia)pxx=lerp(700,560,E.out(prog(t,L[5]-.4,L[5]+.1)));
  const treme=(!espia&&esc>0)?Math.sin(t*60)*3:0;
  w+=at(pxx+treme,968,.92,pipo({rabo:espia?Math.sin(t*16)*24:-10,orelha:espia?0:24,latir:fala('PIPO',t),inclinar:espia?14:-6,pulo:fala('PIPO',t)?pulinho(t,3,24):0,olharX:1,lingua:espia}));
  let lo=lizPose(t,{olharX:.7});
  if(t<L[0]+1.6)Object.assign(lo,{expr:'surpresa',bracoE:50,bracoD:50});
  if(t>=L[1]&&t<L[2])Object.assign(lo,{expr:'feliz',bracoD:155});
  if(t>=L[2]&&t<L[2]+2.1)Object.assign(lo,{expr:'animada',bracoE:70,bracoD:70});
  if(fala('LEAO',t))Object.assign(lo,{expr:'rindo',bracoE:30,bracoD:30,olharX:.8});
  const c=comemora(t,L[4],1.6);if(c)Object.assign(lo,c);
  w+=at(800,965,1.05,liz(lo));
  if(fala('LEAO',t))w+=`<g opacity="${r1(.6)}">${[0,1,2].map(i=>{const p=((t*1.5+i/3)%1);return `<path d="M${r1(lx-120-p*160)} ${r1(780-i*20)} q -20 -${r1(20+p*30)} 0 -${r1(40+p*60)}" stroke="#E8933F" stroke-width="8" fill="none" stroke-linecap="round" opacity="${r1(1-p)}"/>`;}).join('')}</g>`;
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.macaco=(t)=>{
  const [a,b]=SC.macaco,L=LS.macaco,sobe=A.macaco.sobe;
  const [cx,cy,z]=camK(t,[[a,1200,560,1.0],[a+2.4,1080,600,1.05],[sobe,1080,600,1.05],[sobe+1.4,1120,520,1.0],[L[3]-.6,1000,610,1.1],[b,980,610,1.12]]);
  const pegou=t>=sobe+1.6;
  let w=mata(t,{galho:true,semBananas:pegou});
  /* macaquinho: balança, cai no tronco, fala, sobe, pega banana, desce e oferece */
  let mx,my,m={bracoE:30,bracoD:30,piscar:piscar(t,.8),rabo:Math.sin(t*4)*10};
  const GY=345,LOGY=895;
  if(t<a+2.4){const q=prog(t,a,a+2.4);const gx=lerp(1950,1260,q);const sw=Math.sin(q*Math.PI*3)*32;
    w+=`<g transform="translate(${r1(gx)} ${GY}) rotate(${r1(sw)})"><g transform="translate(0 205)">${macaco({bracoE:165,bracoD:165,sombra:false,rabo:sw})}</g></g>`;}
  else if(t<a+2.8){const q=E.out(prog(t,a+2.4,a+2.8));mx=1260;my=lerp(GY+205,LOGY,q);}
  else if(t<sobe){mx=1260;my=LOGY;if(fala('MACACO',t)){const u=Math.floor(t*5)%2;m.falar=u?'a':'u';m.bracoE=u?150:60;m.bracoD=u?150:60;my-=u?16:0;}}
  else if(t<sobe+1.6){const q=prog(t,sobe,sobe+1.6);mx=1262;my=q<.5?lerp(LOGY,GY+170,E.inOut(q*2)):lerp(GY+170,LOGY,E.inOut((q-.5)*2));m.bracoE=150+Math.sin(t*14)*20;m.bracoD=150-Math.sin(t*14)*20;m.banana=q>.5;m.sombra=false;}
  else if(t<L[3]+.2){const q=E.inOut(prog(t,sobe+1.6,sobe+2.6));mx=lerp(1262,1060,q);my=lerp(LOGY,965,q);m.banana=true;m.bracoD=q>=1?95:40;}
  else{mx=1060;my=965;m.bracoD=40;}
  if(mx!==undefined){if(t>=sobe&&t<sobe+1.6)w+=`<rect x="${mx-10}" y="${GY}" width="20" height="${LOGY-GY}" fill="#7B4A24" opacity=".0"/>`;w+=at(mx,my,1.0,macaco(m));}
  /* Pipo */
  w+=at(560,968,.9,pipo({rabo:Math.sin(t*14)*24,olharX:1,pulo:fala('MACACO',t)?pulinho(t,2.4,30):0,piscar:piscar(t,.2)}));
  /* Liz */
  let lo=lizPose(t,{olharX:.7,olharY:-.4});
  if(t>=L[0]&&t<L[0]+2.3)Object.assign(lo,{expr:'animada',bracoD:110,apontarD:true,olharY:-.5});
  if(fala('MACACO',t))Object.assign(lo,{expr:'rindo'});
  if(t>=L[2]&&t<sobe+1.6)Object.assign(lo,{expr:'feliz',olharX:.8,olharY:-1});
  const temBanana=t>=L[3]+.2;
  if(t>=L[3]-.4)Object.assign(lo,{expr:'feliz',bracoD:80,olharX:.8});
  w+=at(800,965,1.05,liz(lo));
  if(temBanana)w+=`<g transform="translate(${r1(800+136*1.05)} ${r1(965-212*1.05)}) rotate(-20)"><path d="M-6 -4 Q 6 30 34 30 Q 18 36 0 26 Q -10 14 -10 -2 Z" fill="#FFD84A" stroke="#D9A21E" stroke-width="2.5"/></g>`+coracoes(t,L[3]+.2,1000,620,4);
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.girafa=(t)=>{
  const [a,b]=SC.girafa,L=LS.girafa;
  const [cx,cy,z]=camK(t,[[a,1300,800,1.9],[a+3.0,1360,190,1.55],[L[0]+1.2,1360,190,1.55],[L[1]+.6,1000,540,.9],[b,990,540,.93]]);
  let w=mata(t,{arvoreAlta:true,semCopa:true,semLaterais:true});
  const come=t>=L[2]-.2;
  const inc=come?E.inOut(prog(t,L[2]-.2,L[2]+1))*16:0;
  w+=at(1250,968,1.0,girafa({pescoco:inc+Math.sin(t*1.2)*2,cabeca:come?-12:Math.sin(t*1.5)*4,folha:come&&t>L[2]+1.1,mastigar:come&&t>L[2]+1.1?Math.abs(Math.sin(t*6)):0,piscar:piscar(t,.5),cauda:Math.sin(t*3)*14}));
  const estica=t>=L[3]-.2&&t<b-.4;
  w+=at(450,968,.85,pipo({rabo:Math.sin(t*14)*24,olharX:1,inclinar:-8,pulo:estica?pulinho(t,1.2,26):0}));
  let lo=lizPose(t,{olharX:.7,olharY:-1});
  if(t>=L[0]&&t<L[1]+1.4)Object.assign(lo,{expr:'surpresa',bracoE:60,bracoD:60,olharY:-1});
  if(t>=L[2]&&t<L[3])Object.assign(lo,{expr:'feliz',bracoD:165,apontarD:true,olharY:-1});
  if(estica)Object.assign(lo,{expr:'animada',bracoE:172,bracoD:172,pulo:6+pulinho(t,1.2,18),inclinar:0,olharY:-1,falar:fala('LIZ',t)});
  w+=at(640,965,1.0,liz(lo));
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.elefante=(t)=>{
  const [a,b]=SC.elefante,L=LS.elefante,ag=A.elefante.agua;
  const [cx,cy,z]=camK(t,[[a,1020,600,1.0],[L[0],980,610,1.05],[b,980,610,1.08]]);
  let w=mata(t,{lago:true});
  const EX=1180,ES=.92;
  let tr=0;
  if(t<a+1.6)tr=t<a+.6?0:-0.0;
  if(t>=a+1.0&&t<a+1.8)tr=E.inOut(prog(t,a+1.0,a+1.8));
  if(t>=a+1.8&&t<L[0])tr=1-E.inOut(prog(t,a+2.8,L[0]));
  if(t>=L[3]-.3&&t<ag+1.4)tr=E.out(prog(t,L[3]-.3,L[3]+.2));
  if(t>=ag+1.4)tr=1-E.inOut(prog(t,ag+1.4,ag+2.2));
  const tipx=EX+ES*(12+(120-12)*tr),tipy=968+ES*(-96+(-330+96)*tr);
  w+=at(EX,968,ES,elefante({tromba:tr,orelha:Math.sin(t*3),falar:fala('ELEFANTE',t),piscar:piscar(t,.9),olharX:-.5}));
  w+=aguaJato(tipx,tipy,t,a+1.6,a+2.6,-1)+aguaJato(tipx,tipy,t,L[3],ag+.6,-1.4);
  /* Pipo: assustado com a água, depois brinca */
  const ass=t>=ag&&t<ag+.9,brinca=t>=ag+.9;
  w+=at(lerp(880,820,prog(t,ag,ag+.4)),968,.9,pipo({rabo:brinca?Math.sin(t*18)*28:(ass?-14:Math.sin(t*10)*16),orelha:ass?-22:0,latir:ass||(brinca&&Math.floor(t*2.5)%3===0),pulo:ass?60*Math.sin(prog(t,ag,ag+.9)*Math.PI):(brinca?pulinho(t,2.2,46):0),olharX:-.6,piscar:ass?0:piscar(t,.3)}));
  let lo=lizPose(t,{olharX:.7});
  if(t>=L[0]&&t<L[1])Object.assign(lo,{expr:'animada',bracoD:100,apontarD:true});
  if(t>=L[1]&&t<L[2])Object.assign(lo,{expr:'feliz',bracoD:150});
  if(t>=L[3]-.2&&t<L[4])Object.assign(lo,{expr:'rindo',bracoE:40,bracoD:40});
  const c=comemora(t,L[4],1.7);if(c)Object.assign(lo,c);
  w+=at(600,965,1.0,liz(lo));
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.descoberta=(t)=>{
  const [a,b]=SC.descoberta,L=LS.descoberta;
  const [cx,cy,z]=camK(t,[[a,960,560,1.0],[b,960,570,1.03]]);
  let w=mata(t,{semLaterais:true});
  const pos={girafa:[300,.6],leao:[610,.72],coelho:[1300,.9],macaco:[1490,.88],elefante:[1740,.66]};
  const ent={girafa:a+.3,leao:a+.7,coelho:a+1.1,macaco:a+1.5,elefante:a+1.9};
  const dest=(i)=>L[1+i];const ativo=(i)=>t>=dest(i)&&t<dest(i)+1.25;
  const amor=t>=L[6];
  const pops=Object.keys(pos);
  pops.forEach(k=>{const p=E.back(prog(t,ent[k],ent[k]+.6));if(p<=0)return;const [x,s]=pos[k];const i={coelho:0,leao:1,macaco:2,girafa:3,elefante:4}[k];const on=ativo(i);
    const sc=s*p;let g='';
    if(k==='coelho')g=coelho({pulo:on?pulinho(t,2,60):(amor?pulinho(t+.2,1.2,20):0),orelha:Math.sin(t*3)*6,nariz:Math.abs(Math.sin(t*9)),piscar:piscar(t,.1)});
    if(k==='leao')g=leao({rugir:on?.7+.3*Math.sin(t*30):0,juba:on?Math.sin(t*40):0,rabo:Math.sin(t*3)*14,piscar:piscar(t,.6)});
    if(k==='macaco')g=macaco({bracoE:on?150+Math.sin(t*14)*20:(amor?140:30),bracoD:on?150-Math.sin(t*14)*20:(amor?140:30),falar:on?(Math.floor(t*5)%2?'a':'u'):false,piscar:piscar(t,.9)});
    if(k==='girafa')g=girafa({pescoco:on?Math.sin(t*5)*8:Math.sin(t*1.2)*3,cabeca:on?-10:0,piscar:piscar(t,.4)});
    if(k==='elefante')g=elefante({tromba:on?1:(amor?.5+.3*Math.sin(t*2):0),falar:on,orelha:Math.sin(t*3),piscar:piscar(t,1.1)});
    w+=anelDestaque(x,968,t,dest(i),dest(i)+1.25);
    w+=at(x,968,sc,g);
    if(t>=ent[k]&&t<ent[k]+.8)w+=brilhos(x,800,t,10,120*(1-prog(t,ent[k],ent[k]+.8))+20,undefined,i+3);
    if(amor)w+=coracoes(t,L[6]+i*.25,x,968-[150,260,200,620,250][i]*s*1.3,4);});
  /* Lumi reúne a turma */
  const lq=prog(t,a,a+2.4);w+=voandoLumi(t,lerp(200,1700,lq)+(lq>=1?Math.sin(t*1.2)*400-700:0),300+Math.sin(t*2)*40,false);
  if(lq<1){const tr=[];for(let i=1;i<14;i++)tr.push([lerp(200,1700,Math.max(0,lq-i*.02)),310+Math.sin(t*2-i*.2)*40]);w+=rastro(t,tr);}
  /* Pipo e Liz */
  w+=at(1120,968,.82,pipo({rabo:Math.sin(t*16)*26,latir:fala('PIPO',t),pulo:fala('PIPO',t)?pulinho(t,3,30):(amor?pulinho(t,1.2,14):0),olharX:-.4,piscar:piscar(t,.5)}));
  let lo=lizPose(t,{});
  if(t>=L[0]&&t<L[1])Object.assign(lo,{expr:'animada',bracoE:150,bracoD:150});
  const alvo=[[0,1300],[1,610],[2,1490],[3,300],[4,1740]];
  alvo.forEach(([i,x])=>{if(t>=dest(i)&&t<dest(i)+1.2){const esq=x<960;Object.assign(lo,{expr:'animada',bracoE:esq?100:14,bracoD:esq?14:100,apontarE:esq,apontarD:!esq,olharX:esq?-.8:.8});}});
  if(t>=L[6]&&t<L[8])Object.assign(lo,{expr:'feliz',bracoE:-24,bracoD:-24,olharX:0});
  w+=at(960,965,.95,liz(lo));
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.final=(t)=>{
  const [a,b]=SC.final,L=LS.final,tt=A.final.titulo;
  const [cx,cy,z]=camK(t,[[a,960,620,1.25],[tt-.4,960,620,1.25],[tt+2.6,960,520,.86],[b,960,520,.84]]);
  const sol=E.inOut(prog(t,a,a+3));
  let w=mata(t,{sol});
  /* amigos ao fundo acenando */
  w+=at(300,940,.45,girafa({pescoco:Math.sin(t*2)*6,piscar:piscar(t,.4)}))+at(1640,945,.42,elefante({tromba:.6+.3*Math.sin(t*3),orelha:Math.sin(t*3)}))+at(520,945,.5,leao({rabo:Math.sin(t*3)*14}))+at(1420,945,.5,macaco({bracoD:150+Math.sin(t*9)*20}))+at(1250,945,.55,coelho({pulo:pulinho(t,1.4,20)}));
  const abraco=t<L[0]+.3;
  let lo=lizPose(t,{});
  if(abraco)Object.assign(lo,{expr:'rindo',bracoE:-26,bracoD:-26,inclinar:4});
  if(t>=L[0]+.3&&t<L[1])Object.assign(lo,{expr:'feliz',bracoD:150+Math.sin(t*10)*22,olharX:-.6});
  if(t>=L[1])Object.assign(lo,{expr:'feliz',bracoD:150+Math.sin(t*10)*22});
  w+=at(900,968,1.0,liz(lo));
  if(abraco){const up=E.out(prog(t,a+.4,a+1.0));w+=at(lerp(1150,920,up),lerp(968,850,up),.75,pipo({rabo:Math.sin(t*16)*26,piscar:1,pulo:0}));}
  else{const dn=E.out(prog(t,L[0]+.3,L[0]+.8));w+=at(lerp(920,1100,dn),lerp(850,968,dn),.85,pipo({rabo:Math.sin(t*16)*26,latir:Math.floor(t*2)%4===0&&t>L[1],pulo:pulinho(t,1.5,16)*dn}));}
  if(abraco&&t>a+1)w+=coracoes(t,a+1,910,620,6);
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  /* título final */
  const ti=E.back(prog(t,tt+1.6,tt+2.4));
  if(ti>0){s+=`<rect width="1920" height="1080" fill="#3a1b4a" opacity="${r1(.35*prog(t,tt+1.4,tt+2.4))}"/>`;
    s+=at(960,330,.62*ti,logoSVG());
    s+=`<g transform="translate(960 650) scale(${r1(ti)})"><rect x="-470" y="-62" width="940" height="124" rx="62" fill="#3F9A3F" stroke="#fff" stroke-width="6"/><text y="-10" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#E6FFD9">EPISÓDIO 2</text><text y="40" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="#fff">A Floresta dos Animais</text></g>`;
    const nx=E.out(prog(t,tt+3.2,tt+3.8));s+=`<g transform="translate(960 790)" opacity="${r1(nx)}"><text text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#fff" stroke="#6A2C9E" stroke-width="8" paint-order="stroke">Próximo episódio: O Jardim dos Números 🌻</text></g>`;}
  const fo=prog(t,b-.9,b);s+=`<rect width="1920" height="1080" fill="#1b1030" opacity="${r1(fo)}"/>`;
  return s;};
