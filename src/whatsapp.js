// ================================================================
// ATENDENTE VIRTUAL DO WHATSAPP - MICROCAD (WhatsApp Cloud API)
// Rotas:
//   GET  /api/whatsapp-webhook    -> verificacao do webhook (Meta)
//   POST /api/whatsapp-webhook    -> recebe mensagens e responde
//   GET  /api/whatsapp-conversas  -> painel simples das conversas
//                                    (?chave=microcad2026)
//
// Variaveis de ambiente necessarias (App Service > Environment):
//   WA_TOKEN            -> token de acesso permanente da Cloud API
//   WA_PHONE_NUMBER_ID  -> Phone Number ID do numero (painel da Meta)
//   WA_VERIFY_TOKEN     -> senha de verificacao do webhook
//                          (voce escolhe; ex.: MICROCAD2026TOPO)
//   WA_AVISO_EMAIL      -> (opcional) destino do aviso da opcao 9;
//                          se vazio usa ML_AVISO_EMAIL ou o padrao
//   WA_MAIL_USER        -> conta Gmail que envia o aviso (opcional;
//                          padrao microcad.adm@gmail.com)
//   WA_MAIL_PASS        -> senha de app do Gmail (a mesma usada no
//                          aviso de venda do ML). Sem ela o aviso
//                          sai so no log.
//   WA_IA_KEY           -> chave da API da Anthropic (Claude). Sem ela
//                          a IA fica desligada e vale a resposta padrao.
//   WA_IA_MODEL         -> (opcional) modelo; padrao claude-haiku-4-5
// ================================================================

import { Router } from 'express';
import https from 'https';
import nodemailer from 'nodemailer';
import TEXTOS from './whatsapp-textos';

const router = new Router();

const WA_TOKEN = process.env.WA_TOKEN || '';
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || '';
const WA_VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'MICROCAD2026TOPO';
const PAINEL_CHAVE = 'microcad2026';

// Aviso da opcao 9 - mesmo esquema do aviso de venda do Mercado Livre
const WA_AVISO_EMAIL =
   process.env.WA_AVISO_EMAIL ||
   process.env.ML_AVISO_EMAIL ||
   'microcad@amicrocad.com.br';

const WA_MAIL_USER = process.env.WA_MAIL_USER || 'microcad.adm@gmail.com';
const WA_MAIL_PASS = process.env.WA_MAIL_PASS || '';

const emailConfig = {
   host: 'smtp.gmail.com',
   secure: false,
   port: 587,
   auth: {
      user: WA_MAIL_USER,
      pass: WA_MAIL_PASS
   },
};

// IA (fase 2) - Claude da Anthropic, so para texto livre
const WA_IA_KEY = process.env.WA_IA_KEY || '';
const WA_IA_MODEL = process.env.WA_IA_MODEL || 'claude-haiku-4-5';
const IA_LIMITE_DIA_NUMERO = 20; // respostas da IA por numero, por dia
const IA_HISTORICO = 6;          // ultimas mensagens usadas como contexto
const IA_MAX_TOKENS = 500;       // tamanho maximo da resposta
const IA_MARCA = /\[ENCAMINHAR\]/gi; // a IA usa quando nao tem a informacao
// Se a IA disser que encaminhou mas esquecer a marca, vale o texto
const IA_TEXTO_ENCAMINHOU =
   /\b(encaminhad[ao]s?|encaminhamos|encaminhei|encaminharemos)\b/i;
// E-mail da IA: sai quando o cliente para de escrever por este
// tempo, com a conversa completa (no maximo 1 e-mail por hora)
const AVISO_IA_ESPERA_MIN = Number(process.env.WA_AVISO_ESPERA_MIN) || 10;
const AVISO_IA_INTERVALO_MIN = Number(process.env.WA_AVISO_INTERVALO_MIN) || 60;
const TEXTO_ENCAMINHADO_PADRAO =
   'Sua pergunta foi encaminhada para nossa equipe, que retorna de segunda a sexta, das 9h às 18h.\n\n' +
   'Para ver as opções, digite MENU.';

// ----------------------------------------------------------------
// Memoria de conversas e estado (zera quando o App Service reinicia)
// ----------------------------------------------------------------
const LIMITE_LOG = 500;
const conversas = []; // { quando, numero, nome, direcao, texto, origem }
const estado = new Map(); // numero -> { ultima, aguardandoOutros, avisarOutros }
const JANELA_SAUDACAO_HORAS = 24; // nova conversa depois deste tempo
const historicoIA = new Map(); // numero -> [{ role, content }]
const usoIA = new Map(); // numero -> { dia, qtd }
const processadas = new Set(); // ids de mensagens ja tratadas
const LIMITE_IDS = 1000;
const ultimoAvisoIA = new Map(); // numero -> horario do ultimo e-mail
const avisosPendentes = new Map(); // numero -> e-mail da IA agendado

function registrar(numero, nome, direcao, texto, origem) {
   conversas.push({
      quando: new Date().toISOString(),
      numero,
      nome: nome || '',
      direcao, // 'RECEBIDA', 'ENVIADA' ou 'AVISO' (e-mails, so no painel)
      texto: String(texto || '').substring(0, 2000),
      origem: origem || '' // 'IA' quando a resposta veio da IA
   });
   while (conversas.length > LIMITE_LOG) conversas.shift();
}

// A Meta pode reenviar a mesma mensagem; responde so uma vez
function jaProcessada(id) {
   if (!id) return false;
   if (processadas.has(id)) return true;
   processadas.add(id);
   if (processadas.size > LIMITE_IDS) {
      processadas.delete(processadas.values().next().value);
   }
   return false;
}

// ----------------------------------------------------------------
// AVISOS PARA FELIX por e-mail (mesmo esquema do aviso do ML)
// ----------------------------------------------------------------
function agoraBR() {
   return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Retorna '' quando enviou, ou o motivo da falha
async function enviarEmail(assunto, corpo, rotulo) {
   try {
      if (!WA_MAIL_PASS) {
         console.log(`[WHATSAPP][${rotulo}] WA_MAIL_PASS nao configurada.`,
            'Aviso so no log:', assunto);
         return 'WA_MAIL_PASS nao configurada';
      }
      const transporter = nodemailer.createTransport(emailConfig);
      await transporter.sendMail({
         from: `"MICROCAD-Computação Grafica e Sistemas" <${WA_MAIL_USER}>`,
         to: WA_AVISO_EMAIL,
         subject: assunto,
         text: corpo,
      });
      console.log(`[WHATSAPP][${rotulo}] Aviso enviado para`, WA_AVISO_EMAIL);
      return '';
   } catch (e) {
      console.log('[WHATSAPP] Falha no aviso por e-mail:', e.message);
      return e.message || 'erro desconhecido';
   }
}

// Registra no painel se o e-mail saiu ou falhou
function registrarEmail(numero, nome, falha) {
   registrar(numero, nome, 'AVISO', falha
      ? `FALHA NO E-MAIL para a equipe: ${falha}`
      : `E-mail enviado para a equipe (${WA_AVISO_EMAIL}).`);
}

// Opcao 11 - cliente deixou mensagem
async function avisarFelix(numero, nome, texto) {
   const corpo =
`SOLICITACAO PELO WHATSAPP (OPCAO 11 - OUTROS ASSUNTOS)

Numero: ${numero}
Nome:   ${nome || '(sem nome)'}
Data:   ${agoraBR()}
Abrir conversa: https://wa.me/${numero}

Mensagem do cliente:
${texto}

Responda pelo WhatsApp comercial.`;
   const falha = await enviarEmail(
      `WHATSAPP OUTROS ASSUNTOS - ${numero}${nome ? ' - ' + nome : ''}`,
      corpo, 'OUTROS');
   registrarEmail(numero, nome, falha);
}

// Resume textos fixos (menu e opcoes) para o e-mail ficar curto
function resumirTexto(texto) {
   const t = String(texto || '');
   if (t === TEXTOS.SAUDACAO) return '(menu de opções)';
   const opcao = Object.keys(TEXTOS.RESPOSTAS)
      .find((k) => t.startsWith(TEXTOS.RESPOSTAS[k]));
   if (opcao) return `(resposta da opção ${opcao})`;
   return t.length > 600 ? t.substring(0, 600) + '...' : t;
}

// Ultimas mensagens da conversa com um numero (para o e-mail)
function historicoTexto(numero, qtd) {
   return conversas
      .filter((c) => c.numero === numero && c.direcao !== 'AVISO')
      .slice(-qtd)
      .map((c) => {
         const hora = new Date(c.quando).toLocaleTimeString('pt-BR',
            { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
         const quem = c.direcao === 'RECEBIDA'
            ? 'CLIENTE' : (c.origem === 'IA' ? 'ATENDENTE (IA)' : 'ATENDENTE');
         return `[${hora}] ${quem}: ${c.direcao === 'RECEBIDA' ? c.texto : resumirTexto(c.texto)}`;
      })
      .join('\n\n');
}

// IA nao resolveu (sem a informacao na base, ou falhou).
// O e-mail nao sai na hora: espera o cliente parar de escrever por
// AVISO_IA_ESPERA_MIN para levar a conversa completa. No maximo 1
// e-mail por cliente a cada AVISO_IA_INTERVALO_MIN (o que vier depois
// entra no proximo e-mail, nada se perde).
function avisarIANaoResolveu(numero, nome, pergunta, motivo) {
   let p = avisosPendentes.get(numero);
   if (!p) {
      p = { nome: '', perguntas: [], motivos: [], timer: null };
      avisosPendentes.set(numero, p);
      registrar(numero, nome, 'AVISO',
         `E-mail para a equipe agendado: sai ${AVISO_IA_ESPERA_MIN} min ` +
         'depois da ultima mensagem do cliente.');
   }
   if (nome) p.nome = nome;
   if (pergunta && !p.perguntas.includes(pergunta)) p.perguntas.push(pergunta);
   if (!p.motivos.includes(motivo)) p.motivos.push(motivo);
   reprogramarAvisoIA(numero);
}

// Chamada a cada mensagem do cliente: adia o e-mail agendado
function reprogramarAvisoIA(numero) {
   const p = avisosPendentes.get(numero);
   if (!p) return;
   if (p.timer) clearTimeout(p.timer);
   const agora = Date.now();
   const liberado = (ultimoAvisoIA.get(numero) || 0) + AVISO_IA_INTERVALO_MIN * 60000;
   const quando = Math.max(agora + AVISO_IA_ESPERA_MIN * 60000, liberado);
   p.timer = setTimeout(() => {
      enviarAvisoIA(numero).catch((e) =>
         console.log('[WHATSAPP][IA-AVISO] Erro:', e.message));
   }, quando - agora);
}

async function enviarAvisoIA(numero) {
   const p = avisosPendentes.get(numero);
   if (!p) return;
   avisosPendentes.delete(numero);
   const agora = Date.now();
   ultimoAvisoIA.set(numero, agora);
   if (ultimoAvisoIA.size > 500) { // limpa avisos antigos
      for (const [n, t] of ultimoAvisoIA) {
         if (agora - t >= AVISO_IA_INTERVALO_MIN * 60000) ultimoAvisoIA.delete(n);
      }
   }

   const corpo =
`A IA NAO RESOLVEU UMA PERGUNTA NO WHATSAPP

Motivo: ${p.motivos.join('; ')}

Numero: ${numero}
Nome:   ${p.nome || '(sem nome)'}
Data:   ${agoraBR()}
Abrir conversa: https://wa.me/${numero}

Pergunta(s) encaminhada(s) pela IA:
${p.perguntas.map((q) => '- ' + q).join('\n')}

Conversa (ultimas mensagens):

${historicoTexto(numero, 20)}

O cliente foi informado de que a equipe retorna de segunda a sexta, das 9h as 18h.`;
   const falha = await enviarEmail(
      `WHATSAPP - IA NAO RESOLVEU - ${numero}${p.nome ? ' - ' + p.nome : ''}`,
      corpo, 'IA-AVISO');
   registrarEmail(numero, p.nome, falha);
}

// ----------------------------------------------------------------
// POST JSON generico (modulo https, igual ao padrao usado nas rotas
// do Mercado Livre)
// ----------------------------------------------------------------
function postJson(hostname, caminho, cabecalhos, objeto) {
   const corpo = JSON.stringify(objeto);
   return new Promise((resolve, reject) => {
      const req = https.request({
         hostname,
         path: caminho,
         method: 'POST',
         timeout: 25000,
         headers: Object.assign({
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(corpo),
         }, cabecalhos),
      }, (res) => {
         let dados = '';
         res.on('data', (d) => { dados += d; });
         res.on('end', () => {
            let json = {};
            try { json = JSON.parse(dados); } catch (e) { json = { bruto: dados }; }
            resolve({ status: res.statusCode, json });
         });
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.write(corpo);
      req.end();
   });
}

// Envio pela Cloud API do WhatsApp
function waPost(caminho, objeto) {
   return postJson('graph.facebook.com', caminho,
      { 'Authorization': `Bearer ${WA_TOKEN}` }, objeto);
}

async function enviarTexto(para, texto, origem) {
   if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
      console.log('[WHATSAPP] WA_TOKEN/WA_PHONE_NUMBER_ID nao configurados.');
      return false;
   }
   try {
      const r = await waPost(`/v23.0/${WA_PHONE_NUMBER_ID}/messages`, {
         messaging_product: 'whatsapp',
         to: para,
         type: 'text',
         text: { body: texto, preview_url: false }
      });
      if (r.status < 200 || r.status >= 300) {
         console.log('[WHATSAPP] Erro no envio:', JSON.stringify(r.json));
         return false;
      }
      registrar(para, '', 'ENVIADA', texto, origem);
      return true;
   } catch (e) {
      console.log('[WHATSAPP] Excecao no envio:', e.message);
      return false;
   }
}

// ----------------------------------------------------------------
// IA - responde texto livre com base SOMENTE nos textos oficiais
// (whatsapp-textos.js). Retorna { status, resposta }:
//   ok         - IA respondeu
//   encaminhar - IA nao tinha a informacao (marca [ENCAMINHAR])
//   erro       - falha na chamada da IA
//   desligada  - sem chave configurada
//   limite     - limite diario do numero atingido
// ----------------------------------------------------------------
function textoEncaminhado() {
   return TEXTOS.ENCAMINHADO || TEXTO_ENCAMINHADO_PADRAO;
}

function montarSistemaIA() {
   const opcoes = Object.keys(TEXTOS.RESPOSTAS)
      .map((k) => `OPÇÃO ${k}:\n${TEXTOS.RESPOSTAS[k]}`)
      .join('\n\n');
   return `${TEXTOS.IA_REGRAS}\n\n` +
      `===== BASE =====\n\n${TEXTOS.IA_SOBRE}\n\n` +
      `MENU DO ATENDIMENTO:\n${TEXTOS.SAUDACAO}\n\n${opcoes}`;
}
const SISTEMA_IA = montarSistemaIA();

async function responderIA(numero, texto) {
   if (!WA_IA_KEY) return { status: 'desligada', resposta: null };

   // Limite diario por numero (protege contra abuso e custo)
   const hoje = new Date().toISOString().substring(0, 10);
   const uso = usoIA.get(numero) || { dia: hoje, qtd: 0 };
   if (uso.dia !== hoje) { uso.dia = hoje; uso.qtd = 0; }
   if (uso.qtd >= IA_LIMITE_DIA_NUMERO) {
      console.log('[WHATSAPP][IA] Limite diario atingido:', numero);
      return { status: 'limite', resposta: null };
   }
   uso.qtd += 1;
   usoIA.set(numero, uso);

   const mensagens = (historicoIA.get(numero) || [])
      .concat([{ role: 'user', content: String(texto).substring(0, 1500) }]);

   try {
      const r = await postJson('api.anthropic.com', '/v1/messages', {
         'x-api-key': WA_IA_KEY,
         'anthropic-version': '2023-06-01',
      }, {
         model: WA_IA_MODEL,
         max_tokens: IA_MAX_TOKENS,
         system: [{ type: 'text', text: SISTEMA_IA, cache_control: { type: 'ephemeral' } }],
         messages: mensagens,
      });
      if (r.status < 200 || r.status >= 300) {
         console.log('[WHATSAPP][IA] Erro:', r.status, JSON.stringify(r.json).substring(0, 300));
         return { status: 'erro', resposta: null };
      }
      const bruta = ((r.json && r.json.content) || [])
         .filter((c) => c.type === 'text')
         .map((c) => c.text)
         .join('\n')
         .trim();
      if (!bruta) return { status: 'erro', resposta: null };

      // A IA marca [ENCAMINHAR] quando a base nao tem a informacao
      // (vale tambem quando ela diz que encaminhou e esquece a marca)
      const encaminhar = /\[ENCAMINHAR\]/i.test(bruta) || IA_TEXTO_ENCAMINHOU.test(bruta);
      let resposta = bruta.replace(IA_MARCA, '').trim();
      if (encaminhar && !resposta) resposta = textoEncaminhado();

      // Guarda historico curto (sempre comecando por 'user')
      const novo = mensagens
         .concat([{ role: 'assistant', content: resposta }])
         .slice(-IA_HISTORICO);
      while (novo.length && novo[0].role !== 'user') novo.shift();
      historicoIA.set(numero, novo);

      const u = (r.json && r.json.usage) || {};
      console.log('[WHATSAPP][IA]', encaminhar ? 'ENCAMINHAR' : 'OK', numero,
         'tokens in/out:', u.input_tokens, '/', u.output_tokens);
      return {
         status: encaminhar ? 'encaminhar' : 'ok',
         resposta: resposta.substring(0, 3500),
      };
   } catch (e) {
      console.log('[WHATSAPP][IA] Excecao:', e.message);
      return { status: 'erro', resposta: null };
   }
}

// ----------------------------------------------------------------
// Decide a resposta para uma mensagem recebida
// ----------------------------------------------------------------
function normalizar(txt) {
   return String(txt || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, ''); // remove acentos
}

// Palavras-chave (sem IA): texto livre que leva direto a uma opcao
// do menu. Avaliadas em ordem - a primeira que casar vence.
const PALAVRAS_CHAVE = [
   { re: /\b(atualizar|atualizacao|atualizacoes)\b/, opcao: '5' },
   { re: /\b(video|videos|videoaula|videoaulas|aula|aulas|curso|cursos|treinamento|treinamentos)\b/, opcao: '9' },
   { re: /\b(compativel|compatibilidade|autocad|bricscad|gstarcad|zwcad)\b/, opcao: '7' },
   { re: /\b(testar|teste|demonstracao|demo|baixar|download|instalar)\b/, opcao: '6' },
   { re: /\b(preco|precos|valor|valores|comprar|compra|custa|custo)\b/, opcao: '1' },
   { re: /\b(erro|erros|problema|problemas|suporte|travando|travou)\b/, opcao: '2' },
   { re: /\b(telefone|contato|contatos|falar|atendente|humano|ligar)\b/, opcao: '10' },
];

// Mensagem que e so cumprimento (um ou varios) -> manda o menu
const SO_CUMPRIMENTO = /^((oi+|ola|opa|alo|e ai|eai|bom dia|boa tarde|boa noite|tudo bem|td bem|tudo bom)[\s!,.?]*)+$/;

// Dica acrescentada quando a 1a mensagem ja recebe uma resposta direta
const DICA_MENU = 'Para ver todas as opções, digite MENU.';
function comDicaMenu(texto) {
   return /digite MENU/i.test(texto) ? texto : `${texto}\n\n${DICA_MENU}`;
}

// Retorna { resposta, ia }. ia = true quando o texto nao casou com
// nada: o webhook tenta a IA e, se ela nao responder, usa 'resposta'
// (a resposta padrao).
function decidirResposta(numero, textoOriginal) {
   const agora = new Date();
   const st = estado.get(numero) || { ultima: null, aguardandoOutros: false };
   const txt = normalizar(textoOriginal);
   const horasDesdeUltima = st.ultima
      ? (agora - st.ultima) / 36e5
      : Infinity;

   let resposta;
   let ia = false;

   // Conversa nova (1a mensagem ou mais de 24h sem conversa):
   // esquece o contexto antigo da IA e a espera da opcao 11
   const conversaNova = horasDesdeUltima >= JANELA_SAUDACAO_HORAS;
   if (conversaNova) {
      historicoIA.delete(numero);
      st.aguardandoOutros = false;
   }

   if (/^(?:[1-9]|1[01])$/.test(txt)) {
      // Opcao do menu (1 a 11)
      resposta = TEXTOS.RESPOSTAS[txt];
      st.aguardandoOutros = (txt === '11');
   } else if (txt === 'menu' || txt === '/menu' || txt === '0') {
      resposta = TEXTOS.SAUDACAO;
      st.aguardandoOutros = false;
   } else if (/\b(obrigad|valeu|grat[oa]|agradec)/.test(txt)) {
      resposta = TEXTOS.AGRADECIMENTO;
      st.aguardandoOutros = false;
   } else if (st.aguardandoOutros) {
      // Cliente descreveu a solicitacao da opcao 11
      resposta = TEXTOS.RECEBIDO_OUTROS;
      st.aguardandoOutros = false;
      st.avisarOutros = true; // sinaliza para disparar o aviso
   } else if (SO_CUMPRIMENTO.test(txt)) {
      // So cumprimento: manda o menu
      resposta = TEXTOS.SAUDACAO;
   } else {
      // Pergunta: tenta palavras-chave; se nada casar, a IA tenta
      // responder. Na conversa nova, a resposta direta leva a dica do
      // MENU e, se a IA nao responder, vai o menu (nao o "nao
      // identifiquei").
      const chave = PALAVRAS_CHAVE.find((p) => p.re.test(txt));
      if (chave) {
         resposta = TEXTOS.RESPOSTAS[chave.opcao];
         if (conversaNova) resposta = comDicaMenu(resposta);
      } else {
         resposta = conversaNova ? TEXTOS.SAUDACAO : TEXTOS.PADRAO;
         ia = true;
      }
   }

   st.ultima = agora;
   estado.set(numero, st);
   return { resposta, ia };
}

// ----------------------------------------------------------------
// GET /api/whatsapp-webhook - verificacao exigida pela Meta
// ----------------------------------------------------------------
router.get('/api/whatsapp-webhook', (req, res) => {
   const modo = req.query['hub.mode'];
   const token = req.query['hub.verify_token'];
   const desafio = req.query['hub.challenge'];
   if (modo === 'subscribe' && token === WA_VERIFY_TOKEN) {
      console.log('[WHATSAPP] Webhook verificado pela Meta.');
      return res.status(200).send(desafio);
   }
   return res.sendStatus(403);
});

// ----------------------------------------------------------------
// POST /api/whatsapp-webhook - mensagens e status
// (o express.json() global do app.js ja faz o parse do body)
// ----------------------------------------------------------------
router.post('/api/whatsapp-webhook', async (req, res) => {
   // Responde 200 imediatamente (a Meta reenvia se nao receber 2xx)
   res.sendStatus(200);

   try {
      const entradas = (req.body && req.body.entry) || [];
      for (const entrada of entradas) {
         for (const mudanca of (entrada.changes || [])) {
            const valor = mudanca.value || {};

            // Status de entrega (sent/delivered/read/failed): so loga falhas
            for (const stt of (valor.statuses || [])) {
               if (stt.status === 'failed') {
                  console.log('[WHATSAPP] Entrega FALHOU:',
                     JSON.stringify(stt.errors || stt));
               }
            }

            // Mensagens recebidas
            const contatos = valor.contacts || [];
            for (const msg of (valor.messages || [])) {
               if (jaProcessada(msg.id)) continue;
               const numero = msg.from;
               const nome =
                  (contatos[0] && contatos[0].profile && contatos[0].profile.name) || '';

               let textoRecebido = '';
               if (msg.type === 'text') {
                  textoRecebido = (msg.text && msg.text.body) || '';
               } else if (msg.type === 'interactive') {
                  const it = msg.interactive || {};
                  textoRecebido =
                     (it.button_reply && it.button_reply.title) ||
                     (it.list_reply && it.list_reply.title) || '';
               } else {
                  // audio, imagem, chamada, figurinha etc.
                  textoRecebido = '';
               }

               registrar(numero, nome, 'RECEBIDA',
                  textoRecebido || `[${msg.type}]`);
               // Cliente ainda escrevendo: adia o e-mail agendado
               reprogramarAvisoIA(numero);

               let resposta;
               let origem = '';
               let motivoAviso = ''; // preenchido quando a IA nao resolveu
               if (!textoRecebido) {
                  // Conteudo nao-texto: reforca o canal correto
                  resposta = TEXTOS.PADRAO;
                  const st = estado.get(numero) || {};
                  st.ultima = new Date();
                  estado.set(numero, st);
               } else {
                  const decisao = decidirResposta(numero, textoRecebido);
                  resposta = decisao.resposta;
                  if (decisao.ia) {
                     const ia = await responderIA(numero, textoRecebido);
                     if (ia.status === 'ok') {
                        resposta = ia.resposta;
                        origem = 'IA';
                     } else if (ia.status === 'encaminhar') {
                        resposta = ia.resposta;
                        origem = 'IA';
                        motivoAviso = 'a base de informacoes nao tem a resposta';
                     } else if (ia.status === 'erro') {
                        resposta = textoEncaminhado();
                        motivoAviso = 'falha na IA (erro ou fora do ar)';
                     }
                     // desligada / limite: fica a resposta padrao (menu)
                  }
               }

               await enviarTexto(numero, resposta, origem);

               // IA nao resolveu: agenda o e-mail para a equipe
               if (motivoAviso) {
                  avisarIANaoResolveu(numero, nome, textoRecebido, motivoAviso);
               }

               // Aviso da opcao 11 (depois de confirmar ao cliente)
               const st = estado.get(numero);
               if (st && st.avisarOutros) {
                  st.avisarOutros = false;
                  estado.set(numero, st);
                  await avisarFelix(numero, nome, textoRecebido);
               }
            }
         }
      }
   } catch (e) {
      console.log('[WHATSAPP] Erro no webhook:', e.message);
   }
});

// ----------------------------------------------------------------
// GET /api/whatsapp-conversas?chave=microcad2026 - painel simples
// ----------------------------------------------------------------
router.get('/api/whatsapp-conversas', (req, res) => {
   if (req.query.chave !== PAINEL_CHAVE) return res.sendStatus(403);

   const linhas = conversas.slice().reverse().map(c => {
      const ehIA = c.origem === 'IA';
      const ehAviso = c.direcao === 'AVISO';
      const cor = ehAviso ? '#eeeeee' : (c.direcao === 'RECEBIDA'
         ? '#e8f5e9' : (ehIA ? '#fff3e0' : '#e3f2fd'));
      const quando = new Date(c.quando).toLocaleString('pt-BR',
         { timeZone: 'America/Sao_Paulo' });
      const quem = ehAviso ? `SISTEMA (${c.numero})` : (c.direcao === 'RECEBIDA'
         ? `${c.numero} ${c.nome}` : (ehIA ? 'ATENDENTE (IA)' : 'ATENDENTE'));
      const texto = String(c.texto)
         .replace(/&/g, '&amp;').replace(/</g, '&lt;')
         .replace(/\n/g, '<br>');
      return `<div style="background:${cor};margin:6px 0;padding:8px;` +
         `border-radius:8px;font-family:Arial;font-size:14px">` +
         `<b>${quem}</b> <small>${quando}</small><br>${texto}</div>`;
   }).join('');

   res.send(
      `<html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>WHATSAPP MICROCAD - CONVERSAS</title></head>` +
      `<body style="max-width:700px;margin:auto;padding:10px;` +
      `background:#fafafa">` +
      `<h3 style="font-family:Arial">WHATSAPP MICROCAD - ` +
      `ULTIMAS MENSAGENS (${conversas.length})</h3>` +
      `<p style="font-family:Arial;font-size:13px;color:#666">Horário de Brasília. ` +
      `Em cinza: avisos do sistema (e-mails para a equipe).</p>` +
      (linhas || '<p style="font-family:Arial">Nenhuma mensagem ainda.</p>') +
      `</body></html>`
   );
});

// ----------------------------------------------------------------
// GET /privacidade - politica de privacidade do atendimento
// (URL exigida pela Meta para publicar o app)
// ----------------------------------------------------------------
router.get('/privacidade', (req, res) => {
   res.send(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>Política de Privacidade - MICROCAD</title></head>` +
      `<body style="max-width:760px;margin:auto;padding:24px;font-family:Arial;line-height:1.5;color:#222">` +
      `<h1>Política de Privacidade</h1>` +
      `<h2>MICROCAD ATENDIMENTO - WhatsApp</h2>` +
      `<p><b>Controladora:</b> MICROCAD COMPUTACAO GRAFICA LTDA, CNPJ 01.662.825/0001-34, ` +
      `Rua da Conceição 101, Loja 19, Centro, Niterói/RJ, CEP 24020-085.</p>` +
      `<p><b>Dados coletados:</b> ao enviar mensagem ao nosso número comercial de WhatsApp, ` +
      `recebemos seu número de telefone, o nome do seu perfil no WhatsApp e o conteúdo das mensagens.</p>` +
      `<p><b>Finalidade:</b> os dados são usados exclusivamente para responder ao seu contato ` +
      `(atendimento comercial e orientações sobre os produtos MICROCAD, como o TOPOCAD2000) ` +
      `e para encaminhamento interno de solicitações.</p>` +
      `<p><b>Armazenamento:</b> as mensagens recentes ficam registradas temporariamente nos nossos ` +
      `servidores apenas para a operação do atendimento. Não vendemos nem compartilhamos seus dados ` +
      `com terceiros. O transporte das mensagens é feito pela plataforma WhatsApp (Meta), sujeita à ` +
      `política de privacidade própria da Meta.</p>` +
      `<p><b>Seus direitos (LGPD):</b> você pode solicitar acesso, correção ou exclusão dos seus ` +
      `dados a qualquer momento pelo e-mail <a href="mailto:contato@topocad2000.com.br">contato@topocad2000.com.br</a>.</p>` +
      `<p><b>Contato:</b> contato@topocad2000.com.br</p>` +
      `<p><small>Última atualização: outubro de 2026.</small></p>` +
      `</body></html>`
   );
});

export default router;
