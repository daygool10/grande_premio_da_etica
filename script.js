let duplas = [];
let respostas = 0;
let perguntaAtual = null;

// Banco de perguntas (30 estudos de caso)
let perguntas = [
  {
    caso: "Equipe ordena que o segundo piloto deixe o primeiro ultrapassar.",
    opcoes: ["Obedecer sem questionar","Recusar e manter posição","Discutir após a corrida","Aceitar e pedir revisão futura"],
    correta: 3,
    efeitos: ["-2 casas","Perde próxima rodada","+2 casas","+3 casas"]
  },
  {
    caso: "Piloto ignora bandeira azul e atrapalha adversário.",
    opcoes: ["Continuar bloqueando","Respeitar bandeira imediatamente","Esperar instrução da equipe","Reduzir velocidade sem avisar"],
    correta: 1,
    efeitos: ["Volta ao início","+2 casas","-1 casa","Perde próxima rodada"]
  },
  // ... continue até 30 perguntas
];

function escolherModo(){ 
  document.getElementById("inicio").style.display="none"; 
  document.getElementById("modo").style.display="block"; 
}

function entrarAdm(){ 
  document.getElementById("modo").style.display="none"; 
  document.getElementById("adm").style.display="block"; 
  montarTabuleiro(); 
}

function entrarJogador(){ 
  document.getElementById("modo").style.display="none"; 
  document.getElementById("jogador").style.display="block"; 
}

function entrarNoJogo(){
  let nome = document.getElementById("nomeDupla").value;
  let equipe = document.getElementById("equipe").value;

  // Verifica se a equipe já foi escolhida
  let equipeJaEscolhida = duplas.some(d => d.equipe === equipe);
  if(equipeJaEscolhida){
    alert("Essa equipe já foi escolhida por outra dupla. Selecione outra equipe!");
    return; // não deixa cadastrar
  }

  duplas.push({nome,equipe,posicao:0,resposta:null});
  document.getElementById("duplasConectadas").innerText = duplas.length;
  document.getElementById("jogador").style.display="none";
  mostrarPergunta();
}


function montarTabuleiro(){
  let tab = document.getElementById("tabuleiro");
  tab.innerHTML="";
  for(let i=0;i<10;i++){ // 10 casas
    let casa = document.createElement("div");
    casa.className="casa";
    casa.innerText=i+1;
    duplas.forEach(d=>{
      if(d.posicao===i){
        let carro = document.createElement("div");
        carro.innerText="🏎️ "+d.equipe+" ("+d.nome+")";
        carro.style.fontSize="12px";
        casa.appendChild(carro);
      }
    });
    tab.appendChild(casa);
  }
}

function mostrarPergunta(){
  perguntaAtual = perguntas[Math.floor(Math.random()*perguntas.length)];
  document.getElementById("caso").innerText = perguntaAtual.caso;
  let opcoesDiv = document.getElementById("opcoes");
  opcoesDiv.innerHTML="";
  perguntaAtual.opcoes.forEach((op,idx)=>{
    let btn = document.createElement("button");
    btn.className="btn";
    btn.innerText=op;
    btn.onclick=()=>{ 
      duplas[duplas.length-1].resposta=idx; 
      respostas++; 
      document.getElementById("respostasRecebidas").innerText=respostas; 
      if(respostas===duplas.length){ 
        document.getElementById("revelarAdm").style.display="block"; 
      } 
    };
    opcoesDiv.appendChild(btn);
  });
  document.getElementById("perguntas").style.display="block";
}

document.getElementById("revelarAdm").onclick=function(){
  duplas.forEach(d=>{
    if(d.resposta===perguntaAtual.correta){
      alert(d.nome+" ("+d.equipe+"): Resposta correta! Avance "+perguntaAtual.efeitos[d.resposta]);
      let casas=parseInt(perguntaAtual.efeitos[d.resposta])||0;
      d.posicao=Math.min(9,d.posicao+casas);
    } else {
      alert(d.nome+" ("+d.equipe+"): Resposta errada! Penalidade: "+perguntaAtual.efeitos[d.resposta]);
      let efeito=perguntaAtual.efeitos[d.resposta];
      if(efeito.includes("-")) d.posicao=Math.max(0,d.posicao+parseInt(efeito));
      if(efeito.includes("Volta ao início")) d.posicao=0;
    }
  });
  montarTabuleiro();
  this.style.display="none";
  respostas=0;
  document.getElementById("respostasRecebidas").innerText=0;
  mostrarPergunta();
}
