  /* ---------- episódio 3: instrumentos e música original "Formas para Reconhecer" ---------- */
  const marimba=(x,m,v=1)=>{if(!ok(x))return;const f=mtof(m);const g=ctx.createGain();env(g,x,.002,.11*v,.3);[[1,'sine',1],[4,'sine',.18]].forEach(([k,ty,a])=>{const o=osc(ty,f*k,x,.38);const gg=ctx.createGain();gg.gain.value=a;o.connect(gg);gg.connect(g);});out(g,mus,1,.3);};
  const xilo=(x,m,v=1)=>{if(!ok(x))return;const f=mtof(m);const g=ctx.createGain();env(g,x,.002,.16*v,.45);[[1,'sine',1],[3,'sine',.3],[6.2,'sine',.08]].forEach(([k,ty,a])=>{const o=osc(ty,f*k,x,.5);const gg=ctx.createGain();gg.gain.value=a;o.connect(gg);gg.connect(g);});out(g,master,1,.35);};
  const giro=(x,v=1)=>{if(!ok(x))return;const o=osc('sine',500,x,.9);o.frequency.exponentialRampToValueAtTime(1400,T(x)+.45);o.frequency.exponentialRampToValueAtTime(700,T(x)+.9);const lfo=osc('sine',12,x,.9),lg=ctx.createGain();lg.gain.value=40;lfo.connect(lg);lg.connect(o.frequency);const g=ctx.createGain();env(g,x,.05,.08*v,.8);o.connect(g);out(g,master,1,.4);};
  const ding=(x,v=1)=>{sino(x,88,.5,.8*v);sino(x+.08,93,.6,.6*v);};
  /* música: 16 compassos (8 versos x 2 compassos), Dó maior, 120 bpm */
  const CANCAO_AC=['C','G','C','C','F','C','G','C','F','C','F','G','C','Am','F','G'];
  const CANCAO_MEL=[
    [67,67,64,67,69,69,67,64,62],[67,67,64,67,69,69,67,64,67],[69,69,65,69,71,71,69,65,64],[67,67,64,62,64,65,64,62,60],
    [72,72,71,69,67,69,67,64,67],[72,72,71,69,67,69,71,72,74],[76,74,72,74,76,74,72,69,67],[69,72,72,71,69,71,72,74,72]];
  function cancao(x0,v=1){
    for(let b=0;b<16;b++){const ac=ACORDES[CANCAO_AC[b]],x=x0+b*2;
      for(let k=0;k<8;k++)ukulele(x+k*.25,ac[[0,2,1,3,2,1,3,2][k]],.9*v);
      baixo(x,ac[0],.45,v);baixo(x+1,ac[0],.45,v);baixo(x+1.5,ac[2],.3,.7*v);
      for(let k=0;k<4;k++){bumbo(x+k*.5,k%2?.6:.95);chocalho(x+k*.5+.25);}palma(x+.5);palma(x+1.5);}
    CANCAO_MEL.forEach((ns,l)=>{const x=x0+l*4;ns.slice(0,8).forEach((m,i)=>{sino(x+i*.25,m,.22,1.1*v);marimba(x+i*.25,m-12,.5*v);});sino(x+2,ns[8],.9,1.1*v);marimba(x+2,ns[8]-12,.6*v);});
    [60,64,67,72].forEach(m=>sino(x0+32,m,1.6,.9));baixo(x0+32,48,1.4);bumbo(x0+32,1);corneta(x0+32.1);
  }
  /* ---------- arranjo do episódio 3 ---------- */
  const sc=Object.fromEntries(SCENES.map(s=>[s[0],[s[1],s[2]]]));
  tema(0,8,true,true,1);pop(1.0);latido(3.2);latido(3.45);bip(5.0,88);bip(5.12,84);harpa(6.5,.8);brilho(9.5,1.2,10,9);whoosh(8.4,.6);sino(10.4,'C6',1.2,1);vinheta(11.6);[12,12.15,12.3,12.45].forEach(x=>pop(x,.6));whoosh(15.5,.5);
  /* leito da sala, suave, até a música final */
  leito(16,sc.musica[0],.4);
  /* transições com formas */
  SCENES.slice(2).forEach(([n,a])=>whoosh(a-.45,.8,.8));
  /* caixa mágica */
  {const ab=A.caixa.abre;rangido(ab-.2,.6);harpa(ab,1.1);brilho(ab+.1,1.4,14,5);[0,.18,.36,.54].forEach((d,i)=>{pop(ab+.25+d,.8);sino(ab+.25+d,[72,76,79,84][i],.3,.7);});latido(LS.caixa[5]+.05);latido(LS.caixa[5]+.45);vinheta(LS.caixa[4]);}
  /* formas gigantes: aparecem girando */
  [['circulo',A.circulo.gira],['quadrado',LS.quadrado[0]+.6],['triangulo',A.triangulo.gira],['retangulo',A.retangulo.gira]].forEach(([k,x])=>{whoosh(x-.2,.5,.7);giro(x);vinheta(x+.3);});
  /* realces de objetos da sala */
  [LS.circulo[3],LS.circulo[3]+.9,A.quadrado.exemplos,A.quadrado.exemplos+.8,A.triangulo.exemplos,A.triangulo.exemplos+.9,A.retangulo.exemplos,A.retangulo.exemplos+.8,A.retangulo.exemplos+1.6].forEach(x=>ding(x));
  /* contagens: xilofone subindo */
  [[LS.quadrado,[3,4,5,6]],[LS.triangulo,[2,3,4]],[LS.caca,[10,11,12,13,14]]].forEach(([Ls,ks])=>ks.forEach((k,i)=>{xilo(Ls[k],[72,74,76,77,79][i]);pop(Ls[k]+.05,.6);}));
  vinheta(LS.circulo[6]);vinheta(LS.caca[15]);
  /* caça às formas */
  latido(LS.caca[2]+.05);latido(LS.caca[2]+.45);
  [A.caca.c1,A.caca.c2,A.caca.c3,A.caca.c4,A.caca.c5].forEach(x=>{vinheta(x+.1);for(let i=0;i<6;i++)pop(x+.2+i*.12,.5);});
  latido(A.caca.c3+.05);latido(A.caca.c3+.4);latido(A.caca.c3+.75);
  /* desafio: revelação com fanfarra */
  [2,4,6,8].forEach(k=>{const x=LS.desafio[k];vinheta(x);corneta(x+.05);});
  [A.desafio.f1,A.desafio.f2,A.desafio.f3,A.desafio.f4].forEach(x=>{whoosh(x-.1,.5,.7);pop(x+.3);});
  harpa(LS.desafio[9],1);brilho(LS.desafio[9]+.2,1.4,14,77);
  /* pausas: tique-taque suave */
  PAUSES.forEach(([p0,p1])=>{for(let x=p0+.2;x<p1-.2;x+=.5)sino(x,(Math.round((x-p0)*2)%2)?'G5':'E5',.12,.35);});
  /* encerramento musical */
  cancao(A.musica.canta,1);harpa(A.musica.titulo+1.6,.9);[60,64,67,72].forEach(m=>sino(A.musica.titulo+1.8,m,1.6,.7));
