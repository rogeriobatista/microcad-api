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

// ----------------------------------------------------------------
// Memoria de conversas e estado (zera quando o App Service reinicia)
// ----------------------------------------------------------------
const LIMITE_LOG = 500;
const conversas = []; // { quando, numero, nome, direcao, texto }
const estado = new Map(); // numero -> { ultima, aguardando9, avisar9 }
const JANELA_SAUDACAO_HORAS = 24; // nova conversa depois deste tempo

function registrar(numero, nome, direcao, texto) {
   conversas.push({
      quando: new Date().toISOString(),
      numero,
      nome: nome || '',
      direcao, // 'RECEBIDA' ou 'ENVIADA'
      texto: String(texto || '').substring(0, 2000)
   });
   while (conversas.length > LIMITE_LOG) conversas.shift();
}

// ----------------------------------------------------------------
// AVISO PARA FELIX (opcao 9) - por e-mail, igual ao aviso do ML
// ----------------------------------------------------------------
async function avisarFelix(numero, nome, texto) {
   try {
      if (!WA_MAIL_PASS) {
         console.log('[WHATSAPP][OPCAO 9] WA_MAIL_PASS nao configurada.',
            'Aviso so no log:', numero, nome, '-', texto);
         return;
      }
      const corpo =
`SOLICITACAO PELO WHATSAPP (OPCAO 9 - OUTROS)

Numero: ${numero}
Nome:   ${nome || '(sem nome)'}
Data:   ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

Mensagem do cliente:
${texto}

Responda pelo WhatsApp comercial.`;

      const transporter = nodemailer.createTransport(emailConfig);
      await transporter.sendMail({
         from: `"MICROCAD-Computação Grafica e Sistemas" <${WA_MAIL_USER}>`,
         to: WA_AVISO_EMAIL,
         subject: `WHATSAPP OPCAO 9 - ${numero}${nome ? ' - ' + nome : ''}`,
         text: corpo,
      });
      console.log('[WHATSAPP][OPCAO 9] Aviso enviado para', WA_AVISO_EMAIL);
   } catch (e) {
      console.log('[WHATSAPP] Falha no aviso por e-mail:', e.message);
   }
}

// ----------------------------------------------------------------
// Envio de mensagem de texto pela Cloud API (modulo https, igual
// ao padrao usado nas rotas do Mercado Livre)
// ----------------------------------------------------------------
function waPost(caminho, objeto) {
   const corpo = JSON.stringify(objeto);
   return new Promise((resolve, reject) => {
      const req = https.request({
         hostname: 'graph.facebook.com',
         path: caminho,
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${WA_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(corpo),
         },
      }, (res) => {
         let dados = '';
         res.on('data', (d) => { dados += d; });
         res.on('end', () => {
            let json = {};
            try { json = JSON.parse(dados); } catch (e) { json = { bruto: dados }; }
            resolve({ status: res.statusCode, json });
         });
      });
      req.on('error', reject);
      req.write(corpo);
      req.end();
   });
}

async function enviarTexto(para, texto) {
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
      registrar(para, '', 'ENVIADA', texto);
      return true;
   } catch (e) {
      console.log('[WHATSAPP] Excecao no envio:', e.message);
      return false;
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

function decidirResposta(numero, textoOriginal) {
   const agora = new Date();
   const st = estado.get(numero) || { ultima: null, aguardando9: false };
   const txt = normalizar(textoOriginal);
   const horasDesdeUltima = st.ultima
      ? (agora - st.ultima) / 36e5
      : Infinity;

   let resposta;

   if (/^[1-9]$/.test(txt)) {
      // Opcao do menu
      resposta = TEXTOS.RESPOSTAS[txt];
      st.aguardando9 = (txt === '9');
   } else if (txt === 'menu' || txt === '/menu' || txt === '0') {
      resposta = TEXTOS.SAUDACAO;
      st.aguardando9 = false;
   } else if (/\b(obrigad|valeu|grat[oa]|agradec)/.test(txt)) {
      resposta = TEXTOS.AGRADECIMENTO;
      st.aguardando9 = false;
   } else if (st.aguardando9) {
      // Cliente descreveu a solicitacao da opcao 9
      resposta = TEXTOS.RECEBIDO9;
      st.aguardando9 = false;
      st.avisar9 = true; // sinaliza para disparar o aviso
   } else if (horasDesdeUltima >= JANELA_SAUDACAO_HORAS) {
      // Primeira mensagem (ou conversa antiga): manda o menu
      resposta = TEXTOS.SAUDACAO;
   } else {
      resposta = TEXTOS.PADRAO;
   }

   st.ultima = agora;
   estado.set(numero, st);
   return resposta;
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

               let resposta;
               if (!textoRecebido) {
                  // Conteudo nao-texto: reforca o canal correto
                  resposta = TEXTOS.PADRAO;
                  const st = estado.get(numero) || {};
                  st.ultima = new Date();
                  estado.set(numero, st);
               } else {
                  resposta = decidirResposta(numero, textoRecebido);
               }

               await enviarTexto(numero, resposta);

               // Aviso da opcao 9 (depois de confirmar ao cliente)
               const st = estado.get(numero);
               if (st && st.avisar9) {
                  st.avisar9 = false;
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
      const cor = c.direcao === 'RECEBIDA' ? '#e8f5e9' : '#e3f2fd';
      const quando = c.quando.replace('T', ' ').substring(0, 19);
      const quem = c.direcao === 'RECEBIDA'
         ? `${c.numero} ${c.nome}` : 'ATENDENTE';
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
