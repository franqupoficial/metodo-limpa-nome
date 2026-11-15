  /* ---------- sons novos do episódio 2 (sintetizados, originais) ---------- */
  const rugido=(x,v=1,longe=false)=>{if(!ok(x))return;const dur=longe?1.4:1.8;
    const o=osc('sawtooth',105,x,dur);o.frequency.linearRampToValueAtTime(150,T(x)+dur*.35);o.frequency.linearRampToValueAtTime(85,T(x)+dur);
    const lfo=osc('sine',11,x,dur),lg=ctx.createGain();lg.gain.value=9;lfo.connect(lg);lg.connect(o.frequency);
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=longe?420:620;f.Q.value=1.4;
    const n=ruido(x,dur),nf=ctx.createBiquadFilter();nf.type='lowpass';nf.frequency.value=longe?500:900;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,T(x));g.gain.linearRampToValueAtTime(.42*v,T(x)+.18);g.gain.linearRampToValueAtTime(.3*v,T(x)+dur*.6);g.gain.linearRampToValueAtTime(.0001,T(x)+dur);
    const ng=ctx.createGain();ng.gain.value=.5;o.connect(f);f.connect(g);n.connect(nf);nf.connect(ng);ng.connect(g);out(g,master,1,longe?.9:.35);};
  const trombeta=(x,v=1)=>{if(!ok(x))return;const dur=1.7;const o=osc('sawtooth',330,x,dur);o.frequency.linearRampToValueAtTime(560,T(x)+.25);o.frequency.linearRampToValueAtTime(500,T(x)+1.1);o.frequency.linearRampToValueAtTime(380,T(x)+dur);
    const lfo=osc('sine',6.5,x,dur),lg=ctx.createGain();lg.gain.value=14;lfo.connect(lg);lg.connect(o.frequency);
    const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;f.Q.value=2.4;const f2=ctx.createBiquadFilter();f2.type='peaking';f2.frequency.value=2400;f2.gain.value=8;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,T(x));g.gain.linearRampToValueAtTime(.38*v,T(x)+.12);g.gain.setValueAtTime(.36*v,T(x)+1.2);g.gain.linearRampToValueAtTime(.0001,T(x)+dur);
    o.connect(f);f.connect(f2);f2.connect(g);out(g,master,1,.4);};
  const vogal=(x,dur,f0,f1,F1,F2,v=1)=>{if(!ok(x))return;const o=osc('sawtooth',f0,x,dur);o.frequency.exponentialRampToValueAtTime(f1,T(x)+dur*.8);
    const g=ctx.createGain();env(g,x,.02,.3*v,dur);[[F1,6,1],[F2,8,.6]].forEach(([fr,q,a])=>{const b=ctx.createBiquadFilter();b.type='bandpass';b.frequency.value=fr;b.Q.value=q;const gg=ctx.createGain();gg.gain.value=a;o.connect(b);b.connect(gg);gg.connect(g);});out(g,master,1,.2);};
  const macacoSom=(x)=>{vogal(x,.26,420,620,330,800);vogal(x+.36,.26,440,660,330,800);vogal(x+.76,.3,560,900,800,1250);vogal(x+1.16,.34,600,980,800,1250);};
  const boing=(x,v=1)=>{if(!ok(x))return;const o=osc('sine',180,x,.32);o.frequency.exponentialRampToValueAtTime(620,T(x)+.16);o.frequency.exponentialRampToValueAtTime(380,T(x)+.3);const lfo=osc('sine',28,x,.32),lg=ctx.createGain();lg.gain.value=30;lfo.connect(lg);lg.connect(o.frequency);const g=ctx.createGain();env(g,x,.005,.16*v,.26);o.connect(g);out(g,master,1,.15);};
  const respingo=(x,v=1)=>{if(!ok(x))return;const n=ruido(x,.5),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.setValueAtTime(1800,T(x));f.frequency.exponentialRampToValueAtTime(600,T(x)+.4);f.Q.value=.8;env(g,x,.005,.3*v,.38);n.connect(f);f.connect(g);out(g,master,1,.3);
    const R=rng(Math.floor(x*10));for(let i=0;i<6;i++){const xx=x+.08+R()*.5;const o=osc('sine',900+R()*1400,xx,.08);o.frequency.exponentialRampToValueAtTime(1800+R()*1500,T(xx)+.05);const gg=ctx.createGain();env(gg,xx,.002,.06*v,.05);o.connect(gg);out(gg,master,1,.4);}};
  const passaro=(x,v=1,seed=1)=>{const R=rng(seed);const n=2+Math.floor(R()*3);for(let i=0;i<n;i++){const xx=x+i*.13;if(!ok(xx))continue;const f0=2400+R()*1200;const o=osc('sine',f0,xx,.1);o.frequency.exponentialRampToValueAtTime(f0*1.5,T(xx)+.06);o.frequency.exponentialRampToValueAtTime(f0*1.1,T(xx)+.09);const g=ctx.createGain();env(g,xx,.004,.035*v,.07);o.connect(g);out(g,master,1,.5);}};
  const vento=(x0,x1,v=1)=>{const s=Math.max(x0,off);if(s>=x1)return;const n=ctx.createBufferSource();n.buffer=nb;n.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=520;const g=ctx.createGain();g.gain.setValueAtTime(.0001,T(s));g.gain.linearRampToValueAtTime(.035*v,T(s)+1.5);g.gain.setValueAtTime(.035*v,T(x1)-1.5);g.gain.linearRampToValueAtTime(.0001,T(x1));n.connect(f);f.connect(g);g.connect(master);n.start(T(s));n.stop(T(x1)+.1);};
  const folhagem=(x,v=1)=>{if(!ok(x))return;const n=ruido(x,1),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(1200,T(x));f.frequency.linearRampToValueAtTime(3500,T(x)+.5);f.frequency.linearRampToValueAtTime(1500,T(x)+1);
    const lfo=osc('square',18,x,1),lg=ctx.createGain();lg.gain.value=.08*v;g.gain.setValueAtTime(.0001,T(x));g.gain.linearRampToValueAtTime(.12*v,T(x)+.4);g.gain.linearRampToValueAtTime(.0001,T(x)+1);lfo.connect(lg);lg.connect(g.gain);n.connect(f);f.connect(g);out(g,master,1,.2);};
  const mastiga=(x,n=4)=>{for(let i=0;i<n;i++){const xx=x+i*.34;if(!ok(xx))continue;const s=ruido(xx,.06),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='bandpass';f.frequency.value=1400;env(g,xx,.002,.09,.04);s.connect(f);f.connect(g);out(g,master);}};
  const latido2=(x,v=1,agudo=false)=>{if(!ok(x))return;const o=osc('sawtooth',agudo?820:620,x,.18);o.frequency.exponentialRampToValueAtTime(agudo?560:330,T(x)+.14);if(agudo){o.frequency.setValueAtTime(560,T(x)+.14);}const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=agudo?1500:1100;f.Q.value=2.2;const g=ctx.createGain();env(g,x,.006,.32*v,.13);o.connect(f);f.connect(g);out(g,master,1,.15);};
  const marimba=(x,m,v=1)=>{if(!ok(x))return;const f=mtof(m);const g=ctx.createGain();env(g,x,.002,.1*v,.28);[[1,'sine',1],[4,'sine',.18]].forEach(([k,ty,a])=>{const o=osc(ty,f*k,x,.35);const gg=ctx.createGain();gg.gain.value=a;o.connect(gg);gg.connect(g);});out(g,mus,1,.3);};
  const PASSEIO=[['F',[53,57,60,65]],['C',[48,52,55,60]],['Dm',[50,53,57,62]],['Bb',[46,50,53,58]]];
  function passeio(x0,x1,v=.55){for(let x=x0;x<x1-.01;x+=2){const [n,ac]=PASSEIO[Math.floor((x-x0)/2)%4];
      [0,2,1,3,2,3,1,2].forEach((k,i)=>{const xx=x+i*.25;if(xx<x1)marimba(xx,ac[k]+12,v*(i%2?.7:1));});baixo(x,ac[0],.4,v);if(x+1<x1)baixo(x+1,ac[0]+7,.3,v*.8);if(x+1.5<x1)baixo(x+1.5,ac[0],.25,v*.6);
      chocalho(x+.5,.6*v);chocalho(x+1.5,.6*v);}}
  /* ---------- arranjo do episódio 2 ---------- */
  const sc=Object.fromEntries(SCENES.map(s=>[s[0],[s[1],s[2]]]));
  /* abertura (igual em toda a série) */
  tema(0,8,true,true,1);pop(1.0);latido(3.2);latido(3.45);bip(5.0,88);bip(5.12,84);harpa(6.5,.8);brilho(9.5,1.2,10,9);whoosh(8.4,.6);sino(10.4,'C6',1.2,1);vinheta(11.6);folhagem(12);whoosh(15.5,.5);
  /* ambiente da floresta durante o episódio */
  vento(16,sc.final[1]+4,1);{const R=rng(202);for(let x=16.5;x<sc.final[0];x+=1.1+R()*1.6)passaro(x,.8+R()*.4,Math.floor(x*7));}
  /* leito musical do passeio (sem música nas falas dos animais, para os sons aparecerem) */
  passeio(16,sc.descoberta[1],.42);
  /* transições com folhas */
  SCENES.slice(2).forEach(([n,a])=>folhagem(a-.5,.9));
  /* entrada */
  latido(LS.entrada[2]+.05);latido(LS.entrada[2]+.45);harpa(A.entrada.lumi+.1,.9);brilho(A.entrada.lumi+.3,1,10,29);
  /* coelho */
  {const a=sc.coelho[0];[.0,.43,.86].forEach(d=>boing(a+d+.1,.8));for(let x=A.coelho.pula;x<A.coelho.pula+2.2;x+=.556)boing(x+.05,1);
   for(let x=LS.coelho[5]-.1;x<LS.coelho[5]+5.3;x+=.625)boing(x+.05,.9);vinheta(LS.coelho[3]);sino(LS.coelho[1]+.2,88,.4,.6);}
  /* leão */
  {const a=sc.leao[0];rugido(a+.3,.5,true);latido2(a+.5,.5,true);rugido(LS.leao[3],1);vinheta(LS.leao[4]);latido2(LS.leao[5]+.05,1,true);latido(LS.leao[5]+.5);}
  /* macaco */
  {const a=sc.macaco[0];whoosh(a+.3,.6,.6);whoosh(a+1.1,.6,.6);whoosh(a+1.9,.6,.6);bola(a+2.75,.9);macacoSom(LS.macaco[1]);vinheta(LS.macaco[2]);
   for(let x=A.macaco.sobe;x<A.macaco.sobe+1.6;x+=.2)chocalho(x,1.2);pop(A.macaco.sobe+.8);harpa(LS.macaco[3]+.2,.6);}
  /* girafa */
  {const a=sc.girafa[0];[0,.5,1,1.5,2,2.5].forEach((d,i)=>sino(a+d,[60,64,67,72,76,79][i],.4,.6));vinheta(LS.girafa[1]);mastiga(LS.girafa[2]+1.2,7);}
  /* elefante */
  {const a=sc.elefante[0];respingo(a+.4,.7);respingo(a+1.0,.6);respingo(a+1.8,1);trombeta(LS.elefante[3]);respingo(A.elefante.agua,1);latido2(A.elefante.agua+.05,1,true);vinheta(LS.elefante[4]);
   for(let x=A.elefante.agua+1;x<sc.elefante[1]-.3;x+=.75)latido(x,.6);}
  /* descoberta */
  {const a=sc.descoberta[0];[.3,.7,1.1,1.5,1.9].forEach((d,i)=>{pop(a+d+.2);sino(a+d+.2,[72,74,76,79,84][i],.3,.7);});harpa(a,.7);
   boing(LS.descoberta[1]+.1);boing(LS.descoberta[1]+.6);rugido(LS.descoberta[2]+.1,.4);macacoSom(LS.descoberta[3]+.2);sino(LS.descoberta[4]+.1,'G5',.6,.6);trombeta(LS.descoberta[5]+.6,.35);
   vinheta(LS.descoberta[6]);brilho(LS.descoberta[7],1.2,12,7);latido(LS.descoberta[8]+.05);latido(LS.descoberta[8]+.45);}
  /* encerramento: tema completo, alegre e memorável */
  {const a=sc.final[0];tema(a,8,true,true,1);[60,64,67,72].forEach(m=>sino(a+16,m,1.4,.8));baixo(a+16,48,1.2);harpa(A.final.titulo+1.6,.8);}
  /* pausas: tique-taque suave de espera */
  PAUSES.forEach(([p0,p1])=>{for(let x=p0+.2;x<p1-.2;x+=.5)sino(x,(Math.round((x-p0)*2)%2)?'G5':'E5',.12,.35);});
