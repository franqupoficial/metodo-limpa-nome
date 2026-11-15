/* ================== EPISÓDIO 3 — O MISTÉRIO DAS FORMAS GEOMÉTRICAS ================== */
const {mae,pai,vovo}=LIZ;
const WHO={LIZ:['Liz','#FF4FA0'],MAE:['Mamãe Scarllet','#3FAE95'],PAI:['Papai Kennedy','#3D7BD9'],VOVO:['Vovó Rose','#9A6CC6'],TODOS:['Todos','#F2A93B'],PIPO:['Pipo','#C9773A']};
const SC=Object.fromEntries(SCENES.map(s=>[s[0],[s[1],s[2]]]));
/* cores oficiais das formas (iguais em toda a série) */
const FORMA={circulo:{cor:'#F0322F',esc:'#C21F1C',nome:'CÍRCULO'},quadrado:{cor:'#FFD21F',esc:'#E0A800',nome:'QUADRADO'},triangulo:{cor:'#2E8CF0',esc:'#1E6FD0',nome:'TRIÂNGULO'},retangulo:{cor:'#3FB950',esc:'#2C9440',nome:'RETÂNGULO'}};
function caminhoForma(tipo,s){ /* geometria correta, centrada em (0,0) */
  if(tipo==='circulo')return {d:`M ${-s/2} 0 A ${s/2} ${s/2} 0 1 0 ${s/2} 0 A ${s/2} ${s/2} 0 1 0 ${-s/2} 0 Z`,lados:[]};
  if(tipo==='quadrado'){const h=s/2;const P=[[-h,-h],[h,-h],[h,h],[-h,h]];return {d:`M${P.map(p=>p.join(' ')).join(' L')} Z`,lados:P.map((p,i)=>[p,P[(i+1)%4]])};}
  if(tipo==='triangulo'){const h=s*Math.sqrt(3)/2;const P=[[0,-h*2/3],[s/2,h/3],[-s/2,h/3]];return {d:`M${P.map(p=>p.map(r1).join(' ')).join(' L')} Z`,lados:P.map((p,i)=>[p,P[(i+1)%3]])};}
  const w=s*1.7/2,h=s*.95/2;const P=[[-w,-h],[w,-h],[w,h],[-w,h]];return {d:`M${P.map(p=>p.join(' ')).join(' L')} Z`,lados:P.map((p,i)=>[p,P[(i+1)%4]])};}
function forma(tipo,x,y,s,rot=0,o={}){const F=FORMA[tipo],c=caminhoForma(tipo,s);
  let g=`<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})"><path d="${c.d}" fill="${F.cor}" stroke="${F.esc}" stroke-width="${o.borda||Math.max(4,s*.05)}" stroke-linejoin="round" ${o.sombra!==false?'filter="url(#sombraSuave)"':''}/>`;
  if(tipo==='circulo')g+=`<circle cx="${r1(-s*.18)}" cy="${r1(-s*.18)}" r="${r1(s*.1)}" fill="#fff" opacity=".45"/><circle cx="${r1(s*.22)}" cy="${r1(s*.12)}" r="${r1(s*.05)}" fill="#fff" opacity=".35"/>`;
  else g+=`<path d="${c.d}" fill="none" stroke="#fff" stroke-width="${r1(s*.03)}" opacity=".35" transform="scale(.82)"/>`;
  if(o.rosto)g+=`<circle cx="${r1(-s*.12)}" cy="${r1(-s*.04)}" r="${r1(s*.045)}" fill="#2A1A14"/><circle cx="${r1(s*.12)}" cy="${r1(-s*.04)}" r="${r1(s*.045)}" fill="#2A1A14"/><path d="M${r1(-s*.1)} ${r1(s*.08)} Q 0 ${r1(s*.18)} ${r1(s*.1)} ${r1(s*.08)}" stroke="#2A1A14" stroke-width="${r1(s*.025)}" fill="none" stroke-linecap="round"/>`;
  return g+`</g>`;}
/* forma gigante girando + nome */
function formaGrande(tipo,x,y,s,t,t0,t1){const p=E.back(prog(t,t0,t0+.6)),out=E.in(prog(t,t1-.4,t1));if(p<=0||out>=1)return '';const sc=p*(1-out);
  const giro=tipo==='circulo'?(t-t0)*120:Math.sin((t-t0)*2.2)*14+(1-p)*-90;
  let g=`<g transform="translate(${x} ${y}) scale(${r1(sc)})"><circle r="${r1(s*.78)}" fill="#fff" opacity=".85" filter="url(#sombraSuave)"/>`;
  g+=forma(tipo,0,-s*.06,s,giro,{rosto:true});
  if(tipo==='circulo')for(let i=0;i<8;i++){const a=(t-t0)*2.1+i*Math.PI/4;g+=`<circle cx="${r1(Math.cos(a)*s*.66)}" cy="${r1(-s*.06+Math.sin(a)*s*.66)}" r="5" fill="${FORMA.circulo.cor}" opacity=".5"/>`;}
  const F=FORMA[tipo];g+=`<g transform="translate(0 ${r1(s*.7)})"><rect x="${-s*.62}" y="-34" width="${s*1.24}" height="68" rx="34" fill="${F.cor}" stroke="#fff" stroke-width="6"/><text y="15" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="44" fill="#fff" stroke="${F.esc}" stroke-width="3" paint-order="stroke">${F.nome}</text></g>`;
  return g+`</g>`;}
/* lados acendendo na contagem */
function contaLados(tipo,x,y,s,t,tempos,giro=0){const c=caminhoForma(tipo,s);let g=`<g transform="translate(${x} ${y-s*.06})">`;
  c.lados.forEach(([p1,p2],i)=>{const tc=tempos[i];if(tc===undefined||t<tc)return;const q=E.back(prog(t,tc,tc+.35));
    g+=`<line x1="${r1(p1[0])}" y1="${r1(p1[1])}" x2="${r1(p2[0])}" y2="${r1(p2[1])}" stroke="#fff" stroke-width="${r1(14*Math.min(q,1))}" stroke-linecap="round" filter="url(#brilho)"/>`;
    const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2,len=Math.hypot(mx,my)||1,nx=mx/len*58,ny=my/len*58;
    g+=`<g transform="translate(${r1(mx+nx)} ${r1(my+ny)}) scale(${r1(q)})"><circle r="30" fill="#FF4FA0" stroke="#fff" stroke-width="5"/><text y="13" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="36" fill="#fff">${i+1}</text></g>`;});
  return g+`</g>`;}
/* realce de um objeto da sala com o contorno da forma */
function realce(tipo,x,y,w,h,t,t0,t1,rotulo=true){if(t<t0||t>t1)return '';const p=E.out(prog(t,t0,t0+.6)),o=1-prog(t,t1-.35,t1);const F=FORMA[tipo];
  let d;if(tipo==='circulo')d=`M ${x-w/2} ${y} A ${w/2} ${h/2} 0 1 0 ${x+w/2} ${y} A ${w/2} ${h/2} 0 1 0 ${x-w/2} ${y}`;
  else if(tipo==='triangulo')d=`M${x} ${y-h/2} L ${x+w/2} ${y+h/2} L ${x-w/2} ${y+h/2} Z`;
  else d=`M${x-w/2} ${y-h/2} L ${x+w/2} ${y-h/2} L ${x+w/2} ${y+h/2} L ${x-w/2} ${y+h/2} Z`;
  let g=`<g opacity="${r1(o)}"><path d="${d}" fill="${F.cor}" opacity="${r1(.12+.08*Math.sin(t*6))}"/><path d="${d}" fill="none" stroke="${F.cor}" stroke-width="10" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${r1(100-100*p)}" filter="url(#brilho)"/>`;
  if(rotulo){const q=E.back(prog(t,t0+.3,t0+.7));g+=`<g transform="translate(${x} ${r1(y-h/2-44)}) scale(${r1(q)})"><rect x="-96" y="-26" width="192" height="52" rx="26" fill="${F.cor}" stroke="#fff" stroke-width="4"/><text y="11" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#fff" stroke="${F.esc}" stroke-width="2" paint-order="stroke">${F.nome}</text></g>`;}
  return g+`</g>`;}
/* objetos que a família segura */
const OBJ={
  bola:`<circle r="34" fill="#F0322F" stroke="#C21F1C" stroke-width="4"/><path d="M-31 -4 Q 0 14 31 -4" stroke="#fff" stroke-width="5" fill="none"/><circle cx="-12" cy="-14" r="8" fill="#FF9A8F"/>`,
  bloco:`<rect x="-36" y="-36" width="72" height="72" rx="6" fill="#FFD21F" stroke="#E0A800" stroke-width="5"/><rect x="-24" y="-24" width="48" height="48" rx="4" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>`,
  tri:`<path d="M0 -50 L 44 26 L -44 26 Z" fill="#2E8CF0" stroke="#1E6FD0" stroke-width="5" stroke-linejoin="round"/><circle cx="0" cy="2" r="9" fill="#fff" opacity=".5"/>`,
  livro:`<rect x="-62" y="-40" width="124" height="80" rx="6" fill="#3FB950" stroke="#2C9440" stroke-width="5"/><rect x="-62" y="-40" width="16" height="80" fill="#2C9440"/><rect x="-30" y="-20" width="70" height="10" rx="4" fill="#fff" opacity=".7"/><rect x="-30" y="0" width="50" height="8" rx="4" fill="#fff" opacity=".5"/>`
};
function maoLiz(lx,s,aD){const a=aD*Math.PI/180;return [lx+(57+80*Math.sin(a))*s,965+(-226+80*Math.cos(a))*s];}

/* ---------- cenário: a sala da família ---------- */
function sala(t,o={}){
  let s=`<rect x="-700" y="-700" width="3320" height="1490" fill="#FFF1DC"/>`;
  for(let y=-40;y<780;y+=70)for(let x=-660;x<2600;x+=70)s+=`<circle cx="${x+((y/70)%2?35:0)}" cy="${y}" r="5" fill="#FFE0BE"/>`;
  s+=`<rect x="-700" y="760" width="3320" height="30" fill="#E7C49C"/><rect x="-700" y="786" width="3320" height="700" fill="#E9B987"/>`;
  for(let i=0;i<14;i++)s+=`<path d="M${-700+i*260} 790 L ${-900+i*300} 1480" stroke="#D9A672" stroke-width="4"/>`;
  s+=`<path d="M-700 900 H 2620 M-700 1040 H 2620 M-700 1220 H 2620" stroke="#D9A672" stroke-width="3" opacity=".7"/>`;
  /* bandeirinhas triangulares (azuis) */
  s+=`<path d="M60 64 Q 960 120 1860 64" stroke="#8C6D4F" stroke-width="4" fill="none"/>`;
  for(let i=0;i<16;i++){const x=110+i*112,y=64+Math.sin(Math.PI*(x-60)/1800)*40+(i===10&&o.bandeira?-6:0);const sw=Math.sin(t*2+i)*4;
    s+=`<path transform="rotate(${r1(sw)} ${x} ${r1(y)})" d="M${x-30} ${r1(y)} L ${x+30} ${r1(y)} L ${x} ${r1(y+56)} Z" fill="${i%2?'#2E8CF0':'#5FAAF6'}" stroke="#1E6FD0" stroke-width="2"/>`;}
  /* relógio redondo */
  const hh=t*.02,mm=t*.3;s+=`<g transform="translate(470 230)"><circle r="76" fill="#F0322F"/><circle r="62" fill="#fff"/>${Array.from({length:12},(_,i)=>`<rect x="-3" y="-56" width="6" height="12" rx="3" fill="#7A5A48" transform="rotate(${i*30})"/>`).join('')}<path d="M0 0 L 0 -34" stroke="#3A2A20" stroke-width="7" stroke-linecap="round" transform="rotate(${r1(hh*360)})"/><path d="M0 0 L 0 -48" stroke="#3A2A20" stroke-width="5" stroke-linecap="round" transform="rotate(${r1(mm*360)})"/><circle r="7" fill="#F0322F"/></g>`;
  /* porta-retrato quadrado amarelo */
  s+=`<g transform="translate(760 300)"><rect x="-66" y="-66" width="132" height="132" rx="6" fill="#FFD21F" stroke="#E0A800" stroke-width="4"/><rect x="-48" y="-48" width="96" height="96" fill="#FFF8E8"/><path d="M0 22 C -26 4 -22 -18 0 -8 C 22 -18 26 4 0 22 Z" fill="#FF5A8F"/></g>`;
  /* desenho da casinha (telhado triangular azul) */
  s+=`<g transform="translate(1060 300)"><rect x="-86" y="-80" width="172" height="160" rx="6" fill="#fff" stroke="#E2D2BE" stroke-width="3" transform="rotate(-3)"/><rect x="-44" y="-4" width="88" height="62" fill="#FFB86B"/><rect x="-12" y="20" width="24" height="38" fill="#B5733C"/><path d="M-60 -2 L 0 -60 L 60 -2 Z" fill="#2E8CF0" stroke="#1E6FD0" stroke-width="3" stroke-linejoin="round"/><circle cx="58" cy="-58" r="12" fill="#FFD21F"/></g>`;
  /* janela quadrada */
  s+=`<g><rect x="1240" y="170" width="300" height="300" rx="8" fill="#FFFFFF"/><rect x="1258" y="188" width="264" height="264" fill="#9ED8FF"/><ellipse cx="1350" cy="260" rx="50" ry="22" fill="#fff"/><circle cx="1320" cy="250" r="24" fill="#fff"/><path d="M1240 400 Q 1390 340 1540 410 L 1540 470 L 1240 470 Z" fill="#8FD474"/><rect x="1382" y="188" width="16" height="264" fill="#fff"/><rect x="1258" y="312" width="264" height="16" fill="#fff"/><rect x="1226" y="466" width="328" height="20" rx="6" fill="#F1E2CC"/></g>`;
  /* porta retangular verde */
  s+=`<g><rect x="1650" y="320" width="240" height="470" rx="6" fill="#E7C49C"/><rect x="1664" y="334" width="212" height="456" rx="4" fill="#3FB950"/><rect x="1690" y="364" width="160" height="170" rx="6" fill="#36A847"/><rect x="1690" y="566" width="160" height="190" rx="6" fill="#36A847"/><circle cx="1846" cy="560" r="12" fill="#F7C744"/></g>`;
  /* TV retangular */
  s+=`<g><rect x="90" y="650" width="360" height="130" rx="10" fill="#B5733C"/><rect x="104" y="666" width="150" height="100" rx="6" fill="#A0622F"/><rect x="286" y="666" width="150" height="100" rx="6" fill="#A0622F"/><rect x="120" y="460" width="300" height="180" rx="12" fill="#2B2F3A"/><rect x="134" y="474" width="272" height="152" rx="6" fill="#4A5266"/><path d="M150 490 L 230 490" stroke="#fff" stroke-width="6" opacity=".25" stroke-linecap="round"/><rect x="250" y="640" width="40" height="14" fill="#2B2F3A"/></g>`;
  /* blocos quadrados no chão */
  if(o.blocos!==false)s+=`<g transform="translate(520 880)">${[[0,0],[74,0],[37,-70]].map(([x,y])=>`<rect x="${x-34}" y="${y-34}" width="68" height="68" rx="6" fill="#FFD21F" stroke="#E0A800" stroke-width="4"/><rect x="${x-20}" y="${y-20}" width="40" height="40" rx="4" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>`).join('')}</g>`;
  /* planta */
  s+=`<g transform="translate(1560 780)"><path d="M-30 0 L 30 0 L 22 -60 L -22 -60 Z" fill="#E2725B"/><path d="M0 -60 Q -40 -130 -60 -160 M0 -60 Q 0 -150 10 -190 M0 -60 Q 40 -120 66 -150" stroke="#3E9C42" stroke-width="8" fill="none" stroke-linecap="round"/>${[[-60,-160],[10,-190],[66,-150],[-30,-110],[30,-100]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="22" ry="12" fill="#56B84F" transform="rotate(${x} ${x} ${y})"/>`).join('')}</g>`;
  /* sofá com almofada redonda vermelha */
  s+=`<g><rect x="690" y="560" width="540" height="150" rx="50" fill="#B98AE0"/><rect x="650" y="640" width="90" height="190" rx="40" fill="#A876D6"/><rect x="1180" y="640" width="90" height="190" rx="40" fill="#A876D6"/><rect x="720" y="680" width="500" height="120" rx="34" fill="#C9A0EC"/><rect x="740" y="820" width="22" height="30" fill="#8C6D4F"/><rect x="1160" y="820" width="22" height="30" fill="#8C6D4F"/>
    <circle cx="810" cy="660" r="54" fill="#F0322F" stroke="#C21F1C" stroke-width="4"/><circle cx="810" cy="660" r="8" fill="#C21F1C"/>${[0,60,120,180,240,300].map(a=>`<path d="M810 660 L ${r1(810+Math.cos(a*Math.PI/180)*50)} ${r1(660+Math.sin(a*Math.PI/180)*50)}" stroke="#C21F1C" stroke-width="2" opacity=".6"/>`).join('')}<rect x="1060" y="620" width="96" height="80" rx="20" fill="#FFB3CF"/></g>`;
  /* tapete retangular verde (em perspectiva) */
  s+=`<path d="M640 900 L 1290 900 L 1370 1030 L 560 1030 Z" fill="#3FB950"/><path d="M670 916 L 1262 916 L 1328 1014 L 600 1014 Z" fill="none" stroke="#9BE3A8" stroke-width="6"/>`;
  return s;}
/* caixa mágica */
function caixa(x,y,abrir,t){const a=E.out(abrir);let s=`<g transform="translate(${x} ${y})"><rect x="-90" y="-130" width="180" height="130" rx="10" fill="#FF6FB5" stroke="#E0408A" stroke-width="5"/><rect x="-16" y="-130" width="32" height="130" fill="#FFD23F"/>${[[-60,-90],[50,-60],[-40,-30],[60,-110]].map(([cx,cy],i)=>`<circle cx="${cx}" cy="${cy}" r="8" fill="${['#fff','#5FE1FF','#fff','#B667F2'][i]}"/>`).join('')}`;
  s+=`<g transform="translate(0 ${r1(-130-a*220)}) rotate(${r1(a*-40)})"><rect x="-100" y="-34" width="200" height="38" rx="10" fill="#FF8BC6" stroke="#E0408A" stroke-width="5"/><rect x="-16" y="-34" width="32" height="38" fill="#FFD23F"/><path d="M0 -34 C -40 -80 -70 -40 0 -34 C 70 -40 40 -80 0 -34 Z" fill="#FFD23F" stroke="#E0A800" stroke-width="3"/></g>`;
  if(a>0&&a<1)s+=`<g opacity="${r1(1-a)}">${Array.from({length:7},(_,i)=>`<path d="M0 -130 L ${r1(Math.cos((-90+(i-3)*22)*Math.PI/180)*400)} ${r1(-130+Math.sin((-90+(i-3)*22)*Math.PI/180)*400)}" stroke="#FFF3B0" stroke-width="18" opacity=".6"/>`).join('')}</g>`;
  return s+`</g>`;}
const ORBITA=['circulo','quadrado','triangulo','retangulo'];
function formasFlutuando(t,t0,cx,cy,raio,sai=null){let s='';ORBITA.forEach((k,i)=>{const p=E.out(prog(t,t0+i*.18,t0+i*.18+1));if(p<=0)return;const a=(t*.5+i*Math.PI/2);let x=lerp(960,cx+Math.cos(a)*raio,p),y=lerp(860,cy+Math.sin(a)*raio*.45,p)+Math.sin(t*2+i)*14;
  if(sai!==null&&t>sai){const q=E.in(prog(t,sai+i*.1,sai+i*.1+.8));y-=q*900;}
  s+=forma(k,x,y,lerp(30,110,p),Math.sin(t*1.5+i)*18,{rosto:true});});return s;}
/* transição: forma gigante que cobre e revela */
function transForma(t,t0,tipo){const p=prog(t,t0-.45,t0+.45);if(p<=0||p>=1)return '';const k=p<.5?E.in(p*2):1-E.out((p-.5)*2);return forma(tipo,960,540,k*2600,p*180,{sombra:false,borda:1});}
/* HUD da caça às formas */
function hudCaca(t){const [a,b]=SC.caca;if(t<a+2||t>b-.3)return '';const ap=E.back(prog(t,a+2,a+2.6))*(1-prog(t,b-.7,b-.3));
  const T={circulo:A.caca.c1,quadrado:A.caca.c2,triangulo:A.caca.c3,retangulo:A.caca.c4};
  let s=`<g transform="translate(960 84) scale(${r1(ap)})"><rect x="-300" y="-54" width="600" height="108" rx="54" fill="#fff" opacity=".94" filter="url(#sombraSuave)"/>`;
  ORBITA.forEach((k,i)=>{const x=-210+i*140,f=E.back(prog(t,T[k]+.2,T[k]+.7));s+=forma(k,x,0,62,0,{sombra:false,borda:3}).replace('<g ',`<g opacity="${f>0?1:.3}" `);
    if(f>0)s+=`<g transform="translate(${x+30} 26) scale(${r1(f)})"><circle r="18" fill="#3FB950" stroke="#fff" stroke-width="4"/><path d="M-8 0 l 5 6 l 10 -12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;});
  return s+`</g>`;}
const ITENS=[['circulo','Almofada'],['quadrado','Porta-retrato'],['triangulo','Bandeirinha'],['retangulo','Tapete'],['circulo','Bola']];
function fileiraEncontrados(t){const [a,b]=SC.caca;const TT=[A.caca.c1,A.caca.c2,A.caca.c3,A.caca.c4,A.caca.c5];const cont=LS.caca.slice(10,15);if(t<TT[0]||t>b-.3)return '';const o=1-prog(t,b-.7,b-.3);
  let s=`<g opacity="${r1(o)}"><rect x="24" y="902" width="540" height="116" rx="58" fill="#fff" opacity=".9" filter="url(#sombraSuave)"/>`;
  ITENS.forEach(([k],i)=>{const x=104+i*96,f=E.back(prog(t,TT[i]+.2,TT[i]+.7));if(f<=0){s+=`<circle cx="${x}" cy="962" r="36" fill="#F1EADF"/>`;return;}
    const ct=cont[i];const bump=ct&&t>=ct&&t<ct+.4?Math.sin(prog(t,ct,ct+.4)*Math.PI)*24:0;
    s+=forma(k,x,962-bump,56*f,0,{sombra:false,borda:3});
    if(ct&&t>=ct){const q=E.back(prog(t,ct,ct+.3));s+=`<g transform="translate(${x+30} 926) scale(${r1(q)})"><circle r="22" fill="#FF4FA0" stroke="#fff" stroke-width="4"/><text y="10" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#fff">${i+1}</text></g>`;}});
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
  s+=`<g transform="translate(960 708) scale(${r1(tg)})"><rect x="-560" y="-58" width="1120" height="116" rx="58" fill="#7B3DB8" stroke="#fff" stroke-width="6"/><text y="-8" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#F1E2FF">EPISÓDIO 3</text><text y="38" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="48" fill="#fff">O Mistério das Formas Geométricas</text></g>`;
  ORBITA.forEach((k,i)=>{const p=E.back(prog(t,12+i*.15,12.8+i*.15));if(p>0)s+=forma(k,[420,1500,560,1360][i],[620,610,800,800][i],70*p,t*40+i*30,{rosto:true});});
  const ep=prog(t,14.2,14.6)*(1-prog(t,15.6,16));s+=`<rect width="1920" height="1080" fill="#fff" opacity="${r1(ep*.9)}"/>`;
  return s;};
S.caixa=(t)=>{
  const [a,b]=SC.caixa,L=LS.caixa,ab=A.caixa.abre;
  const [cx,cy,z]=camK(t,[[a,960,560,1.0],[L[0],960,580,1.04],[ab-.2,980,640,1.22],[L[2]+.6,960,560,1.0],[b,960,560,1.02]]);
  let w=sala(t);
  w+=caixa(1000,1000,prog(t,ab,ab+.6),t);
  if(t>=ab)w+=brilhos(1000,820,t,14,220,undefined,5)+formasFlutuando(t,ab+.2,1000,420,330,b-1.2);
  /* mamãe entra pela porta */
  const mp=E.out(prog(t,a,a+1.6));let mo={expr:'feliz',falar:boca('MAE',t),piscar:piscar(t,.4),pulo:t<a+1.6?Math.abs(Math.sin(t*10))*8:0,olharX:-.6};
  if(t>=L[0]&&t<L[1])Object.assign(mo,{bracoE:70});
  if(t>=L[3]&&t<L[4])Object.assign(mo,{bracoE:120,bracoD:120});
  w+=at(lerp(1760,1330,mp),990,.95,mae(mo));
  /* Liz */
  let lo=lizPose(t,{olharX:.5});
  if(t<a+1.4)w+=at(lerp(300,760,E.out(prog(t,a,a+1.4))),965,1.05,lizLado({expr:'sorriso',passo:t*12,pulo:Math.abs(Math.sin(t*12))*8}));
  else{if(t>=L[1]&&t<ab)Object.assign(lo,{expr:'pensativa',bracoD:160,olharX:.7,olharY:-.6});
    if(t>=ab&&t<L[3])Object.assign(lo,{expr:'surpresa',bracoE:60,bracoD:60,olharY:-1,falar:boca('LIZ',t)});
    const c=comemora(t,L[4],1.4);if(c)Object.assign(lo,c);
    w+=at(760,965,1.05,liz(lo));}
  w+=at(lerp(150,580,E.out(prog(t,a+.3,a+1.8))),968,.92,pipo({rabo:Math.sin(t*14)*24,latir:boca('PIPO',t),pulo:(falando('PIPO',t)?pulinho(t,3,26):0)+(t>=ab&&t<ab+1?pulinho(t,2,30):0),olharX:1,piscar:piscar(t,.8)}));
  return `<g transform="${cam(cx,cy,z)}">${w}</g>`;};
S.circulo=(t)=>{
  const [a,b]=SC.circulo,L=LS.circulo,gi=A.circulo.gira;
  const [cx,cy,z]=camK(t,[[a,1000,560,1.0],[L[3]-.2,980,560,1.0],[L[3]+.6,800,500,1.04],[L[4],960,560,1.0],[L[5],860,600,1.25],[b,860,600,1.25]]);
  let w=sala(t);
  const dp=E.out(prog(t,a,a+1.4));let po={expr:'feliz',falar:boca('PAI',t),piscar:piscar(t,.2),segura:OBJ.bola,bracoD:t>=a+1.2?105:40,pulo:t<a+1.4?Math.abs(Math.sin(t*10))*8:0,olharX:-.6};
  if(t>=L[2]&&t<L[3])Object.assign(po,{bracoD:150});
  w+=at(lerp(1780,1200,dp),990,.95,pai(po));
  w+=at(1560,990,.86,mae({expr:'feliz',piscar:piscar(t,1.2),olharX:-.8}));
  let lo=lizPose(t,{olharX:.6});
  if(t>=L[1]&&t<L[2])Object.assign(lo,{expr:'pensativa',bracoD:160,olharX:.6,olharY:-.6});
  if(t>=L[4]&&t<L[5]){Object.assign(lo,{expr:'rindo',bracoE:150,bracoD:150,pulo:pulinho(t,2,40),falar:boca('LIZ',t)});}
  const c=comemora(t,L[6],1.4);if(c)Object.assign(lo,c);
  w+=at(760,965,1.05,liz(lo));
  w+=at(580,968,.92,pipo({rabo:Math.sin(t*14)*24,olharX:1,pulo:t>=L[4]&&t<L[5]?pulinho(t+.2,2,30):0,piscar:piscar(t,.6)}));
  /* destaques: bola e relógio */
  const hb=[1200+(70+166*Math.sin(105*Math.PI/180))*.95,990+(-452+166*Math.cos(105*Math.PI/180))*.95];
  w+=realce('circulo',hb[0],hb[1],100,100,t,L[3],L[3]+3.2,false)+realce('circulo',470,230,180,180,t,L[3]+.9,L[4]+.2);
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  s+=formaGrande('circulo',990,270,210,t,gi-.1,L[3]);
  /* dica na pausa: coisas redondas */
  const dp2=E.back(prog(t,L[5]+2.2,L[5]+2.8))*(1-prog(t,L[6]-.2,L[6]));if(dp2>0){s+=`<g transform="translate(1440 470) scale(${r1(dp2)})"><circle r="170" fill="#fff" opacity=".94" filter="url(#sombraSuave)"/>${forma('circulo',-70,-50,70,t*60,{sombra:false})}<g transform="translate(70 -50)"><circle r="36" fill="#FF9A1F"/><path d="M0 -36 q 6 -12 14 -14" stroke="#3E9C42" stroke-width="5" fill="none"/></g><g transform="translate(-60 70)"><circle r="40" fill="#fff" stroke="#BFC7D5" stroke-width="6"/><circle r="26" fill="none" stroke="#DDE3EC" stroke-width="4"/></g><g transform="translate(70 70)"><circle r="30" fill="#FFD21F" stroke="#E0A800" stroke-width="4"/><circle cx="-8" cy="-6" r="4" fill="#E0A800"/><circle cx="8" cy="-6" r="4" fill="#E0A800"/><circle cx="-8" cy="8" r="4" fill="#E0A800"/><circle cx="8" cy="8" r="4" fill="#E0A800"/></g></g>`;}
  return s;};
S.quadrado=(t)=>{
  const [a,b]=SC.quadrado,L=LS.quadrado,ex=A.quadrado.exemplos;
  const [cx,cy,z]=camK(t,[[a,940,560,1.0],[L[2],960,560,1.0],[ex-.2,960,560,1.0],[ex+.8,1000,480,.96],[b,980,520,.98]]);
  let w=sala(t);
  const vp=E.out(prog(t,a,a+1.4));let vo={expr:'feliz',falar:boca('VOVO',t),piscar:piscar(t,.5),segura:OBJ.bloco,bracoD:t>=a+1?110:40,pulo:t<a+1.4?Math.abs(Math.sin(t*9))*6:0,olharX:-.6};
  if(t>=L[3]&&t<L[7])Object.assign(vo,{expr:'rindo',pulo:0});
  w+=at(lerp(1780,1200,vp),990,.92,vovo(vo));
  let lo=lizPose(t,{olharX:.6});
  if(t>=L[1]&&t<L[2])Object.assign(lo,{expr:'animada',bracoD:160,falar:boca('LIZ',t)});
  [3,4,5,6].forEach(k=>{if(t>=L[k]&&t<L[k]+.7)Object.assign(lo,{expr:'animada',bracoD:165,pulo:20});});
  w+=at(760,965,1.05,liz(lo));
  w+=at(580,968,.92,pipo({rabo:Math.sin(t*14)*24,olharX:1,piscar:piscar(t,.6),latir:t>=L[6]&&t<L[6]+.5}));
  w+=realce('quadrado',1390,320,320,320,t,ex,b-.2)+realce('quadrado',557,845,190,150,t,ex+.8,b-.2,false);
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  const t1=ex;s+=formaGrande('quadrado',985,270,200,t,L[0]+.6,t1)+(t<t1?contaLados('quadrado',985,270,200,t,[L[3],L[4],L[5],L[6]]):'');
  return s;};
S.triangulo=(t)=>{
  const [a,b]=SC.triangulo,L=LS.triangulo,ex=A.triangulo.exemplos;
  const [cx,cy,z]=camK(t,[[a,960,560,1.0],[ex-.2,960,560,1.0],[ex+.8,1000,460,.98],[b,1000,480,.98]]);
  let w=sala(t);
  w+=at(1200,990,.95,pai({expr:'feliz',falar:boca('PAI',t),piscar:piscar(t,.2),olharX:-.6,bracoD:t>=L[1]&&t<L[1]+2?140:20}));
  w+=at(1560,990,.86,vovo({expr:'feliz',piscar:piscar(t,.9),olharX:-.8}));
  const aD=t<a+.8?20:(t<ex?130:40);
  let lo=lizPose(t,{olharX:.6});Object.assign(lo,{bracoD:aD});
  if(t>=L[0]&&t<L[1])Object.assign(lo,{expr:'animada'});
  [2,3,4].forEach(k=>{if(t>=L[k]&&t<L[k]+.7)Object.assign(lo,{expr:'animada',pulo:20});});
  if(emPausa(t))lo.bracoD=130;
  w+=at(760,965,1.05,liz(lo));
  if(t<ex){const [hx,hy]=maoLiz(760,1.05,aD);w+=`<g transform="translate(${r1(hx)} ${r1(hy-10)})">${OBJ.tri}</g>`;}
  w+=at(580,968,.92,pipo({rabo:Math.sin(t*14)*24,olharX:1,piscar:piscar(t,.6)}));
  w+=realce('triangulo',1060,270,150,90,t,ex,b-.2);
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  s+=formaGrande('triangulo',985,275,210,t,A.triangulo.gira-.2,ex)+(t<ex?contaLados('triangulo',985,275,210,t,[L[2],L[3],L[4]]):'');
  /* exemplo: placa triangular */
  const pp=E.back(prog(t,ex+.9,ex+1.4))*(1-prog(t,b-.5,b-.1));if(pp>0)s+=`<g transform="translate(1520 640) scale(${r1(pp)})"><rect x="-8" y="0" width="16" height="200" fill="#9AA6B5"/>${forma('triangulo',0,-20,170,0,{sombra:true})}<path d="M0 -60 v 44" stroke="#fff" stroke-width="14" stroke-linecap="round"/><circle cx="0" cy="8" r="8" fill="#fff"/><g transform="translate(0 230)"><rect x="-80" y="-24" width="160" height="48" rx="24" fill="#2E8CF0"/><text y="10" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="28" fill="#fff">placa</text></g></g>`;
  return s;};
S.retangulo=(t)=>{
  const [a,b]=SC.retangulo,L=LS.retangulo,ex=A.retangulo.exemplos;
  const [cx,cy,z]=camK(t,[[a,960,560,1.0],[ex-.2,960,560,1.0],[ex+.4,980,520,.94],[b,980,520,.95]]);
  let w=sala(t);
  w+=at(1200,990,.95,mae({expr:'feliz',falar:boca('MAE',t),piscar:piscar(t,.4),segura:OBJ.livro,bracoD:105,olharX:-.6}));
  let lo=lizPose(t,{olharX:.6});
  if(t>=L[1]&&t<L[2]+.3)Object.assign(lo,{expr:'animada',bracoE:95,bracoD:95});
  w+=at(760,965,1.05,liz(lo));
  w+=at(580,968,.92,pipo({rabo:Math.sin(t*14)*24,olharX:1,piscar:piscar(t,.6)}));
  const hb=[1200+(70+166*Math.sin(105*Math.PI/180))*.95,990+(-452+166*Math.cos(105*Math.PI/180))*.95];
  w+=realce('retangulo',1770,555,230,460,t,ex,b-.2)+realce('retangulo',hb[0],hb[1],140,96,t,ex+.8,b-.2,false)+realce('retangulo',270,550,320,200,t,ex+1.6,b-.2);
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  s+=formaGrande('retangulo',985,265,170,t,A.retangulo.gira-.2,ex);
  return s;};
S.caca=(t)=>{
  const [a,b]=SC.caca,L=LS.caca,C=A.caca;
  const [cx,cy,z]=camK(t,[[a,960,560,.98],[C.c1-.6,900,600,1.12],[C.c2-.6,800,480,1.12],[C.c3-.6,1100,420,1.06],[C.c4-.6,960,620,1.0],[C.c5-.4,1060,580,1.0],[L[9],960,560,.98],[b,960,560,.98]]);
  let w=sala(t,{bandeira:t>=C.c3});
  /* família */
  const torcida=(t0)=>t>=t0&&t<t0+1.2?Math.abs(Math.sin(t*9))*16:0;
  const festa=[C.c1,C.c2,C.c3,C.c4,C.c5].reduce((m,x)=>m+torcida(x),0);
  w+=at(1350,990,.9,pai({expr:festa?'rindo':'feliz',falar:boca('PAI',t),piscar:piscar(t,.2),olharX:-.6,segura:t>=C.c5-.4?OBJ.bola:null,bracoD:t>=C.c5-.4?120:(t<L[0]+3?120:20),bracoE:festa?150:12,pulo:festa}));
  w+=at(1560,990,.86,mae({expr:festa?'rindo':'feliz',falar:boca('MAE',t),piscar:piscar(t,1.1),olharX:-.8,bracoE:festa?150:12,bracoD:festa?150:12,pulo:festa}));
  w+=at(250,990,.88,vovo({expr:'feliz',falar:boca('VOVO',t),piscar:piscar(t,.7),olharX:.6,bracoD:t>=L[9]?120:12,bracoE:festa?150:12,pulo:festa*.6}));
  /* Liz percorre a sala */
  const pts=[[a,960],[C.c1-.8,960],[C.c1,1010],[C.c2-.8,1010],[C.c2,920],[C.c3-.8,920],[C.c3,1120],[C.c4-.8,1120],[C.c4,960]];
  let lx=960;for(let i=0;i<pts.length-1;i++){if(t>=pts[i][0]&&t<pts[i+1][0]){lx=lerp(pts[i][1],pts[i+1][1],E.inOut(prog(t,pts[i][0],pts[i+1][0])));break;}if(t>=pts[pts.length-1][0])lx=960;}
  let lo=lizPose(t,{olharX:.3});
  if(t>=C.c1&&t<C.c1+1.2)Object.assign(lo,{expr:'animada',bracoE:100,apontarE:true,olharX:-.6});
  if(t>=C.c2&&t<C.c2+1.4)Object.assign(lo,{expr:'animada',bracoE:150,apontarE:true,olharY:-1,olharX:-.4});
  if(t>=C.c3&&t<C.c3+2.4)Object.assign(lo,{expr:'rindo',bracoD:150,olharY:-1});
  if(t>=C.c4&&t<C.c4+1.4)Object.assign(lo,{expr:'animada',bracoE:60,bracoD:60,olharY:.6});
  if(t>=C.c5&&t<C.c5+1.6)Object.assign(lo,{expr:'feliz',bracoD:100,apontarD:true,olharX:.8});
  [10,11,12,13,14].forEach(k=>{if(t>=L[k]&&t<L[k]+.6)Object.assign(lo,{expr:'animada',bracoD:165,pulo:22});});
  const c=comemora(t,L[15],1.6);if(c)Object.assign(lo,c);
  w+=at(lx,965,1.0,liz(lo));
  /* Pipo acompanha e acha a bandeirinha */
  let px=lerp(lx-170,lx-170,1);if(t>=C.c3-1.4&&t<C.c3+1.6)px=lerp(lx-170,1190,E.inOut(prog(t,C.c3-1.4,C.c3-.4)));
  w+=at(px,968,.9,pipo({rabo:Math.sin(t*16)*26,latir:boca('PIPO',t),pulo:(falando('PIPO',t)?pulinho(t,3,40):0),olharX:1,inclinar:t>=C.c3-.4&&t<C.c3+1.6?-16:0,piscar:piscar(t,.6)}));
  /* descobertas */
  const ach=[[C.c1,'circulo',810,660,130,130],[C.c2,'quadrado',760,300,160,160],[C.c3,'triangulo',1230,92,90,70],[C.c4,'retangulo',965,965,780,140],[C.c5,'circulo',1350+(70+166*Math.sin(120*Math.PI/180))*.9,990+(-452+166*Math.cos(120*Math.PI/180))*.9,100,100]];
  ach.forEach(([t0,k,x,y,ww,hh])=>{w+=realce(k,x,y,ww,hh,t,t0,t0+2.4,k!=='retangulo')+explosao(x,y,t,t0+.15,FORMA[k].cor);});
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  [C.c1,C.c2,C.c3,C.c4,C.c5].forEach(t0=>{s+=confete(t,t0+.1,t0+1.2).replace(/<rect /g,'<rect opacity=".9" ');});
  s+=hudCaca(t)+fileiraEncontrados(t);
  return s;};
S.desafio=(t)=>{
  const [a,b]=SC.desafio,L=LS.desafio,F=[A.desafio.f1,A.desafio.f2,A.desafio.f3,A.desafio.f4];
  let s=`<radialGradient id="palco" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#FFF4FB"/><stop offset=".7" stop-color="#FFD3EA"/><stop offset="1" stop-color="#E7B8FF"/></radialGradient><rect width="1920" height="1080" fill="url(#palco)"/>`;
  for(let i=0;i<14;i++){const ang=i*(360/14)+t*8;s+=`<path d="M1340 480 L ${r1(1340+Math.cos(ang*Math.PI/180)*1500)} ${r1(480+Math.sin(ang*Math.PI/180)*1500)} L ${r1(1340+Math.cos((ang+10)*Math.PI/180)*1500)} ${r1(480+Math.sin((ang+10)*Math.PI/180)*1500)} Z" fill="#fff" opacity=".22"/>`;}
  s+=brilhos(1340,480,t,20,600,undefined,13);
  const ordem=['circulo','quadrado','triangulo','retangulo'];
  let atual=-1;F.forEach((tf,i)=>{if(t>=tf)atual=i;});
  const fim=t>=L[9];
  let lo=lizPose(t,{olharX:.6});
  if(t<L[1])Object.assign(lo,{expr:'animada',bracoE:120,bracoD:120,olharX:0});
  ordem.forEach((k,i)=>{const pq=L[1+i*2],rv=L[2+i*2];if(t>=pq&&t<pq+1.8)Object.assign(lo,{expr:'pensativa',bracoD:100,apontarD:true,olharX:.8});const c=comemora(t,rv,1.2);if(c)Object.assign(lo,c);});
  if(fim)Object.assign(lo,{expr:'rindo',bracoE:150,bracoD:150,pulo:pulinho(t,1.6,40),falar:boca('LIZ',t)});
  s+=at(520,1040,1.32,liz(lo))+at(250,1050,1.0,pipo({rabo:Math.sin(t*16)*26,pulo:fim?pulinho(t+.3,1.6,30):0,olharX:1,piscar:piscar(t,.4)}));
  if(atual>=0&&!fim){const k=ordem[atual],tf=F[atual],rv=L[2+atual*2],nx=F[atual+1]||L[9];
    const ap=E.back(prog(t,tf,tf+.6)),sa=E.in(prog(t,nx-.5,nx));const rev=t>=rv;const sc=ap*(1-sa);
    s+=`<g transform="translate(1340 470) scale(${r1(sc)})"><circle r="250" fill="#fff" opacity=".9" filter="url(#sombraSuave)"/>${forma(k,0,-10,250,Math.sin(t*2)*6+(rev?Math.sin(prog(t,rv,rv+.6)*Math.PI)*20:0),{rosto:rev})}`;
    if(!rev)s+=`<g transform="translate(150 -170) scale(${r1(1+.08*Math.sin(t*6))})"><circle r="52" fill="#7B3DB8" stroke="#fff" stroke-width="6"/><text y="24" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="70" fill="#fff">?</text></g>`;
    else{const q=E.back(prog(t,rv,rv+.4));const FF=FORMA[k];s+=`<g transform="translate(0 220) scale(${r1(q)})"><rect x="-190" y="-44" width="380" height="88" rx="44" fill="${FF.cor}" stroke="#fff" stroke-width="7"/><text y="18" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="56" fill="#fff" stroke="${FF.esc}" stroke-width="3" paint-order="stroke">${FF.nome}</text></g>`;}
    s+=`</g>`;if(rev)s+=explosao(1340,470,t,rv,FORMA[k].cor);}
  if(fim){ordem.forEach((k,i)=>{const p=E.back(prog(t,L[9]+i*.12,L[9]+.6+i*.12));const ang=t*.8+i*Math.PI/2;s+=forma(k,1340+Math.cos(ang)*240,470+Math.sin(ang)*150+Math.sin(t*4+i)*20,130*p,Math.sin(t*3+i)*20,{rosto:true});});s+=confete(t,L[9],b);}
  s+=`<g transform="translate(960 70)" opacity="${r1(prog(t,a+.3,a+.8))}"><rect x="-260" y="-36" width="520" height="72" rx="36" fill="#7B3DB8"/><text y="14" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="38" fill="#fff">Desafio dos amiguinhos</text></g>`;
  return s;};
const LETRA=['Círculo é redondinho,','Quadrado tem quatro ladinhos,','Triângulo tem três pontinhas,','Retângulo é compridinho!','Vamos juntos aprender,','Formas para reconhecer!','Na escola ou em casa também,','Aprender é muito bom, amém!'];
function karaoke(t,t0){const k=Math.floor((t-t0)/4);if(t<t0-.5||k>=8)return '';const kk=Math.max(0,k);const p=clamp((t-t0-kk*4)/3.2);
  const ap=prog(t,t0-.5,t0);let s=`<g opacity="${r1(ap)}"><rect x="360" y="850" width="1200" height="190" rx="40" fill="#2A1640" opacity=".78"/>`;
  const ic=kk<4?ORBITA[kk]:null;if(ic)s+=forma(ic,450,922,64,Math.sin(t*4)*10,{sombra:false,borda:3});
  s+=`<defs><linearGradient id="kfill" x1="0" x2="1"><stop offset="${r1(p)}" stop-color="#FFD23F"/><stop offset="${r1(p)}" stop-color="#FFFFFF"/></linearGradient></defs>`;
  s+=`<text x="${ic?990:960}" y="940" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="58" fill="url(#kfill)" stroke="#2A1640" stroke-width="3" paint-order="stroke">${LETRA[kk]}</text>`;
  if(kk<7)s+=`<text x="960" y="1004" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#fff" opacity=".55">${LETRA[kk+1]}</text>`;
  for(let i=0;i<3;i++)s+=`<text x="${400+i*1100}" y="${1000-Math.abs(Math.sin(t*4+i))*20}" font-size="44" fill="#FFD23F" font-family="Fredoka">♪</text>`;
  return s+`</g>`;}
S.musica=(t)=>{
  const [a,b]=SC.musica,L=LS.musica,c0=A.musica.canta,tt=A.musica.titulo;
  const [cx,cy,z]=camK(t,[[a,960,540,.92],[L[0]-.4,960,540,.92],[L[0]+.3,860,560,1.2],[tt+.6,860,560,1.2],[tt+2.6,960,540,.9],[b,960,540,.9]]);
  let w=sala(t);
  const dancando=t>=c0&&t<c0+32.5;const bt=(t-c0)*2*Math.PI;
  const dz=(ph,amp=26)=>dancando?Math.abs(Math.sin(bt/2+ph))*amp:0;
  const br=(ph)=>dancando?150+Math.sin(bt/2+ph)*24:14;
  w+=at(1230,990,.92,pai({expr:'rindo',piscar:piscar(t,.2),bracoE:br(0),bracoD:br(1),pulo:dz(0),inclinar:dancando?Math.sin(bt/4)*5:0}));
  w+=at(1460,990,.86,mae({expr:'rindo',piscar:piscar(t,.6),bracoE:br(1),bracoD:br(0),pulo:dz(.5),inclinar:dancando?-Math.sin(bt/4)*5:0}));
  w+=at(480,990,.86,vovo({expr:'rindo',piscar:piscar(t,.9),bracoE:dancando?120+Math.sin(bt/2)*20:12,bracoD:dancando?120-Math.sin(bt/2)*20:12,pulo:dz(1,12)}));
  let lo=lizPose(t,{});
  if(dancando)Object.assign(lo,{expr:'rindo',bracoE:br(.5),bracoD:br(1.5),pulo:dz(.3,40),inclinar:Math.sin(bt/4)*6,falar:false});
  if(t>=L[0])Object.assign(lo,{expr:'feliz',bracoD:150+Math.sin(t*10)*22,falar:boca('LIZ',t)});
  w+=at(860,965,1.05,liz(lo));
  w+=at(680,968,.92,pipo({rabo:Math.sin(t*18)*28,pulo:dz(1.2,30),latir:dancando&&Math.floor((t-c0)*2)%8===7,piscar:piscar(t,.4)}));
  if(dancando)ORBITA.forEach((k,i)=>{const ang=t*.9+i*Math.PI/2;w+=forma(k,960+Math.cos(ang)*620,360+Math.sin(ang)*110+dz(i,30)*-1,100,Math.sin(bt/2+i)*20,{rosto:true});});
  let s=`<g transform="${cam(cx,cy,z)}">${w}</g>`;
  s+=karaoke(t,c0);
  const ti=E.back(prog(t,tt+1.6,tt+2.4));
  if(ti>0){s+=`<rect width="1920" height="1080" fill="#3a1b4a" opacity="${r1(.4*prog(t,tt+1.4,tt+2.4))}"/>`+at(960,320,.62*ti,logoSVG());
    s+=`<g transform="translate(960 650) scale(${r1(ti)})"><rect x="-580" y="-62" width="1160" height="124" rx="62" fill="#7B3DB8" stroke="#fff" stroke-width="6"/><text y="-10" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="34" fill="#F1E2FF">EPISÓDIO 3</text><text y="40" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="50" fill="#fff">O Mistério das Formas Geométricas</text></g>`;
    const nx=E.out(prog(t,tt+3.2,tt+3.8));s+=`<g transform="translate(960 790)" opacity="${r1(nx)}"><text text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="38" fill="#fff" stroke="#6A2C9E" stroke-width="8" paint-order="stroke">Próximo episódio: O Jardim dos Números</text></g>`;
    ORBITA.forEach((k,i)=>{s+=forma(k,[300,1620,420,1500][i],[300,300,800,800][i],110*ti,t*30+i*40,{rosto:true});});}
  const fo=prog(t,b-.9,b);s+=`<rect width="1920" height="1080" fill="#1b1030" opacity="${r1(fo)}"/>`;
  return s;};
