///////////////////////////////////////////////////////////////////////////////////////////

import { Op, col, QueryTypes } from 'sequelize';

import jwt from "jsonwebtoken";

import nodemailer from "nodemailer"

import TBLDadosdat from '../models/TBLDadosdat';
import TBLDadosdatmail from '../models/TBLDadosdatmail';
import TBLDadosdth from '../models/TBLDadosdth';
import TBLDadosins from '../models/TBLDadosins';
import TBLDadosins000 from '../models/TBLDadosins000';
import TBLDadostxt from '../models/TBLDadostxt';
import TBLAtualiza from '../models/TBLAtualiza';
import TBLNaoreg from '../models/TBLNaoreg';
import TBLRegistro from '../models/TBLRegistro';
import TBLRegistronet from '../models/TBLRegistronet';
import TBLXemail from '../models/TBLXemail';
import TBLXexe from '../models/TBLXexe';
import TBXimovel from '../models/TBXimovel';
import TBXproprieta from '../models/TBXproprieta';
import TBXresptec from '../models/TBXresptec';

const emailConfig = {
   host: 'smtp.gmail.com',
   secure: false,
   port: 587,
   auth: {
      user: 'microcad.adm@gmail.com',
      pass: 'wbrqvrrcmabjfeoy'
   },
};

const WIX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3oGVOgcYuK2RfY6OKUBT
yu37dqNJyyhs/jWX6N/89dFLmXMCtqv9hTCOOYXG9MFHCtmqmS6zR6nM/Eh683fx
dCe/nAOYwchOQg2gu++vb729lH/9dYhVR7b1kDXM/Q199leAXhznshlr7g9RKTRq
ms3pY3klzVdBhmyfhShpqVKUQYtsYPs1FIPx/ErHjC49qwcLyjl1/PewNX9WWrjw
z5G0e5qhZ2opHeh4JBhxmKQ2R/53GNf/Pp6indTQ+KqhCuOJX3m1iaOcDElDBMpD
DCKC4BCrK5mJllE4sxGx2XWhPOrwpjqo77nLxJQBwT7p7rVdxciyxO/G92rFVXEY
dwIDAQAB
-----END PUBLIC KEY-----`;

// ===================== MERCADO LIVRE - FASE 1 =====================
import https from 'https';

const ML_CLIENT_ID     = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const ML_REDIRECT_URI  = process.env.ML_REDIRECT_URI;
const ML_AVISO_EMAIL   = process.env.ML_AVISO_EMAIL || 'microcad@amicrocad.com.br';

// De qual anuncio veio a venda (so para dar nome no e-mail).
// Anuncio fora desta lista continua avisando normalmente.
const ML_ANUNCIOS = {
   'MLB6549170934': 'TOPOCAD2000',
   'MLB4587279529': 'MEMORIALCAD',
};

const ML_PROGRAMAS = {
   'MLB6549170934': 'TOPOCAD',
   'MLB4587279529': 'MEMORIAL',
};
const ML_CGC_CURINGA   = '99999999999';
const ML_EMAIL_CURINGA = 'contato@topocad2000.com.br';

let mlAccessToken  = null;
let mlTokenExpira  = 0;
let mlRefreshToken = process.env.ML_REFRESH_TOKEN || null;

// evita e-mail repetido quando o ML reenvia a mesma notificacao
const mlAvisados = new Set();

const mlHttp = (opcoes, corpo) => new Promise((resolve, reject) => {
   const req = https.request(opcoes, (resp) => {
      let dados = '';
      resp.on('data', (p) => { dados += p; });
      resp.on('end', () => {
         try { resolve(JSON.parse(dados || '{}')); }
         catch (e) { reject(new Error('Resposta invalida do ML: ' + dados)); }
      });
   });
   req.on('error', reject);
   if (corpo) req.write(corpo);
   req.end();
});

const mlPost = (caminho, params) => {
   const corpo = new URLSearchParams(params).toString();
   return mlHttp({
      hostname: 'api.mercadolibre.com',
      path: caminho,
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Content-Length': Buffer.byteLength(corpo),
         'Accept': 'application/json',
      },
   }, corpo);
};

const mlToken = async () => {
   if (mlAccessToken && Date.now() < mlTokenExpira) return mlAccessToken;
   if (!mlRefreshToken) throw new Error('ML sem refresh token. Refaca a autorizacao.');

   const r = await mlPost('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: mlRefreshToken,
   });

   if (!r.access_token) throw new Error('Falha ao renovar token ML: ' + JSON.stringify(r));

   mlAccessToken = r.access_token;
   mlTokenExpira = Date.now() + ((r.expires_in || 21600) - 300) * 1000;
   if (r.refresh_token) {
      mlRefreshToken = r.refresh_token;
      console.log('ML NOVO REFRESH TOKEN >>>', mlRefreshToken);
   }
   return mlAccessToken;
};

const mlGet = async (caminho, extras) => {
   const token = await mlToken();
   return mlHttp({
      hostname: 'api.mercadolibre.com',
      path: caminho,
      method: 'GET',
      headers: Object.assign({ Authorization: `Bearer ${token}`, Accept: 'application/json' }, extras || {}),
   });
};

const mlFaturamento = async (pedidoId) => {
   try {
      const bi  = await mlGet(`/orders/${pedidoId}/billing_info`, { 'x-version': '2' });
      const b   = (bi && bi.buyer && bi.buyer.billing_info) || {};
      const doc = b.identification || {};
      const end = b.address || {};

      const nome = `${b.first_name || b.name || ''} ${b.last_name || ''}`.trim();
      const cgc  = String(doc.number || '').replace(/\D/g, '');
      const tipo = String(doc.type || '').toUpperCase() === 'CNPJ' ? 'B' : 'A';

      const cidade = end.city && typeof end.city === 'object' ? String(end.city.name || '') : String(end.city || '');
      const estado = end.state && typeof end.state === 'object' ? String(end.state.id || '') : String(end.state || '');
      const uf     = estado.indexOf('-') >= 0 ? estado.split('-').pop() : estado;
      const cep    = end.zip_code && typeof end.zip_code === 'object' ? String(end.zip_code.id || '') : String(end.zip_code || '').trim();

      return {
         nome,
         cgc,
         tipo,
         cidade,
         uf,
         cep,
         doc: `${nome} - ${doc.type || ''} ${doc.number || ''}`.trim(),
      };
   } catch (e) {
      console.log('ML billing_info falhou:', e.message);
      return null;
   }
};

const mlAvisaVenda = async (pedido, lic) => {
      const itens = (pedido.order_items || []).map((it) => {
      const id    = it.item?.id || '?';
      const nome  = ML_ANUNCIOS[id] || '(anuncio nao mapeado)';
      const titulo = it.item?.title || '';
      const qtd   = it.quantity || 1;
      const preco = it.unit_price || 0;
      return `   ${nome} | ${titulo}\n   Anuncio: ${id} | Qtd: ${qtd} | Unit: R$ ${preco}`;
   }).join('\n\n');

   const fat = await mlFaturamento(pedido.id);
   const compradorDoc = fat && fat.doc ? fat.doc : '(nao disponivel)';

   const texto =
`VENDA NO MERCADO LIVRE

Pedido: ${pedido.id}
Data:   ${pedido.date_created || ''}
Status: ${pedido.status} / pagamento: ${pedido.status_detail || ''}
Total:  R$ ${pedido.total_amount || 0}   Pago: R$ ${pedido.paid_amount || 0}

Comprador: ${pedido.buyer?.nickname || ''} (id ${pedido.buyer?.id || ''})
Documento: ${compradorDoc}

Itens:
${itens}

Serial: ${lic ? `${lic.nserie} ${lic.versao} (${lic.programa}) - enviado ao comprador pelo ML` : 'NAO GERADO - trate manualmente'}`;

   const transporter = nodemailer.createTransport(emailConfig);
   await transporter.sendMail({
      from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
      to: ML_AVISO_EMAIL,
      subject: `VENDA ML - pedido ${pedido.id} - ${pedido.status}`,
      text: texto,
   });
   console.log('ML aviso enviado do pedido', pedido.id);
};

const mlPostAuth = async (caminho, objeto) => {
   const token = await mlToken();
   const corpo = JSON.stringify(objeto);
   return mlHttp({
      hostname: 'api.mercadolibre.com',
      path: caminho,
      method: 'POST',
      headers: {
         Authorization: `Bearer ${token}`,
         'Content-Type': 'application/json',
         'Content-Length': Buffer.byteLength(corpo),
         Accept: 'application/json',
      },
   }, corpo);
};

const mlEnviaMensagem = async (pedido) => {
   const packId      = pedido.pack_id || pedido.id;
   const vendedorId  = pedido.seller && pedido.seller.id;
   const compradorId = pedido.buyer && pedido.buyer.id;

   if (!vendedorId || !compradorId) {
      console.log('ML mensagem: pedido sem vendedor ou comprador', pedido.id);
      return;
   }

   const primeiro = (pedido.order_items || [])[0];
   const itemId   = primeiro && primeiro.item && primeiro.item.id;
   const programa = ML_ANUNCIOS[itemId]
                 || (primeiro && primeiro.item && primeiro.item.title)
                 || 'seu produto';

   const texto =
`Olá! Obrigado pela sua compra do ${programa}.

Seu pedido foi confirmado e já estamos preparando o seu número de série.

>>> IMPORTANTE: RESPONDA ESTA MENSAGEM INFORMANDO O SEU E-MAIL <

O E-MAIL É OBRIGATÓRIO PARA ENVIO DA LICENÇA E INSTRUÇÕES.

Assim que recebermos, enviaremos o serial e as instruções de instalação.

MICROCAD - Computação Gráfica e Sistemas`;

   const r = await mlPostAuth(
      `/messages/packs/${packId}/sellers/${vendedorId}?tag=post_sale`,
      {
         from: { user_id: String(vendedorId) },
         to:   { user_id: String(compradorId) },
         text: texto,
      }
   );

   console.log('ML mensagem pedido', pedido.id, '>>>', JSON.stringify(r));
};

const mlGeraSerial = async (pedido) => {
   const pedidoId = String(pedido.id);
   const pago     = `ML-${pedidoId}`;

   const jaExiste = await TBLRegistronet.findOne({ where: { pago } });
   if (jaExiste) {
      console.log('ML serial ja existia para o pedido', pedidoId, '>>>', jaExiste.nserie);
      return { nserie: jaExiste.nserie, versao: jaExiste.versao, programa: jaExiste.programa, tipo: jaExiste.tipo, repetido: true };
   }

   const item     = (pedido.order_items || [])[0];
   const itemId   = item && item.item && item.item.id;
   const programa = ML_PROGRAMAS[itemId];

   if (!programa) {
      console.log('ML anuncio nao mapeado, serial nao gerado:', itemId);
      return null;
   }

   const { nserie, lastVersion } = await getNextNserie(programa);

   const fat = await mlFaturamento(pedidoId);

   const apelido = pedido.buyer && pedido.buyer.nickname ? pedido.buyer.nickname : 'CLIENTE MERCADO LIVRE';
   const cliente = (fat && fat.nome ? fat.nome : apelido).toUpperCase();
   const cgc     = fat && (fat.cgc.length === 11 || fat.cgc.length === 14) ? fat.cgc : ML_CGC_CURINGA;
   const tipo    = fat && fat.tipo && cgc !== ML_CGC_CURINGA ? fat.tipo : 'A';
   const cidade  = fat && fat.cidade ? fat.cidade : 'X';
   const uf      = fat && fat.uf ? fat.uf : 'XX';
   const cep     = fat && fat.cep ? fat.cep : '00000-000';

   const data    = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
   const valor   = String(item && item.unit_price != null ? item.unit_price : (pedido.total_amount || ''));

   await TBLRegistronet.create({
      nserie,
      nome: cliente,
      nomereg: cliente,
      programa,
      tipo,
      versao: lastVersion,
      data,
      pago,
      cidade,
      uf,
      cep,
      cgc,
      email: ML_EMAIL_CURINGA,
      valor,
      nn: '1',
      pp: 'BR',
   });

   await TBLRegistro.create({
      nserie,
      tipo,
      versao: lastVersion,
      cliente,
      cidade,
      uf,
      cgc,
      email: ML_EMAIL_CURINGA,
      nn: '1',
      pp: 'BR',
   });

   console.log('ML serial gerado', nserie, lastVersion, tipo, cgc, 'pedido', pedidoId);
   return { nserie, versao: lastVersion, programa, tipo, repetido: false };
};

const mlEnviaSerial = async (pedido, lic) => {
   const packId      = pedido.pack_id || pedido.id;
   const vendedorId  = pedido.seller && pedido.seller.id;
   const compradorId = pedido.buyer && pedido.buyer.id;

   if (!vendedorId || !compradorId) {
      console.log('ML serial: pedido sem vendedor ou comprador', pedido.id);
      return;
   }

   const programName = getProgramName(lic.programa);
   const link = `https://www.topocad2000.com.br/downloads/${programName}${lic.versao}.exe`;

   const texto =
`Ola! Obrigado pela sua compra do ${programName} ${lic.versao}.

NUMERO DE SERIE: ${lic.nserie}
TIPO: ${lic.tipo || 'A'}

COMO ATIVAR:
1 - Baixe e instale:
${link}
2 - Abra o AutoCAD, BricsCAD, GstarCAD ou ZwCAD e clique em MICROCAD.
3 - Clique em HABILITAR CHAVE VIRTUAL.
4 - Informe o NUMERO DE SERIE, o TIPO, o SEU E-MAIL e o SEU CPF ou CNPJ.

Duvidas: contato@topocad2000.com.br

MICROCAD - Computacao Grafica e Sistemas`;

   const r = await mlPostAuth(
      `/messages/packs/${packId}/sellers/${vendedorId}?tag=post_sale`,
      {
         from: { user_id: String(vendedorId) },
         to:   { user_id: String(compradorId) },
         text: texto,
      }
   );

   console.log('ML serial enviado pedido', pedido.id, lic.nserie, '>>>', JSON.stringify(r));
};

// =================== FIM MERCADO LIVRE - FASE 1 ===================

// =================== ENVIA N.SERIE (pagina publica /envianserie) ===================
// O cliente informa CPF/CNPJ + e-mail; se bater com o cadastro (TBLRegistro),
// o numero de serie e enviado para o e-mail cadastrado. Mesmo fluxo do
// APISOLICITACHAVE.exe, agora feito pela API (sem SMTP no EXE).

const ENVIANSERIE_COPIA = 'microcad@amicrocad.com.br'; // copia de controle (vazio = sem copia)
const ENVIANSERIE_LIMITE = 3;                           // pedidos por CGC...
const ENVIANSERIE_JANELA_MS = 10 * 60 * 1000;           // ...a cada 10 minutos
const envianserieHistorico = new Map();                 // cgc -> [timestamps]

const envianserieBloqueado = (cgc) => {
   const agora = Date.now();
   const lista = (envianserieHistorico.get(cgc) || []).filter(t => agora - t < ENVIANSERIE_JANELA_MS);
   if (lista.length >= ENVIANSERIE_LIMITE) {
      envianserieHistorico.set(cgc, lista);
      return true;
   }
   lista.push(agora);
   envianserieHistorico.set(cgc, lista);
   return false;
};

const envianserieMascara = (digitos) => {
   if (digitos.length === 11) {
      return `${digitos.substr(0, 3)}.${digitos.substr(3, 3)}.${digitos.substr(6, 3)}-${digitos.substr(9, 2)}`;
   }
   if (digitos.length === 14) {
      return `${digitos.substr(0, 2)}.${digitos.substr(2, 3)}.${digitos.substr(5, 3)}/${digitos.substr(8, 4)}-${digitos.substr(12, 2)}`;
   }
   return digitos;
};

const envianseriePrograma = (nserie) => {
   switch (String(nserie || '').substr(0, 1).toUpperCase()) {
      case 'M': return 'MEMORIALCAD';
      case 'P': return 'PERFIS2000';
      case 'Q': return 'QFCAD2000';
      default:  return 'TOPOCAD2000';
   }
};

const envianserieHtml = (lista) => {
   const programas = [...new Set(lista.map(r => envianseriePrograma(r.nserie)))];
   const titulo = lista.length === 1
      ? `${programas[0]} ${lista[0].versao || ''} - Nº DE SÉRIE: ${lista[0].nserie}`
      : `MICROCAD - NÚMEROS DE SÉRIE (${lista.length})`;

   const th = "background:#008080;padding:8px 14px;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-align:center;border:1px solid #008080;";
   const td = "background:#ffffff;padding:12px 16px;text-align:center;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:#008080;border:1px solid #008080;";
   const tdSerie = td + "font-size:26px;letter-spacing:3px;";
   const tdCli = "background:#ffffff;padding:12px 16px;text-align:left;font-family:Arial,sans-serif;font-size:13px;color:#444444;border:1px solid #008080;";

   let aaa = '';
   aaa += "<p style='font-family:Arial,sans-serif;font-size:14px;color:#222222;'>Bom dia,</p>";
   if (lista.length === 1) {
      aaa += "<p style='font-family:Arial,sans-serif;font-size:14px;color:#222222;'>Segue o n&uacute;mero de s&eacute;rie (CHAVE VIRTUAL) solicitado para o " + programas[0] + " " + (lista[0].versao || '') + ":</p>";
   } else {
      aaa += "<p style='font-family:Arial,sans-serif;font-size:14px;color:#222222;'>Seguem os " + lista.length + " n&uacute;meros de s&eacute;rie (CHAVE VIRTUAL) encontrados no cadastro deste CPF/CNPJ:</p>";
   }
   aaa += "<table cellpadding='0' cellspacing='0' style='margin:20px 0;border-collapse:collapse;'>";
   aaa += "<tr><th style='" + th + "'>PROGRAMA</th><th style='" + th + "'>VERS&Atilde;O</th><th style='" + th + "'>TIPO</th><th style='" + th + "'>N&Uacute;MERO DE S&Eacute;RIE</th><th style='" + th + "'>REGISTRO</th></tr>";
   for (const reg of lista) {
      aaa += "<tr>";
      aaa += "<td style='" + td + "'>" + envianseriePrograma(reg.nserie) + "</td>";
      aaa += "<td style='" + td + "'>" + (reg.versao || '') + "</td>";
      aaa += "<td style='" + td + "'>" + (reg.tipo || '') + "</td>";
      aaa += "<td style='" + tdSerie + "'>" + reg.nserie + "</td>";
      aaa += "<td style='" + tdCli + "'>" + (reg.cliente || '') + "-" + (reg.uf || '') + "</td>";
      aaa += "</tr>";
   }
   aaa += "</table>";
   aaa += "<p style='font-family:Arial,sans-serif;font-size:13px;color:#444444;'>Guarde este" + (lista.length > 1 ? "s n&uacute;meros. Eles ser&atilde;o solicitados" : " n&uacute;mero. Ele ser&aacute; solicitado") + " na ativa&ccedil;&atilde;o do sistema.</p>";

   let xxx = "<p style='font-family:Arial,sans-serif;color:black;'>Grato,<br><br><b>Microcad Computa&ccedil;&atilde;o Grafica</b><br><a href='https://www.amicrocad.com.br/' target='_blank'>www.amicrocad.com.br</a>";
   if (programas.includes('TOPOCAD2000')) xxx += "<br><a href='https://www.topocad2000.com.br/' target='_blank'>www.topocad2000.com.br</a>";
   if (programas.includes('MEMORIALCAD')) xxx += "<br><a href='http://www.memorialcad.com.br/' target='_blank'>www.memorialcad.com.br</a>";
   xxx += "</p>";

   return {
      subject: titulo,
      html: '<html><body>' + aaa + xxx + '</body></html>',
   };
};

const ENVIANSERIE_PAGINA = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MICROCAD - ENVIO DO NÚMERO DE SÉRIE</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; background: #f2f5f5; color: #222; }
  .box { max-width: 440px; margin: 40px auto; background: #fff; border-top: 6px solid #008080; border-radius: 6px; padding: 28px 24px 24px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
  h1 { font-size: 20px; margin: 0 0 6px; color: #008080; text-align: center; }
  p.sub { margin: 0 0 22px; font-size: 14px; color: #555; text-align: center; }
  label { display: block; font-size: 13px; font-weight: bold; margin: 14px 0 6px; }
  input { width: 100%; font-size: 18px; padding: 12px; border: 1px solid #bbb; border-radius: 4px; }
  input:focus { outline: none; border-color: #008080; }
  button { width: 100%; margin-top: 22px; font-size: 18px; font-weight: bold; padding: 14px; border: 0; border-radius: 4px; background: #008080; color: #fff; cursor: pointer; }
  button:disabled { background: #9bbcbc; cursor: default; }
  #msg { margin-top: 20px; padding: 14px; border-radius: 4px; font-size: 15px; line-height: 1.5; display: none; white-space: pre-line; }
  #msg.ok { display: block; background: #e3f4ef; border: 1px solid #008080; color: #0b4f4f; }
  #msg.erro { display: block; background: #fdecea; border: 1px solid #c0392b; color: #7b1f16; }
  .rodape { margin-top: 26px; font-size: 12px; color: #777; text-align: center; }
  .rodape a { color: #008080; text-decoration: none; }
</style>
</head>
<body>
<div class="box">
  <h1>ENVIO DO NÚMERO DE SÉRIE</h1>
  <p class="sub">Informe o CPF/CNPJ e o e-mail do cadastro.<br>O número de série será enviado para esse e-mail.</p>
  <form id="frm" autocomplete="off">
    <label for="cgc">CPF / CNPJ</label>
    <input id="cgc" name="cgc" inputmode="numeric" placeholder="Somente números" maxlength="18" required>
    <label for="email">E-MAIL</label>
    <input id="email" name="email" type="email" placeholder="email@exemplo.com.br" required>
    <button id="bt" type="submit">ENVIAR NÚMERO DE SÉRIE</button>
  </form>
  <div id="msg"></div>
  <div class="rodape">Microcad Computação Gráfica<br><a href="https://www.topocad2000.com.br/" target="_blank">www.topocad2000.com.br</a></div>
</div>
<script>
  var frm = document.getElementById('frm');
  var bt = document.getElementById('bt');
  var msg = document.getElementById('msg');
  var cgc = document.getElementById('cgc');

  cgc.addEventListener('input', function () {
    var d = cgc.value.replace(/\\D/g, '').substr(0, 14);
    if (d.length <= 11) {
      d = d.replace(/^(\\d{3})(\\d)/, '$1.$2').replace(/^(\\d{3})\\.(\\d{3})(\\d)/, '$1.$2.$3').replace(/\\.(\\d{3})(\\d{1,2})$/, '.$1-$2');
    } else {
      d = d.replace(/^(\\d{2})(\\d)/, '$1.$2').replace(/^(\\d{2})\\.(\\d{3})(\\d)/, '$1.$2.$3').replace(/\\.(\\d{3})(\\d)/, '.$1/$2').replace(/(\\d{4})(\\d{1,2})$/, '$1-$2');
    }
    cgc.value = d;
  });

  function mostra(classe, texto) {
    msg.className = classe;
    msg.textContent = texto;
  }

  frm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var digitos = cgc.value.replace(/\\D/g, '');
    var email = document.getElementById('email').value.trim();
    if (digitos.length !== 11 && digitos.length !== 14) {
      mostra('erro', 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos.');
      return;
    }
    bt.disabled = true;
    bt.textContent = 'ENVIANDO...';
    msg.className = '';
    fetch('/apienvianserie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cgc: digitos, email: email })
    })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      mostra(j.ok ? 'ok' : 'erro', j.msg || 'ERRO');
    })
    .catch(function () {
      mostra('erro', 'Não foi possível conectar ao servidor.\\nTente novamente em alguns minutos.');
    })
    .then(function () {
      bt.disabled = false;
      bt.textContent = 'ENVIAR NÚMERO DE SÉRIE';
    });
  });
</script>
</body>
</html>
`;

// =================== FIM ENVIA N.SERIE ===================

// =================== TOTINS - LIMPEZA DE HABILITACOES INATIVAS ===================
const TOTINS_DIAS_INATIVO = 180;                       // sem uso ha mais que isto: apaga antes de contar

// data de corte no formato AAMMDD (o mesmo do udata/ndata da DADOSINS)
const totinsDataCorte = (dias) => {
   const d = new Date();
   d.setDate(d.getDate() - dias);
   const aa = String(d.getFullYear() % 100).padStart(2, '0');
   const mm = String(d.getMonth() + 1).padStart(2, '0');
   const dd = String(d.getDate()).padStart(2, '0');
   return `${aa}${mm}${dd}`;
};

// =================== SUPORTE - ENVIADO DE DENTRO DO CAD (POST /apisuporte) ===================
// O TOPOCAD2000 (comando SUPORTEMICROCAD / botao ENVIAR AO SUPORTE) monta um relatorio em
// texto puro (SUPORTE-<serie>.TXT) e o MICROCADHTTP.EXE faz o POST dele aqui (text/plain, UTF-8).
// A API so repassa: e-mail para o suporte com o relatorio no corpo e Reply-To no usuario,
// e um "recebemos" para o usuario. Nao grava em banco.
//
// FORMATO DO RELATORIO (primeiras linhas CHAVE=VALOR, depois os blocos):
//   PROGRAMA=TOPOCAD2000 V21.59A
//   NSERIE=T310291 A
//   NOME=...
//   EMAIL=...            (e-mail para resposta, digitado/confirmado na tela)
//   CAD=AutoCAD 2022 ...
//   ANEXOS=nome (x MB); ...  (so informativo)
//   ----- RELATO -----
//   (texto digitado pelo usuario)
//
// COM ANEXOS o EXE manda JSON {relatorio, anexos:[{nome, base64}]} (express.json global, 50 MB);
// SEM anexos manda text/plain (express.text na rota). E-mail em texto + HTML <pre>, porque o
// Outlook junta as linhas do texto puro.
//   ----- LOG DO CAD (ULTIMAS LINHAS) -----
//   (janela de texto / F2)

const SUPORTE_EMAIL = process.env.SUPORTE_EMAIL || 'contato@topocad2000.com.br'; // destino do relatorio
const SUPORTE_COPIA = '';                              // copia de controle (vazio = sem copia)
const SUPORTE_LIMITE = 5;                              // envios por numero de serie...
const SUPORTE_JANELA_MS = 60 * 60 * 1000;              // ...a cada 60 minutos
const SUPORTE_MAX_BYTES = 2 * 1024 * 1024;             // relatorio maior que isto e cortado
const SUPORTE_ANEXOS_QTD = 10;                         // anexos por envio...
const SUPORTE_ANEXOS_MB = 25;                          // ...e total em MB (o EXE limita em 20; o Gmail em 25)
const suporteHistorico = new Map();                    // nserie -> [timestamps]

const suporteBloqueado = (chave) => {
   const agora = Date.now();
   const lista = (suporteHistorico.get(chave) || []).filter(t => agora - t < SUPORTE_JANELA_MS);
   if (lista.length >= SUPORTE_LIMITE) {
      suporteHistorico.set(chave, lista);
      return true;
   }
   lista.push(agora);
   suporteHistorico.set(chave, lista);
   return false;
};

// le "CHAVE=VALOR" nas linhas do cabecalho (para antes do primeiro bloco "-----")
const suporteCabecalho = (texto) => {
   const cab = {};
   for (const linha of texto.split(/\r?\n/)) {
      if (linha.startsWith('-----')) break;
      const i = linha.indexOf('=');
      if (i > 0) cab[linha.substr(0, i).trim().toUpperCase()] = linha.substr(i + 1).trim();
   }
   return cab;
};

const suporteEscapa = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const suporteEmailOk = (e) => e.length >= 5 && e.indexOf('@') > 0 && e.indexOf('.', e.indexOf('@')) > 0 && e.indexOf(' ') < 0;

// =================== ENVIA LINK DO TESTE (pagina publica /envialink) ===================
// Para quem chega pelo celular na pagina de download do site: informa nome + e-mail
// e recebe o link do instalador do TOPOCAD2000 V21 (teste de 30 dias) por e-mail.
// Nao consulta banco. Copia para ENVIALINK_COPIA para acompanhamento.

const ENVIALINK_COPIA = 'microcad@amicrocad.com.br';   // copia de controle (vazio = sem copia)
const ENVIALINK_LIMITE = 3;                             // pedidos por e-mail...
const ENVIALINK_JANELA_MS = 10 * 60 * 1000;             // ...a cada 10 minutos
const ENVIALINK_URL_EXE = 'https://www.topocad2000.com.br/downloads/TOPOCAD2000V21.exe';
const ENVIALINK_URL_AULAS = 'https://www.amicrocad.com.br/topocad2000-videoaulas';
const envialinkHistorico = new Map();                   // email -> [timestamps]

const envialinkBloqueado = (email) => {
   const agora = Date.now();
   const lista = (envialinkHistorico.get(email) || []).filter(t => agora - t < ENVIALINK_JANELA_MS);
   if (lista.length >= ENVIALINK_LIMITE) {
      envialinkHistorico.set(email, lista);
      return true;
   }
   lista.push(agora);
   envialinkHistorico.set(email, lista);
   return false;
};

const envialinkEscapa = (s) => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const envialinkHtml = (nome) => {
   const p = "margin:0 0 12px;font-size:15px;line-height:1.6;color:#222;";
   const li = "margin:0 0 8px;font-size:15px;line-height:1.6;color:#222;";
   const bt = "display:inline-block;background:#008080;color:#fff;text-decoration:none;font-size:17px;font-weight:bold;padding:14px 26px;border-radius:6px;";
   const saud = nome ? `Olá, ${envialinkEscapa(nome)}.` : 'Olá.';
   return {
      subject: 'TOPOCAD2000 V21 - link para instalar o teste de 30 dias',
      html: `<html><body style="margin:0;padding:0;background:#f2f5f5;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:28px 24px;border-top:6px solid #008080;">
<h2 style="margin:0 0 16px;font-size:20px;color:#008080;">TOPOCAD2000 V21 - TESTE GRÁTIS POR 30 DIAS</h2>
<p style="${p}">${saud}<br>Aqui está o link que você pediu no site.<br>Abra este e-mail no computador onde vai instalar.</p>
<p style="margin:22px 0;text-align:center;"><a href="${ENVIALINK_URL_EXE}" style="${bt}">BAIXAR O TOPOCAD2000 V21</a></p>
<p style="${p}">Se o botão não abrir, copie este endereço no navegador:<br><a href="${ENVIALINK_URL_EXE}" style="color:#008080;">${ENVIALINK_URL_EXE}</a></p>
<p style="${p}"><b>Como instalar:</b></p>
<ol style="margin:0 0 16px;padding-left:22px;">
<li style="${li}">Feche o AutoCAD, BricsCAD, GstarCAD ou ZWCAD.</li>
<li style="${li}">Execute o arquivo baixado e siga a instalação.</li>
<li style="${li}">Abra o CAD. O menu TOPOCAD2000 aparece sozinho.</li>
<li style="${li}">No primeiro comando, escolha UTILIZAÇÃO POR 30 DIAS.</li>
</ol>
<p style="${p}"><b>O teste é completo, sem limitações, por 30 dias.</b><br>Compatível com AutoCAD 2007 e 2010 ao 2027, BricsCAD Pro, GstarCAD e ZWCAD Professional.</p>
<p style="${p}">Cada comando tem um botão VÍDEO com as videoaulas.<br>Todas estão em <a href="${ENVIALINK_URL_AULAS}" style="color:#008080;">${ENVIALINK_URL_AULAS}</a></p>
<p style="${p}">Dúvidas: <a href="mailto:contato@topocad2000.com.br" style="color:#008080;">contato@topocad2000.com.br</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#777;">Microcad Computação Gráfica - www.topocad2000.com.br</p>
</div></body></html>`,
   };
};

const ENVIALINK_PAGINA = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TOPOCAD2000 - RECEBER O LINK DO TESTE</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, sans-serif; background: #f2f5f5; color: #222; }
  .box { max-width: 440px; margin: 40px auto; background: #fff; border-top: 6px solid #008080; border-radius: 6px; padding: 28px 24px 24px; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
  h1 { font-size: 20px; margin: 0 0 6px; color: #008080; text-align: center; }
  p.sub { margin: 0 0 22px; font-size: 14px; color: #555; text-align: center; line-height: 1.5; }
  label { display: block; font-size: 13px; font-weight: bold; margin: 14px 0 6px; }
  input { width: 100%; font-size: 18px; padding: 12px; border: 1px solid #bbb; border-radius: 4px; }
  input:focus { outline: none; border-color: #008080; }
  button { width: 100%; margin-top: 22px; font-size: 18px; font-weight: bold; padding: 14px; border: 0; border-radius: 4px; background: #008080; color: #fff; cursor: pointer; }
  button:disabled { background: #9bbcbc; cursor: default; }
  #msg { margin-top: 20px; padding: 14px; border-radius: 4px; font-size: 15px; line-height: 1.5; display: none; white-space: pre-line; }
  #msg.ok { display: block; background: #e3f4ef; border: 1px solid #008080; color: #0b4f4f; }
  #msg.erro { display: block; background: #fdecea; border: 1px solid #c0392b; color: #7b1f16; }
  .rodape { margin-top: 26px; font-size: 12px; color: #777; text-align: center; }
  .rodape a { color: #008080; text-decoration: none; }
</style>
</head>
<body>
<div class="box">
  <h1>TOPOCAD2000 V21 - TESTE GRÁTIS</h1>
  <p class="sub">O TOPOCAD2000 instala no computador, dentro do AutoCAD, BricsCAD, GstarCAD ou ZWCAD.<br>Informe seu e-mail e receba o link para instalar depois.</p>
  <form id="frm" autocomplete="on">
    <label for="nome">NOME</label>
    <input id="nome" name="nome" type="text" placeholder="Seu nome" maxlength="60" required>
    <label for="email">E-MAIL</label>
    <input id="email" name="email" type="email" placeholder="email@exemplo.com.br" required>
    <button id="bt" type="submit">RECEBER O LINK POR E-MAIL</button>
  </form>
  <div id="msg"></div>
  <div class="rodape">Teste completo por 30 dias, sem limitações.<br>Microcad Computação Gráfica<br><a href="https://www.topocad2000.com.br/" target="_blank">www.topocad2000.com.br</a></div>
</div>
<script>
  var frm = document.getElementById('frm');
  var bt = document.getElementById('bt');
  var msg = document.getElementById('msg');
  var origem = (new URLSearchParams(location.search).get('origem') || '').substr(0, 40);

  function mostra(classe, texto) {
    msg.className = classe;
    msg.textContent = texto;
  }

  frm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nome = document.getElementById('nome').value.trim();
    var email = document.getElementById('email').value.trim();
    bt.disabled = true;
    bt.textContent = 'ENVIANDO...';
    msg.className = '';
    fetch('/apienvialink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome, email: email, origem: origem })
    })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      mostra(j.ok ? 'ok' : 'erro', j.msg || 'ERRO');
    })
    .catch(function () {
      mostra('erro', 'Não foi possível conectar ao servidor.\\nTente novamente em alguns minutos.');
    })
    .then(function () {
      bt.disabled = false;
      bt.textContent = 'RECEBER O LINK POR E-MAIL';
    });
  });
</script>
</body>
</html>
`;

// =================== FIM ENVIA LINK DO TESTE ===================


// =================== CADASTRO DO TESTE 30 DIAS (DADOSINS000) ===================
// Nome, e-mail, cidade e UF de quem habilita o teste de 30 dias
// (TOPOCAD2000: MICROCAD5.LSP > DLL MICROCADAPIINS000CAD > PUT /apiupdins000cad).
// As 4 colunas sao criadas aqui, uma unica vez, na primeira chamada da rota.
// O model TBLDadosins000 nao muda: as rotas antigas continuam iguais mesmo se o ALTER falhar.
let cad000Colunas = null; // promise da criacao das colunas (null = ainda nao criou ou falhou)

const cad000GaranteColunas = () => {
   if (!cad000Colunas) {
      const tab = TBLDadosins000.getTableName();
      cad000Colunas = TBLDadosins000.sequelize.query(
         `IF COL_LENGTH('${tab}', 'nome')   IS NULL ALTER TABLE [${tab}] ADD nome   NVARCHAR(255) NULL;
          IF COL_LENGTH('${tab}', 'email')  IS NULL ALTER TABLE [${tab}] ADD email  NVARCHAR(255) NULL;
          IF COL_LENGTH('${tab}', 'cidade') IS NULL ALTER TABLE [${tab}] ADD cidade NVARCHAR(255) NULL;
          IF COL_LENGTH('${tab}', 'uf')     IS NULL ALTER TABLE [${tab}] ADD uf     NVARCHAR(10)  NULL;`
      ).catch((err) => {
         cad000Colunas = null; // tenta de novo na proxima chamada
         throw err;
      });
   }
   return cad000Colunas;
};

const cad000Texto = (valor, tamanho) => String(valor || '').replace(/\s+/g, ' ').trim().substring(0, tamanho);

// data/hora de Brasilia (yyMMdd / HHmmss), so se a DLL nao mandar
const cad000Agora = () => {
   const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
   const z = (n) => String(n).padStart(2, '0');
   return {
      data: z(d.getUTCFullYear() % 100) + z(d.getUTCMonth() + 1) + z(d.getUTCDate()),
      hora: z(d.getUTCHours()) + z(d.getUTCMinutes()) + z(d.getUTCSeconds()),
   };
};

// =================== FIM CADASTRO DO TESTE 30 DIAS ===================



class LicenseController {

   async search(req, res) {
      const { predicate } = req.params;

      return res.json(await TBLRegistronet.findAll({
         where: {
            [Op.or]: [
               { ['email']: { [Op.like]: `%${predicate}%` } },
               { ['nome']: { [Op.like]: `%${predicate}%` } },
               { ['nserie']: { [Op.like]: `%${predicate}%` } },
            ],
         }
      }))
   }
   //
   //
   async sendEmail(req, res) {

      const { cgc, email, versao, nserie, nome, uf } = req.body

      const transporter = nodemailer.createTransport(emailConfig);

      var mailOptions = {
         from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
         to: `${email}, microcad@amicrocad.com.br`,
         subject: `TOPOCAD2000 ${versao} - ${nserie} * CHAVE VIRTUAL`,
         text: `*TOPOCAD2000 ${versao} - ${nserie} >>> ${nome}-${uf}
         1-Clique no link a seguir para baixar / instalar / atualizar TOPOCAD2000 ${versao} (caso ainda não tenha feito).
         https://microcad.blob.core.windows.net/downloads/TOPOCAD2000${versao}.exe
         2-Abra o AutoCAD / BricsCAD / GstarCAD / ZwCAD, acesse um menu do TOPOCAD2000 e clique em MICROCAD
         3-Clique em HABILITAR PARA CHAVE VIRTUAL.
         4-Informe o NUMERO DE SERIE / EMAIL / CPF ou CNPJ.
         Número de Série: >>> ${nserie} <<< 
         Email: >>> ${email} <<< 
         CPF / CNPJ: >>> ${cgc} <<`
      };

      transporter.sendMail(mailOptions, function (error, info) {
         if (error) {
            console.log(error);
            return res.send({ status: false })
         } else {
            console.log('Email sent: ' + info.response);
            return res.send({ status: true })
         }
      });
   }
   //
   //
   async dadosdat(req, res) {
      return res.json(await TBLDadosdat.findAll({
         order: [
            [col('ndata'), 'DESC'],
            [col('nvxx'), 'DESC']
         ]
      }))
   }

   async dadosins(req, res) {
      return res.json(await TBLDadosins.findAll({
         order: [
            [col('nserie0'), 'DESC']
         ]
      }))
   }

   async dadosinsSerie(req, res) {
      const { nserie } = req.params

      return res.json(await TBLDadosins.findAll({
         where: {
            nserie0: {
               [Op.like]: `${nserie}%`
            }
         },
         order: [
            [col('nserie0'), 'DESC']
         ]
      }))
   }
   
   async updateDadosins(req, res) {
      const { registros } = req.body

      if (registros) {

         registros.forEach(async item => {
            const { id, chave } = item
            await TBLDadosins.update({ chave: chave }, { where: { id: id } });
         })

         return res.json(registros)
      }

      return res.json([])
   }
   async deleteDadosins(req, res) {
      const { id } = req.params

      return res.json(await TBLDadosins.destroy({
         where: {
            id: id
         }
      }))
   }

   async dadosdatmail(req, res) {
      return res.json(await TBLDadosdatmail.findAll())
   }

   async atualiza(req, res) {
      return res.json(await TBLAtualiza.findAll({
         order: [
            [col('nvxx'), 'DESC'],
            [col('nvxxyy'), 'DESC']
         ]
      }))
   }

   async atualizaUpdate(req, res) {
      const { registros } = req.body

      if (registros) {

         registros.forEach(async item => {
            const { nvxx, nvxxyy, ndata, vxx } = item
            await TBLAtualiza.update({ nvxx, nvxxyy, ndata, vxx }, { where: { nvxx: nvxx } });
         })

         return res.json(registros)
      }

      return res.json([])
   }

   async dadosdth(req, res) {
      return res.json(await TBLDadosdth.findAll());
   }
   async deleteDadosdth(req, res) {
      const { nserie0 } = req.params

      return res.json(await TBLDadosdth.destroy({
         where: {
            nserie0: nserie0
         }
      }))
   }

   async dadosins000(req, res) {
      return res.json(await TBLDadosins000.findAll({
         order: [
            [col('totd'), 'DESC']
         ]
      }))
   }
   async deleteDadosins000(req, res) {
      const { id } = req.params

      return res.json(await TBLDadosins000.destroy({
         where: {
            id: id
         }
      }))
   }

   async dadostxt(req, res) {
      return res.json(await TBLDadostxt.findAll({
         order: [
            [col('ntot'), 'DESC']
         ]
      }))
   }

   async naoreg(req, res) {
      return res.json(await TBLNaoreg.findAll());
   }
   async deleteNaoreg(req, res) {
      const { id } = req.params

      return res.json(await TBLNaoreg.destroy({
         where: {
            id: id
         }
      }))
   }

   async registro(req, res) {
      return res.json(await TBLRegistro.findAll());
   }
   async deleteRegistro(req, res) {
      const { nserie } = req.params

      return res.json(await TBLRegistro.destroy({
         where: {
            nserie: nserie
         }
      }))
   }

   //LISTA REGISTRO
   async lisregistro(req, res) {
      const { id1 } = req.params; //cgc
      const registros = await TBLRegistro.findAll({
         where: { cgc: id1 }
      });

      if (registros) {
         return res.json(registros);
      }
      return res.json({});
   }
   //
   // ENVIA N.SERIE - pagina publica (GET /envianserie)
   async envianseriePagina(req, res) {
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(ENVIANSERIE_PAGINA);
   }
   //
   // ENVIA N.SERIE - envio por e-mail (POST /apienvianserie {cgc, email})
   async envianserie(req, res) {
      const CONTATO = 'Envie solicitação para contato@topocad2000.com.br';
      let { cgc, email } = req.body;

      cgc = String(cgc || '').replace(/\D/g, '');
      email = String(email || '').trim().toLowerCase();

      if (cgc.length !== 11 && cgc.length !== 14) {
         return res.json({ ok: false, cod: 'INVALIDO', msg: 'CPF/CNPJ inválido.' });
      }
      if (email.length < 5 || email.indexOf('@') < 1) {
         return res.json({ ok: false, cod: 'INVALIDO', msg: 'E-mail inválido.' });
      }
      if (envianserieBloqueado(cgc)) {
         console.log('ENVIANSERIE limite', cgc, email);
         return res.json({ ok: false, cod: 'LIMITE', msg: 'Limite de pedidos atingido para este CPF/CNPJ.\nTente novamente em 10 minutos.' });
      }

      // o cadastro pode ter o CGC só com números ou com máscara (EXE antigo gravava CPF com máscara)
      const registros = await TBLRegistro.findAll({
         where: { cgc: { [Op.in]: [cgc, envianserieMascara(cgc)] } },
      });

      if (!registros || registros.length === 0) {
         console.log('ENVIANSERIE nao encontrado', cgc, email);
         return res.json({ ok: false, cod: 'NAOENCONTRADO', msg: 'CPF/CNPJ não encontrado no cadastro.\n' + CONTATO });
      }

      const confere = registros.filter(r => String(r.email || '').trim().toLowerCase() === email);

      if (confere.length === 0) {
         console.log('ENVIANSERIE email nao confere', cgc, email);
         return res.json({ ok: false, cod: 'EMAILINVALIDO', msg: 'O e-mail não confere com o cadastro deste CPF/CNPJ.\n' + CONTATO });
      }

      const corpo = envianserieHtml(confere);
      const mailOptions = {
         from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
         to: email,
         subject: corpo.subject,
         html: corpo.html,
      };
      if (ENVIANSERIE_COPIA) mailOptions.cc = ENVIANSERIE_COPIA;

      try {
         const transporter = nodemailer.createTransport(emailConfig);
         await transporter.sendMail(mailOptions);
      } catch (e) {
         console.log('ENVIANSERIE falha envio', cgc, '>>>', email, e.message);
         return res.json({ ok: false, cod: 'ERROENVIO', msg: 'Não foi possível enviar o e-mail.\nTente novamente mais tarde ou envie solicitação para contato@topocad2000.com.br' });
      }

      const seriais = confere.map(r => r.nserie);
      console.log('ENVIANSERIE enviado', seriais.join(','), '>>>', email);

      const plural = seriais.length > 1 ? `${seriais.length} números de série enviados em um único e-mail` : 'Número de série enviado';
      return res.json({
         ok: true,
         cod: 'ENVIADO',
         qtd: seriais.length,
         msg: `${plural} para ${email}.\nVerifique também a caixa de SPAM.`,
      });
   }

   //
   // ENVIA LINK DO TESTE - pagina publica (GET /envialink?origem=xxx)
   async envialinkPagina(req, res) {
      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(ENVIALINK_PAGINA);
   }
   //
   // ENVIA LINK DO TESTE - envio por e-mail (POST /apienvialink {nome, email, origem})
   async envialink(req, res) {
      let { nome, email, origem } = req.body;

      nome = String(nome || '').trim().substr(0, 60);
      email = String(email || '').trim().toLowerCase().substr(0, 120);
      origem = String(origem || '').trim().substr(0, 40);

      if (email.length < 5 || email.indexOf('@') < 1 || email.indexOf('.') < 0) {
         return res.json({ ok: false, cod: 'INVALIDO', msg: 'E-mail inválido.' });
      }
      if (envialinkBloqueado(email)) {
         console.log('ENVIALINK limite', email);
         return res.json({ ok: false, cod: 'LIMITE', msg: 'O link já foi enviado para este e-mail.\nVerifique também a caixa de SPAM.' });
      }

      const corpo = envialinkHtml(nome);
      const mailOptions = {
         from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
         to: email,
         subject: corpo.subject,
         html: corpo.html,
      };
      if (ENVIALINK_COPIA) {
         mailOptions.bcc = ENVIALINK_COPIA;
         // identifica o pedido na copia sem aparecer para o cliente
         mailOptions.headers = { 'X-Envialink': `${nome} | ${email} | ${origem || 'sem-origem'}` };
      }

      try {
         const transporter = nodemailer.createTransport(emailConfig);
         await transporter.sendMail(mailOptions);
      } catch (e) {
         console.log('ENVIALINK falha envio', email, e.message);
         return res.json({ ok: false, cod: 'ERROENVIO', msg: 'Não foi possível enviar o e-mail.\nTente novamente mais tarde ou escreva para contato@topocad2000.com.br' });
      }

      console.log('ENVIALINK enviado', nome, '>>>', email, origem);
      return res.json({
         ok: true,
         cod: 'ENVIADO',
         msg: `Link enviado para ${email}.\nAbra o e-mail no computador onde vai instalar.\nVerifique também a caixa de SPAM.`,
      });
   }

   // SUPORTE - relatorio enviado de dentro do CAD (POST /apisuporte, corpo text/plain)
   // Resposta em texto puro, uma linha, no padrao do MICROCADHTTP.EXE: "OK;..." ou "ERRO;..."
   async suporte(req, res) {
      res.set('Content-Type', 'text/plain; charset=utf-8');

      // CORPO: text/plain (so o relatorio) ou JSON {relatorio, anexos:[{nome, base64}]} (com anexos)
      let texto = '';
      let anexos = [];
      if (typeof req.body === 'string') {
         texto = req.body;
      } else if (Buffer.isBuffer(req.body)) {
         texto = req.body.toString('utf8');
      } else if (req.body && typeof req.body === 'object') {
         texto = String(req.body.relatorio || '');
         if (Array.isArray(req.body.anexos)) anexos = req.body.anexos;
      }
      texto = texto.replace(/^\uFEFF/, '');

      if (texto.trim().length < 20) {
         return res.send('ERRO;RELATORIO VAZIO');
      }
      if (Buffer.byteLength(texto, 'utf8') > SUPORTE_MAX_BYTES) {
         texto = texto.substr(0, SUPORTE_MAX_BYTES) + '\n\n[RELATORIO CORTADO EM 2 MB]';
      }

      const cab = suporteCabecalho(texto);
      const programa = (cab.PROGRAMA || 'TOPOCAD2000').substr(0, 40);
      const nserie   = (cab.NSERIE   || 'SEM SERIE').substr(0, 20);
      const nome     = (cab.NOME     || '').substr(0, 80);
      const email    = (cab.EMAIL    || '').trim().toLowerCase().substr(0, 120);
      const cad      = (cab.CAD      || '').substr(0, 60);

      if (suporteBloqueado(nserie)) {
         console.log('SUPORTE limite', nserie, email);
         return res.send('ERRO;LIMITE DE ENVIOS ATINGIDO. AGUARDE 1 HORA OU ESCREVA PARA ' + SUPORTE_EMAIL);
      }

      const assunto = `SUPORTE ${programa} - ${nserie}${nome ? ' - ' + nome : ''}`;

      // ANEXOS: nome limpo, base64 decodificado, no maximo SUPORTE_ANEXOS_QTD e SUPORTE_ANEXOS_MB no total
      const attachments = [];
      let totalAnexos = 0;
      for (const a of anexos.slice(0, SUPORTE_ANEXOS_QTD)) {
         if (!a || typeof a.base64 !== 'string') continue;
         const filename = String(a.nome || 'anexo').replace(/[\\/:*?"<>|\r\n]/g, '_').substr(0, 120);
         let content;
         try { content = Buffer.from(a.base64, 'base64'); } catch (e) { continue; }
         if (!content || content.length === 0) continue;
         totalAnexos += content.length;
         if (totalAnexos > SUPORTE_ANEXOS_MB * 1024 * 1024) {
            console.log('SUPORTE anexos acima do limite', nserie, totalAnexos);
            return res.send(`ERRO;ANEXOS ACIMA DE ${SUPORTE_ANEXOS_MB} MB NO TOTAL. REMOVA ARQUIVOS E ENVIE NOVAMENTE`);
         }
         attachments.push({ filename, content });
      }

      const mailSuporte = {
         from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
         to: SUPORTE_EMAIL,
         subject: assunto,
         text: texto,
         html: '<pre style="font-family:Consolas,Courier New,monospace;font-size:13px;white-space:pre-wrap">' + suporteEscapa(texto) + '</pre>',
         headers: { 'X-Suporte': `${nserie} | ${email || 'sem-email'} | ${cad || 'sem-cad'}` },
      };
      if (attachments.length > 0) mailSuporte.attachments = attachments;
      if (suporteEmailOk(email)) mailSuporte.replyTo = email;
      if (SUPORTE_COPIA) mailSuporte.cc = SUPORTE_COPIA;

      try {
         const transporter = nodemailer.createTransport(emailConfig);
         await transporter.sendMail(mailSuporte);
      } catch (e) {
         console.log('SUPORTE falha envio', nserie, email, e.message);
         return res.send('ERRO;NAO FOI POSSIVEL ENVIAR. TENTE MAIS TARDE OU ESCREVA PARA ' + SUPORTE_EMAIL);
      }

      // confirmacao para o usuario (se o e-mail for valido); falha aqui nao invalida o envio
      let confirmado = false;
      if (suporteEmailOk(email)) {
         const corpo = (cab.PROGRAMA ? programa : 'TOPOCAD2000');
         const mailUsuario = {
            from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
            to: email,
            replyTo: SUPORTE_EMAIL,
            subject: `Recebemos sua solicitação de suporte - ${corpo} - ${nserie}`,
            text:
`Recebemos a sua solicitação de suporte enviada pelo ${corpo}.

Número de série: ${nserie}
${nome ? 'Nome: ' + nome + '\n' : ''}${cad ? 'CAD: ' + cad + '\n' : ''}
O suporte é feito por e-mail, de segunda a sexta-feira, das 10:00 às 17:00 h.
A resposta será enviada para este e-mail (${email}).
Verifique também a caixa de SPAM.

Se quiser complementar, responda este e-mail com prints ou arquivos.

Microcad Computação Gráfica
${SUPORTE_EMAIL}
www.topocad2000.com.br`,
         };
         try {
            const transporter = nodemailer.createTransport(emailConfig);
            await transporter.sendMail(mailUsuario);
            confirmado = true;
         } catch (e) {
            console.log('SUPORTE falha confirmacao', nserie, email, e.message);
         }
      }

      console.log('SUPORTE enviado', nserie, nome, '>>>', email, cad, attachments.length ? `anexos=${attachments.length} (${totalAnexos} bytes)` : '');
      return res.send(confirmado ? `OK;ENVIADO. CONFIRMACAO ENVIADA PARA ${email}` : 'OK;ENVIADO');
   }

   async registronet(req, res) {
      return res.json(await TBLRegistronet.findAll());
   }

   async xemail(req, res) {
      return res.json(await TBLXemail.findAll())
   }

   async xexe(req, res) {
      return res.json(await TBLXexe.findAll({
         order: [
            [col('nserie'), 'DESC']
         ]
      }))
   }

   async deleteXex(req, res) {
      const { id } = req.params

      return res.json(await TBLXexe.destroy({
         where: {
            id: id
         }
      }))
   }

   async listEmails(req, res) {
      return res.json(await TBLXemail.findAll({
         where: {
            nserie: {
               [Op.ne]: 'XXXXXXX'
            }
         }
      }))
   }

   async getEmail(req, res) {
      const { email } = req.params
      return res.json(await TBLXemail.findOne({
         where: {
            email: email
         }
      }))
   }

   async importEmails(req, res) {

      function uniqBy(list) {
         let seen = new Set();
         return list.filter(item => {
            let k = item.email.toLowerCase();
            return seen.has(k) ? false : seen.add(k);
         });
      }

      req.setTimeout(1000000)
      const { emails } = req.body

      if (!!emails) {

         const updatedEmails = []

         const promises = uniqBy(emails).map(async (item) => {
            const { nserie, email, data, origem } = item;

            const emailsExists = await TBLXemail.findOne({ where: { email: email } })

            if (origem === 'Registronet' && emailsExists && emailsExists.nserie !== 'XXXXXXX' && emailsExists.nserie !== nserie) {
               updatedEmails.push(item)
               return await TBLXemail.update({ nserie, email, data, origem }, { where: { email: email } });
            }

            if (!emailsExists) {
               updatedEmails.push(item)
               return await TBLXemail.create({ nserie: nserie, email: email, data: data, origem: origem });
            }
         })

         Promise.all(promises).then(() => res.json(updatedEmails))

      } else {
         return res.json([]);
      }
   }

   async clearEmails(req, res) {
      req.setTimeout(1000000)
      const { emails } = req.body

      if (!!emails) {

         emails.forEach(async item => {

            const { id, nserie, email, data } = item;

            const emailExists = await TBLXemail.findOne({ where: { email: email } })

            if (emailExists && emailExists.nserie !== 'XXXXXXX') {
               await TBLXemail.update({ nserie, email, data }, { where: { email: email } });
            }

            if (!emailExists) {
               await TBLXemail.create({ nserie: nserie, email: email, data: data });
            }
         })

         return res.json(emails);
      }

      return res.json([]);
   }

   //
   //MICROCAD
   // COMPUTADORES LIBERADOS DO REGISTROREV (CHAMADO PELO Licenca.vb DO REGISTROREV)
   // GET /apimicrocad?nserie=REGV01&uname=USUARIO&cname=COMPUTADOR&ver=2
   // RESPOSTA: { valid: true, rev: 'TC', email: 'compras@totalcad.com.br' }
   //           { valid: false }                   -> COMPUTADOR NAO LIBERADO
   //           { valid: false, atualizar: true }  -> EXE DESATUALIZADO (ver MENOR QUE A MINIMA DA REVENDA)
   // rev = REVENDA (MC = MICROCAD / TC = TOTALCAD / PA = PORTAL AGRIMENSURA) - O EMAIL DA REVENDA VEM DE revendas
   // versaoMinima = VERSAO MINIMA DO REGISTROREV POR REVENDA (EXE ANTIGO NAO MANDA ver = VERSAO 0)
   //   PA: ACRESCENTAR  PA: 2  DEPOIS DE ENVIAR O EXE NOVO PARA A PORTAL AGRIMENSURA
   // PARA LIBERAR UM COMPUTADOR NOVO: ACRESCENTAR UMA LINHA EM licences COM O USUARIO E O COMPUTADOR
   // QUE APARECEM NA TELA "LICENCA INVALIDA" DO REGISTROREV (NAO PRECISA GERAR EXE NOVO)
   async microcad(req, res) {
      const nserie = String(req.query.nserie || '').trim().toUpperCase()
      const uname = String(req.query.uname || '').trim().toUpperCase()
      const cname = String(req.query.cname || '').trim().toUpperCase()
      const ver = Number(req.query.ver) || 0
      console.log(nserie, uname, cname, ver)
      const revendas = {
         MC: 'contato@topocad2000.com.br',
         TC: 'compras@totalcad.com.br',
         PA: 'contato@portalagrimensura.com'
      }
      const versaoMinima = {
         TC: 2
      }
      const licences =
         [
//          { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC', rev: 'MC' },
//          { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC2', rev: 'MC' },
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC3', rev: 'MC' },
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC4', rev: 'MC' },
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC5', rev: 'MC' },
            { nserie: 'REGV01', uname: 'CACOB', cname: 'NB-DELL-RICARDO', rev: 'MC' },
            { nserie: 'REGV01', uname: 'RICARDO MELO', cname: 'RICARDO-PC', rev: 'MC' },
            { nserie: 'REGV01', uname: 'ADRIANO', cname: 'DESKTOOP', rev: 'PA' },
            { nserie: 'REGV01', uname: 'ADMINISTRATIVO3', cname: 'DESKTOP-45RCPST', rev: 'TC' },
            { nserie: 'REGV01', uname: 'ADMINISTRATIVO6', cname: 'DESKTOP-4846ANM', rev: 'TC' },
            { nserie: 'REGV01', uname: 'ADMINISTRATIVO3', cname: 'ADMCAD', rev: 'TC' },
            { nserie: 'REGV01', uname: 'ROGERIO BATISTA', cname: 'DESKTOP-J5RQF1S', rev: 'MC' }
         ]
      const licence = licences.find(x =>
         x.nserie.toUpperCase() == nserie &&
         x.uname.toUpperCase() == uname &&
         x.cname.toUpperCase() == cname)
      if (!licence) return res.json({ valid: false })
      if (ver < (versaoMinima[licence.rev] || 0)) return res.json({ valid: false, atualizar: true })
      return res.json({ valid: true, rev: licence.rev, email: revendas[licence.rev] || '' })
   }
   //
   //MICROCADUSU
   async microcadusu(req, res) {
      const { nserie0, uname, cname } = req.query; // nserie0, cname, uname
      const rules = [
         { nserie0: 'T279999A', uname: 'XXXXX', cname: 'XXXXX-PC7', codigo: 1, mensagem: 'AAA BBB CCC XXXX YYY ZZZ OK1' },
         { nserie0: 'T289999A', uname: 'XXXXX', cname: 'XXXXX-PC8', codigo: 2, mensagem: 'OK2' },
         { nserie0: 'T299999A', uname: 'XXXXX', cname: 'XXXXX-PC9', codigo: 3, mensagem: 'OK3' }
      ];
      const response = rules.find(rule => rule.nserie0 == nserie0 && rule.uname == uname && rule.cname == cname);
      if (response) return res.json({ cod: response.codigo, msg: response.mensagem });
      return res.json({ cod: 0, msg: 'OK' });
   }
   //
   // CONSULTA REGISTRONET
   async conregistronet(req, res) {
      const { id } = req.params;
      const registro = await TBLRegistronet.findByPk(id);
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // CONSULTA REGISTRONET ULTIMO
   async conregistronetultimo(req, res) {
      const registro = await TBLRegistronet.findOne({
         order: [['nserie', 'DESC']]
      });
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // CONSULTA REGISTRONET MEMORIAL ULTIMO
   async memorialconregistronetultimo(req, res) {
      const registro = await TBLRegistronet.findOne({
         order: [['nserie', 'DESC']],
         where: { programa: "MEMORIAL" }
      });
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // CONSULTA REGISTRONET PERFIS ULTIMO
   async perfisconregistronetultimo(req, res) {
      const registro = await TBLRegistronet.findOne({
         order: [['nserie', 'DESC']],
         where: { programa: "PERFIS" }
      });
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // CONSULTA REGISTRONET QFCAD ULTIMO
   async qfcadconregistronetultimo(req, res) {
      const registro = await TBLRegistronet.findOne({
         order: [['nserie', 'DESC']],
         where: { programa: "QFCAD" }
      });
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // UPD REGISTRONET
   async updregistronet(req, res) {
      const { nserie, nome, nomereg, programa, tipo, versao, nserieant, versaoant, serial, dataenv, data, valor, desconto, frete, pago, codrastre, rua, bairro, cidade, uf, cep, cgc, telefone, email, emailcc, nn, pp, obs,nfe,hora,fgbts } = req.body;
      const registro = await TBLRegistronet.findByPk(nserie);
      if (registro) {
         await TBLRegistronet.update(
            {
               nserie,
               nome,
               nomereg,
               programa,
               tipo,
               versao,
               nserieant,
               versaoant,
               serial,
               dataenv,
               data,
               valor,
               desconto,
               frete,
               pago,
               codrastre,
               rua,
               bairro,
               cidade,
               uf,
               cep,
               cgc,
               telefone,
               email,
               emailcc,
               nn,
               pp,
               obs,
               nfe,
               hora,
               fgbts,
            },
            { where: { nserie } }
         );
         return res.json(registro);
      }

      const addRecord = await TBLRegistronet.create({
         nserie,
         nome,
         nomereg,
         programa,
         tipo,
         versao,
         nserieant,
         versaoant,
         serial,
         dataenv,
         data,
         valor,
         desconto,
         frete,
         pago,
         codrastre,
         rua,
         bairro,
         cidade,
         uf,
         cep,
         cgc,
         telefone,
         email,
         emailcc,
         nn,
         pp,
         obs,
         nfe,
         hora,
         fgbts,
      });
      return res.json(addRecord);
   }
   // DELETA REGSITRONET
   async delregistronet(req, res) {
      const { id } = req.params;
      const sucess = await TBLRegistronet.destroy({ where: { nserie: id } });
      return res.json(sucess);
   }
   //LISTA REGISTRONET
   async lisregistronet(req, res) {
      const { id1, id2 } = req.params;
      // id1 = 'nserie' ou 'nome' ou 'email' será a coluna de pesquisa
      // id2 = o que foi digitado
      const registros = await TBLRegistronet.findAll({
         where: {
            [Op.or]: [
               { [`${id1}`]: { [Op.like]: `%${id2}%` } },
            ],
         },
         order: [
            [col(id1), 'ASC']
         ]
      });

      if (registros) {
         return res.json(registros);
      }

      return res.json({});
   }
   //
   // ATUALIZA CPF/CNPJ E EMAIL CURINGA - REGISTRO + REGISTRONET
   // Usada pela tela HABILITAR CHAVE VIRTUAL quando o cadastro esta com
   // CPF 99999999999 e/ou email contato@topocad2000.com.br.
   // Campos independentes: atualiza somente o que vier no body.
   async updcadastro(req, res) {
      const { nserie } = req.body;
      let { cgc, email } = req.body;

      if (!nserie) {
         return res.status(400).json({ ok: false, msg: 'NSERIE OBRIGATORIO' });
      }

      const campos = {};

      if (cgc) {
         cgc = String(cgc).replace(/\D/g, '');
         if (cgc.length === 11 || cgc.length === 14) {
            campos.cgc = cgc;
         }
      }

      if (email) {
         email = String(email).trim().toLowerCase();
         if (email.length > 4 && email.indexOf('@') > 0) {
            campos.email = email;
         }
      }

      if (Object.keys(campos).length === 0) {
         return res.json({ ok: false, msg: 'NADA A ATUALIZAR' });
      }

      const registro = await TBLRegistro.findByPk(nserie);
      const registronet = await TBLRegistronet.findByPk(nserie);

      if (!registro && !registronet) {
         return res.json({ ok: false, msg: 'NSERIE NAO ENCONTRADO' });
      }

      if (registro) {
         await TBLRegistro.update(campos, { where: { nserie } });
      }
      if (registronet) {
         await TBLRegistronet.update(campos, { where: { nserie } });
      }

      console.log('UPDCADASTRO', nserie, JSON.stringify(campos));

      return res.json({
         ok: true,
         nserie,
         registro: !!registro,
         registronet: !!registronet,
         cgc: campos.cgc || '',
         email: campos.email || '',
      });
   }
   //
   // CONSULTA REGISTRO
   async conregistro(req, res) {
      const { id } = req.params;
      const registro = await TBLRegistro.findByPk(id);
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }

   // CONSULTA REGISTRO NSEANT
   async conregistrova(req, res) {
      const { id } = req.params; //nseant
      const registros = await TBLRegistro.findOne({ where: { nseant: id } });
      if (registros) { return res.json(registros); }
      return res.json({});
   }

   // UPD REGISTRO
   async updregistro(req, res) {
      const { nserie, tipo, versao, cliente, cidade, uf, cgc, email, serial, nseant, verant, ndata, nn, pp } = req.body;
      const registro = await TBLRegistro.findByPk(nserie);
      if (registro) {
         await TBLRegistro.update(
            {
               nserie,
               tipo,
               versao,
               cliente,
               cidade,
               uf,
               cgc,
               email,
               serial,
               nseant,
               verant,
               ndata,
               nn,
               pp,
            },
            { where: { nserie } }
         );
         return res.json({ nserie, tipo, versao, cliente, cidade, uf, cgc, email, serial, nseant, verant, ndata, nn, pp });
      }

      const addRecord = await TBLRegistro.create({
         nserie,
         tipo,
         versao,
         cliente,
         cidade,
         uf,
         cgc,
         email,
         serial,
         nseant,
         verant,
         ndata,
         nn,
         pp,
      });
      return res.json(addRecord);
   }
   // DELETA REGSITRO
   async delregistro(req, res) {
      const { id } = req.params;
      const sucess = await TBLRegistro.destroy({ where: { nserie: id } });
      return res.json(sucess);
   }
   // CONSULTA REGISTRO TESTE
   async teste(req, res) {
      const { id } = req.params;
      const registro = await TBLRegistro.findByPk(id);
      if (registro) {
         return res.json("ENCONTRADO");
      }
      return res.json("*** NÃO ENCONTRADO ***");
   }
   // CONSULTA REGISTRO TESTE COM TOKEN
   async testex(req, res) {
      const { id } = req.params;
      const registro = await TBLRegistro.findByPk(id);
      if (registro) {
         return res.json("ENCONTRADO");
      }
      return res.json("*** NÃO ENCONTRADO ***");
   }
   //
   // LOGIN
   async login(req, res) {
      const { login, pass } = req.body;
      if (!!login && !!pass && login == 'testefixo' && pass == "87654321") {
         const token = jwt.sign({ login: login, pass: pass }, '12345678')
         return res.json({ token: token });
      }
      return res.sendStatus(400);
   }
   //

   //DADOSDAT
   async upddat(req, res) {
      const { nvxx, ndata } = req.body;
      const ndata4 = ndata.substring(0, 4);
      const registro = await TBLDadosdat.findOne({
         where: {
            nvxx: nvxx,
            ndata: ndata4
         }
      });

      if (registro) {
         registro.ntot = registro.ntot + 1;
         await TBLDadosdat.update({
            ntot: registro.ntot
         },
            { where: { id: registro.id } }
         );
         return res.json(registro);
      }
      const addRecord = await TBLDadosdat.create({
         nvxx: nvxx,
         ndata: ndata4,
         ntot: +1,
      });
      return res.json(addRecord);
   }
   //DADOSDATMAIL
   async incdatmail(req, res) {
      const { id1, id2, id3 } = req.params; // nmail, ndata, nhora
      const registro = await TBLDadosdatmail.findByPk(id1);
      if (registro) {
         return res.json({ id1 });
      }
      const addRecord = await TBLDadosdatmail.create({
         nmail: id1,
         ndata: id2,
         nhora: id3,
      });
      return res.json(addRecord);
   }
   //
   //DADOSDTH
   async upddth(req, res) {
      const { id1, id2, id3, id4, id5 } = req.params; // nserie0, cname, uname, ndata, nhora
      const registro = await TBLDadosdth.findByPk(id1);
      if (registro) {
         await TBLDadosdth.update(
            {
               nserie0: registro.nserie0,
               uname: id2,
               cname: id3,
               ndata: id4,
               nhora: id5,
            },
            { where: { nserie0: id1 } }
         );
         return res.json(registro);
      }
      const addRecord = await TBLDadosdth.create({
         nserie0: id1,
         uname: id2,
         cname: id3,
         ndata: id4,
         nhora: id5,
      });
      return res.json(addRecord);
   }
   //
   //DADOSINS
   async updins(req, res) {
      const { nserie0, uname, cname, ndata, nhora, chave, nvyy, cadv } = req.body;
      const registro = await TBLDadosins.findOne({
         where: {
            nserie0: nserie0,
            uname: uname,
            cname: cname
         }
      });

      if (registro) {
         registro.udata = ndata;
         registro.uhora = nhora;
         await TBLDadosins.update({
            udata: ndata,
            uhora: nhora,
            chave: registro.chave === 'X' || registro.chave === "5" ? 'X' : chave,
            nvyy: nvyy,
            cadv: cadv,
         },
            { where: { id: registro.id } }
         );
         return res.json(registro);
      }

      const addRecord = await TBLDadosins.create({
         nserie0: nserie0,
         uname: uname,
         cname: cname,
         ndata: ndata,
         nhora: nhora,
         udata: ndata,
         uhora: nhora,
         chave: chave,
         nvyy: nvyy,
         cadv: cadv,
      });
      return res.json(addRecord);
   }
   //LISTA DADOSINS
   async lisins(req, res) {
      const { id1 } = req.params; //nserie0
      const registros = await TBLDadosins.findAll({
         where: { nserie0: id1 }
      });

      if (registros) {
         return res.json(registros);
      }
      return res.json({});
   }
   //DELETA DADOSINS
   async delins(req, res) {
      const { nserie0, uname, cname } = req.body; // nserie0, uname, cname
      const sucess = await TBLDadosins.destroy({ where: { nserie0: nserie0, uname: uname, cname: cname } });
      return res.json(sucess);
   }
   //
   //TOTAL DADOSINS
   async totins(req, res) {
      const { id1 } = req.params; //nserie0
      // 23/10/2026: antes de contar, apaga as habilitacoes da serie sem uso ha mais de TOTINS_DIAS_INATIVO dias
      // (udata = AAMMDD do ultimo uso). PC formatado/trocado some sozinho e o usuario nao bate no limite.
      // Nao apaga as bloqueadas (chave X). Se o PC antigo voltar a ser usado, o updins recria o registro.
      try {
         const corte = totinsDataCorte(TOTINS_DIAS_INATIVO);
         const apagados = await TBLDadosins.destroy({
            where: {
               nserie0: id1,
               udata: { [Op.and]: [{ [Op.like]: '______' }, { [Op.lt]: corte }] },
               [Op.or]: [{ chave: null }, { chave: { [Op.notIn]: ['X', '5'] } }],
            },
         });
         if (apagados > 0) console.log('TOTINS inativas apagadas', id1, apagados, 'corte', corte);
      } catch (e) {
         console.log('TOTINS limpeza falhou', id1, e.message);
      }
      const totregistros = await TBLDadosins.count({ where: { nserie0: id1 } });
      return res.json(totregistros);
   }
   //DADOSINS000
   async updins000(req, res) {
      const { nvxx, uname, cname, ndata, nhora, nvyy, cadv } = req.body;
      const registro = await TBLDadosins000.findOne({ where: { nvxx: nvxx, uname: uname, cname: cname } });

      //return res.json(registro)

      if (registro) {
         registro.udata = ndata;
         registro.uhora = nhora;

         const idata = registro.ndata;
         const ihora = registro.nhora;
         const idataFormatada = `${idata.substring(2, 4)}/${idata.substring(4, 6)}/${idata.substring(0, 2)}`
         const ihoraFormatada = `${ihora.substring(0, 2)}:${ihora.substring(2, 4)}:${ihora.substring(4, 6)}`
         const idatacompleta = new Date(`${idataFormatada} ${ihoraFormatada}`)
         //console.log(idatacompleta + " <<< IDATA COMPLETA");

         const udata = ndata;
         const uhora = nhora;
         const udataFormatada = `${udata.substring(2, 4)}/${udata.substring(4, 6)}/${udata.substring(0, 2)}`
         const uhoraFormatada = `${uhora.substring(0, 2)}:${uhora.substring(2, 4)}:${uhora.substring(4, 6)}`
         const udatacompleta = new Date(`${udataFormatada} ${uhoraFormatada}`)
         //console.log(udatacompleta + " <<< UDATA COMPLETA");

         const diffTime = Math.abs(udatacompleta - idatacompleta);
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

         //return res.json({days:diffDays});

         //console.log(diffTime + " milliseconds");
         //console.log(diffDays + " = total de dias");

         registro.totd = diffDays;

         if (diffDays > 60) {
            const tempoDeEsperaEmMiliSegundos = 10000; //10seg
            await new Promise(resolve => setTimeout(resolve, tempoDeEsperaEmMiliSegundos));
         }

         await TBLDadosins000.update({
            udata: ndata,
            uhora: nhora,
            totd: diffDays,
            exe: '-',
            nvyy: nvyy,
            cadv: cadv,
         },
            { where: { id: registro.id } }
         );
         return res.json(registro);
      }
      const addRecord = await TBLDadosins000.create({
         nvxx: nvxx,
         uname: uname,
         cname: cname,
         ndata: ndata,
         nhora: nhora,
         udata: ndata,
         uhora: nhora,
         exe: '-',
         nvyy: nvyy,
         cadv: cadv,
      });
      return res.json(addRecord);
   }
   //DADOSINS000X
   async updins000X(req, res) {
      const { nvxx, uname, cname, ndata, nhora, nvyy, cadv } = req.body;
      const registro = await TBLDadosins000.findOne({ where: { nvxx: nvxx, uname: uname, cname: cname } });
      if (registro) {
         registro.udata = ndata;
         registro.uhora = nhora;

         const idata = registro.ndata;
         const ihora = registro.nhora;
         const idataFormatada = `${idata.substring(2, 4)}/${idata.substring(4, 6)}/${idata.substring(0, 2)}`
         const ihoraFormatada = `${ihora.substring(0, 2)}:${ihora.substring(2, 4)}:${ihora.substring(4, 6)}`
         const idatacompleta = new Date(`${idataFormatada} ${ihoraFormatada}`)
         //console.log(idatacompleta + " <<< IDATA COMPLETA");

         const udata = ndata;
         const uhora = nhora;
         const udataFormatada = `${udata.substring(2, 4)}/${udata.substring(4, 6)}/${udata.substring(0, 2)}`
         const uhoraFormatada = `${uhora.substring(0, 2)}:${uhora.substring(2, 4)}:${uhora.substring(4, 6)}`
         const udatacompleta = new Date(`${udataFormatada} ${uhoraFormatada}`)
         //console.log(udatacompleta + " <<< UDATA COMPLETA");

         const diffTime = Math.abs(udatacompleta - idatacompleta);
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         //console.log(diffTime + " milliseconds");
         //console.log(diffDays + " days");

         registro.totd = diffDays;

         await TBLDadosins000.update({
            udata: ndata,
            uhora: nhora,
            totd: diffDays,
            exe: 'X',
            nvyy: nvyy,
            cadv: cadv,
         },
            { where: { id: registro.id } }
         );
         return res.json(registro);
      }
      const addRecord = await TBLDadosins000.create({
         nvxx: nvxx,
         uname: uname,
         cname: cname,
         ndata: ndata,
         nhora: nhora,
         udata: ndata,
         uhora: nhora,
         exe: 'X',
         nvyy: nvyy,
         cadv: cadv,
      });
      return res.json(addRecord);
   }
   //DADOSINS000CAD - CADASTRO DO TESTE 30 DIAS (NOME / EMAIL / CIDADE / UF)
   async updins000cad(req, res) {
      const agora = cad000Agora();
      const b = req.body || {};
      const rep = {
         nvxx:   cad000Texto(b.nvxx, 255),
         uname:  cad000Texto(b.uname, 255),
         cname:  cad000Texto(b.cname, 255),
         ndata:  /^\d{6}$/.test(String(b.ndata || '')) ? String(b.ndata) : agora.data,
         nhora:  /^\d{6}$/.test(String(b.nhora || '')) ? String(b.nhora) : agora.hora,
         nvyy:   cad000Texto(b.nvyy, 255),
         cadv:   cad000Texto(b.cadv, 255),
         nome:   cad000Texto(b.nome, 255),
         email:  cad000Texto(b.email, 255).toLowerCase(),
         cidade: cad000Texto(b.cidade, 255),
         uf:     cad000Texto(b.uf, 10).toUpperCase(),
      };
      if (!rep.nvxx || !rep.uname || !rep.cname) {
         return res.status(400).json({ ok: 0, msg: 'DADOS INCOMPLETOS' });
      }
      try {
         await cad000GaranteColunas();
         const tab = TBLDadosins000.getTableName();
         const seq = TBLDadosins000.sequelize;
         const onde = 'nvxx = :nvxx AND uname = :uname AND cname = :cname';

         const achados = await seq.query(
            `SELECT id FROM [${tab}] WHERE ${onde}`,
            { replacements: rep, type: QueryTypes.SELECT }
         );
         if (achados.length > 0) {
            // ja existe (instalacao ja registrada): atualiza so os campos preenchidos
            await seq.query(
               `UPDATE [${tab}] SET
                   nome   = COALESCE(NULLIF(:nome, ''),   nome),
                   email  = COALESCE(NULLIF(:email, ''),  email),
                   cidade = COALESCE(NULLIF(:cidade, ''), cidade),
                   uf     = COALESCE(NULLIF(:uf, ''),     uf)
                WHERE ${onde}`,
               { replacements: rep }
            );
            return res.json({ ok: 1, acao: 'U', id: achados[0].id });
         }
         // nao existe: cria como a /apiupdins000 criaria, ja com o cadastro
         const novos = await seq.query(
            `INSERT INTO [${tab}] (nvxx, uname, cname, ndata, nhora, udata, uhora, exe, nvyy, cadv, nome, email, cidade, uf)
             OUTPUT INSERTED.id
             VALUES (:nvxx, :uname, :cname, :ndata, :nhora, :ndata, :nhora, '-', :nvyy, :cadv,
                     NULLIF(:nome, ''), NULLIF(:email, ''), NULLIF(:cidade, ''), NULLIF(:uf, ''))`,
            { replacements: rep, type: QueryTypes.SELECT }
         );
         return res.json({ ok: 1, acao: 'I', id: novos.length > 0 ? novos[0].id : 0 });
      } catch (err) {
         console.error('UPDINS000CAD ERRO:', err && err.message ? err.message : err);
         return res.status(500).json({ ok: 0, msg: 'ERRO' });
      }
   }
   //
   //DADOSTXT
   async updtxt(req, res) {
      const { id1, id2, id3 } = req.params; //ncmd, ntot, ndata

      //const registro = await TBLDadostxt.findByPk(id1);
      const registro = await TBLDadostxt.findOne({ where: { ncmd: id1, ndata: id3 } });

      if (registro) {
         await TBLDadostxt.update(
            {
               ncmd: registro.ncmd,
               ntot: registro.ntot + +id2,
               ndata: registro.ndata,
            },
            //{ where: {ncmd: id1} }
            { where: { ncmd: id1, ndata: id3 } }
         );
         return res.json(registro);
      }

      const addRecord = await TBLDadostxt.create({ ncmd: id1, ntot: +id2, ndata: id3 });
      return res.json(addRecord);
   }

   //CONSULTA ATUALIZAÇÕES
   async conatu(req, res) {
      const { id1 } = req.params; //nvxx
      const registro = await TBLAtualiza.findByPk(id1);
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   //
     //NAOREG - UMA LINHA POR SERIAL (nserie0) COM CONTADOR (ncont)
   //SE O SERIAL JA EXISTE: SOMA 1 NO ncont E GRAVA OS DADOS DA ULTIMA OCORRENCIA
   //SE NAO EXISTE: CRIA A LINHA COM ncont = 1
   async updnreg(req, res) {
      const { nserie0, uname, cname, ndata, nhora, ntipo } = req.body;
      const registro = await TBLNaoreg.findOne({
         where: {
            nserie0: nserie0
         }
      });
      if (registro) {
         await registro.update({
            uname: uname,
            cname: cname,
            ndata: ndata,
            nhora: nhora,
            ntipo: ntipo,
            ncont: (registro.ncont || 0) + 1,
         });
         return res.json(registro);
      }
      const addRecord = await TBLNaoreg.create({
         nserie0: nserie0,
         uname: uname,
         cname: cname,
         ndata: ndata,
         nhora: nhora,
         ntipo: ntipo,
         ncont: 1,
      });
      return res.json(addRecord);
   }
   ////////////////////////////////////////////////////
   ////////////////////////////////////////////////////
   async show(req, res) {
      const { id } = req.params;
      const registro = await TBLRegistro.findByPk(id);
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }

   async update(req, res) {
      const { nserie, tipo, versao, email, cliente, cgc } = req.body;
      const registro = await TBLRegistro.findByPk(nserie);
      if (registro) {
         await TBLRegistro.update(
            {
               nserie,
               tipo,
               versao,
               email,
               cliente,
               cgc,
            },
            { where: { nserie } }
         );

         return res.json({ nserie, tipo, versao, email, cliente, cgc });
      }

      const addRecord = await TBLRegistro.create({
         nserie,
         tipo,
         versao,
         email,
         cliente,
         cgc,
      });

      return res.json(addRecord);
   }

   async delete(req, res) {
      const { id } = req.params;
      const sucess = await TBLRegistro.destroy({ where: { nserie: id } });

      return res.json(sucess);
   }

   async index(req, res) {
      const registros = await TBLRegistro.findAll();
      if (registros) {
         return res.json(registros);
      }
      return res.json({});
   }

   async count(req, res) {
      const sucess = await TBLRegistro.count();
      return res.json(sucess);
   }

   /** API Imóveis */

   async getImoveis(req, res) {
      const { cpj } = req.params
      const imoveis = await TBXimovel.findAll({
         where: { cpj },
         order: [[col('imovel'), 'ASC']]
      });
      if (imoveis) {
         return res.json(imoveis);
      }
      return res.json([]);
   }

   async searchImoveis(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXimovel.findAll({
         where: { 'imovel': { [Op.like]: `%${predicate}%` }, cpj },
         order: [[col('imovel'), 'ASC']]
      }))
   }

   async getImoveisByIndex(req, res) {
      const { cpj, index } = req.params;

      const imoveis = await TBXimovel.findAll({
         where: { cpj },
         order: [[col('imovel'), 'ASC']]
      });

      if (imoveis) {
         return res.json(imoveis[+index]);
      }

      return res.json({});
   }

   async getImoveisById(req, res) {
      const { id } = req.params;
      const imovel = await TBXimovel.findByPk(id);
      if (imovel) {
         return res.json(imovel);
      }
      return res.json({});
   }

   async upsertImoveis(req, res) {
      const { id } = req.params;
      const { cpj, imovel, proprieta, cpfpj, matricula, cartorio, codincra, certifica, municipio, estado, comarca, atrt } = req.body;
      if (id && id > 0) {
         await TBXimovel.update(
            {
               cpj,
               imovel,
               proprieta,
               cpfpj,
               matricula,
               cartorio,
               codincra,
               certifica,
               municipio,
               estado,
               comarca,
               atrt
            },
            { where: { id } }
         );

         return res.json({ Id: id, cpj, imovel, proprieta, cpfpj, matricula, cartorio, codincra, certifica, municipio, estado, comarca, atrt });
      }

      const imovelExists = await TBXimovel.count({ where: { imovel, cpj } })

      if (imovelExists > 0)
         return res.json({ errorMessage: "Imóvel já existe!" }).status(400)

      const addRecord = await TBXimovel.create({
         cpj,
         imovel,
         proprieta,
         cpfpj,
         matricula,
         cartorio,
         codincra,
         certifica,
         municipio,
         estado,
         comarca,
         atrt
      });

      return res.json(addRecord);
   }

   async deleteImoveis(req, res) {
      const { id } = req.params;
      const sucess = await TBXimovel.destroy({ where: { id: id } });

      return res.json(sucess);
   }

   /** API Proprietários */

   async getProprieta(req, res) {
      const { cpj } = req.params
      const proprietarios = await TBXproprieta.findAll({
         where: { cpj },
         order: [[col('proprieta'), 'ASC']]
      });
      if (proprietarios) {
         return res.json(proprietarios);
      }
      return res.json([]);
   }

   async searchProprietarios(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXproprieta.findAll({
         where: { 'proprieta': { [Op.like]: `%${predicate}%` }, cpj },
         order: [[col('proprieta'), 'ASC']]
      }))
   }

   async getProprietaByIndex(req, res) {
      const { cpj, index } = req.params;

      const proprietarios = await TBXproprieta.findAll({
         where: { cpj },
         order: [[col('proprieta'), 'ASC']]
      });

      if (proprietarios) {
         return res.json(proprietarios[+index]);
      }

      return res.json({});
   }

   async getProprietaById(req, res) {
      const { id } = req.params;
      const proprietario = await TBXproprieta.findByPk(id);
      if (proprietario) {
         return res.json(proprietario);
      }
      return res.json({});
   }

   async upsertProprieta(req, res) {
      const { id } = req.params;
      const { cpj, proprieta, identifica, endereco, cpfpj, conjuge, conjudenti, conjucpf } = req.body;
      if (id && id > 0) {
         await TBXproprieta.update(
            {
               cpj,
               proprieta,
               identifica,
               endereco,
               cpfpj,
               conjuge,
               conjudenti,
               conjucpf
            },
            { where: { id } }
         );

         return res.json({ Id: id, cpj, proprieta, identifica, endereco, cpfpj, conjuge, conjudenti, conjucpf });
      }

      const proprietarioExists = await TBXproprieta.count({ where: { proprieta, cpj } })

      if (proprietarioExists > 0)
         return res.json({ errorMessage: "Proprietário já existe!" }).status(400)

      const addRecord = await TBXproprieta.create({
         cpj,
         proprieta,
         identifica,
         endereco,
         cpfpj,
         conjuge,
         conjudenti,
         conjucpf
      });

      return res.json(addRecord);
   }

   async deleteProprieta(req, res) {
      const { id } = req.params;
      const sucess = await TBXproprieta.destroy({ where: { id: id } });

      return res.json(sucess);
   }

   /** API Responsáveis Técnicos */

   async getResptec(req, res) {
      const { cpj } = req.params
      const responsaveisTecnico = await TBXresptec.findAll({
         where: { cpj },
         order: [[col('respetec'), 'ASC']]
      });
      if (responsaveisTecnico) {
         return res.json(responsaveisTecnico);
      }
      return res.json([]);
   }

   async searchResptecs(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXresptec.findAll({
         where: { 'respetec': { [Op.like]: `%${predicate}%` }, cpj },
         order: [[col('respetec'), 'ASC']]
      }))
   }

   async getResptecByIndex(req, res) {
      const { cpj, index } = req.params;

      const responsavelTecnicos = await TBXresptec.findAll({
         where: { cpj },
         order: [[col('respetec'), 'ASC']]
      });

      if (responsavelTecnicos) {
         return res.json(responsavelTecnicos[+index]);
      }

      return res.json({});
   }

   async getResptecById(req, res) {
      const { id } = req.params;
      const responsavelTecnico = await TBXresptec.findByPk(id);
      if (responsavelTecnico) {
         return res.json(responsavelTecnico);
      }
      return res.json({});
   }

   async upsertResptec(req, res) {
      const { id } = req.params;
      const { cpj, respetec, titulo, xcr, ncr } = req.body;
      if (id && id > 0) {
         await TBXresptec.update(
            {
               cpj,
               respetec,
               titulo,
               xcr,
               ncr
            },
            { where: { id } }
         );

         return res.json({ Id: id, cpj, respetec, titulo, xcr, ncr });
      }

      const respetecExists = await TBXresptec.count({ where: { respetec, cpj } })

      if (respetecExists > 0)
         return res.json({ errorMessage: "Responsável Técnico já existe!" }).status(400)

      const addRecord = await TBXresptec.create({
         cpj,
         respetec,
         titulo,
         xcr,
         ncr
      });

      return res.json(addRecord);
   }

   async deleteResptec(req, res) {
      const { id } = req.params;
      const sucess = await TBXresptec.destroy({ where: { id: id } });

      return res.json(sucess);
   }

   async wixPayLoad(req, res) {
      console.log("Webhook Payload: ", JSON.stringify(req.body));
      const { paymentStatus, orderNumber, buyerEmail, lineItems, billingInfo } = req.body.data;

      console.log("Payment status: ", paymentStatus);
      if (paymentStatus != 'PAID') {
         return res.status(200).send();
      }

      await Promise.all(lineItems.map(async (item) => {
         console.log("Item: ", JSON.stringify(item));
         const { action, program } = getAction(item.catalogItemId);
         console.log("Action: ", action);
         switch (action) {
            case "create": {
               await createLicenseFromAutomation(billingInfo, buyerEmail, orderNumber, item, program);
               break;
            }
            case "update": {
               await updateLicenceFromAutomation(billingInfo, buyerEmail, orderNumber, item, program);
               break;
            }
         }
      }));

      return res.status(200).send();
   }



   async mlCallback(req, res) {
      const { code } = req.query;
      if (!code) return res.status(400).send('Faltou o parametro code.');
      try {
         const r = await mlPost('/oauth/token', {
            grant_type: 'authorization_code',
            client_id: ML_CLIENT_ID,
            client_secret: ML_CLIENT_SECRET,
            code,
            redirect_uri: ML_REDIRECT_URI,
         });
         if (!r.refresh_token) return res.status(400).send('Erro ML: ' + JSON.stringify(r));

         mlAccessToken  = r.access_token;
         mlTokenExpira  = Date.now() + ((r.expires_in || 21600) - 300) * 1000;
         mlRefreshToken = r.refresh_token;

         return res.send(
            '<h3>Autorizado.</h3><p>Copie o valor abaixo e salve no Azure ' +
            'como a variavel ML_REFRESH_TOKEN:</p><pre>' + r.refresh_token + '</pre>'
         );
      } catch (e) {
         console.log('mlCallback erro:', e.message);
         return res.status(500).send('Erro: ' + e.message);
      }
   }

   async mlWebhook(req, res) {
      res.status(200).send();          // responde na hora, o ML exige

      try {
         const { topic, resource } = req.body || {};
         if (topic !== 'orders_v2' || !resource) return;

         const pedidoId = String(resource).split('/').pop();
         const pedido   = await mlGet(`/orders/${pedidoId}`);

         const chave = `${pedidoId}-${pedido.status}`;
         if (mlAvisados.has(chave)) return;
         mlAvisados.add(chave);

         let lic = null;

         const criado  = new Date(pedido.date_created || 0);
         const recente = criado >= new Date('2026-09-11T00:00:00-03:00');

         if (pedido.status === 'paid' && recente) {
            lic = await mlGeraSerial(pedido);
            if (lic && !lic.repetido) {
               await mlEnviaSerial(pedido, lic);
            } else if (!lic) {
               await mlEnviaMensagem(pedido);
            }
         }

         await mlAvisaVenda(pedido, lic);
      } catch (e) {
         console.log('mlWebhook erro:', e.message);
      }
   }

   async mlDiag(req, res) {
      if (req.params.chave !== 'microcad2026') return res.status(404).send();

      const out = {
         clientId: ML_CLIENT_ID ? 'DEFINIDO' : 'VAZIO',
         clientSecret: ML_CLIENT_SECRET ? 'DEFINIDO' : 'VAZIO',
         redirectUri: ML_REDIRECT_URI || 'VAZIO',
         refreshTokenEnv: process.env.ML_REFRESH_TOKEN ? String(process.env.ML_REFRESH_TOKEN).slice(0, 10) + '...' : 'VAZIO',
      };

      try {
         const r = await mlPost('/oauth/token', {
            grant_type: 'refresh_token',
            client_id: ML_CLIENT_ID,
            client_secret: ML_CLIENT_SECRET,
            refresh_token: mlRefreshToken,
         });
         out.tokenOk = !!r.access_token;
         if (r.access_token) {
            mlAccessToken = r.access_token;
            mlTokenExpira = Date.now() + ((r.expires_in || 21600) - 300) * 1000;
            if (r.refresh_token) mlRefreshToken = r.refresh_token;
         } else {
            out.tokenErroML = r;
            return res.json(out);
         }
      } catch (e) {
         out.tokenErro = e.message;
         return res.json(out);
      }

      try {
         const me = await mlGet('/users/me');
         out.conta = { id: me.id, nickname: me.nickname, erro: me.message || me.error };
      } catch (e) {
         out.contaErro = e.message;
      }

      const pid = req.query.pedido;
      if (pid) {
         try {
            const p = await mlGet(`/orders/${pid}`);
            out.pedido = {
               id: p.id,
               status: p.status,
               dataCriado: p.date_created,
               anuncio: p.order_items && p.order_items[0] && p.order_items[0].item ? p.order_items[0].item.id : null,
               erro: p.message || p.error,
            };
         } catch (e) {
            out.pedidoErro = e.message;
         }
      }
      if (pid && req.query.gerar === '1') {
         try {
            const p = await mlGet(`/orders/${pid}`);
            const lic = await mlGeraSerial(p);
            out.gerar = lic;
         } catch (e) {
            out.gerarErro = String(e.stack || e.message).split('\n').slice(0, 3).join(' | ');
         }
      }
      return res.json(out);
   }
}
   
const createLicenseFromAutomation = async (billingInfo, buyerEmail, orderNumber, item, program) => {
   const { nserie, lastVersion } = await getNextNserie(program);

// const { firstName, lastName, vatId } = billingInfo.contactDetails;
   const { firstName, lastName, vatId } = billingInfo.contactDetails || {};

// const { city, subdivision, postalCode } = billingInfo.address
   const { city, subdivision, postalCode } = billingInfo.address || {};

   const tipo = getType(vatId?.type);
   const versao = lastVersion;
   const email = buyerEmail;
// const cliente = `${firstName} ${lastName}`;
   const cliente = (`${firstName || ""} ${lastName || ""}`.trim() || buyerEmail).toUpperCase();
   const nome = cliente;
   const nomereg = cliente;
   const cgc = vatId?.id || "99999999999";
   const data = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
   const pago = `WIX-${orderNumber}`;
   const cidade = city || "X";
   const uf = getUF(subdivision) || "XX";
// const cep = postalCode;
   const cep = postalCode || "00000-000";

   const programa = program;
   const valor = item.totalPrice.value;
   const nn = '1';
   const pp = "BR";

   await TBLRegistronet.create({
      nserie,
      nome,
      nomereg,
      tipo,
      versao,
      data,
      pago,
      cidade,
      uf,
      cep,
      cgc,
      email,
      programa,
      valor,
      nn,
      pp
   });

   const registro = await TBLRegistro.create({
      nserie,
      tipo,
      versao,
      email,
      cliente,
      cgc,
      cidade,
      uf,
      nn,
      pp
   });

   console.log("License number: ", registro.nserie);

   await sendLicenseEmail(registro, cliente, uf, program);
}

//const getUF = (subdivision) => {
//   const [country, uf] = subdivision.split("-");
//   return uf;
//}
const getUF = (subdivision) => {
   if (!subdivision) return "XX";
   const parts = subdivision.split("-");
   return parts[1] || "XX";
}

const updateLicenceFromAutomation = async (billingInfo, buyerEmail, orderNumber, item, program) => {
   const { nserie, lastVersion } = await getNextNserie(program);

// const { firstName, lastName, vatId } = billingInfo.contactDetails;
   const { firstName, lastName, vatId } = billingInfo.contactDetails || {};

// const { city, subdivision, postalCode } = billingInfo.address
   const { city, subdivision, postalCode } = billingInfo.address || {};

// const { nserieant, versaoant } = getNserieAndVersaoAnt(program);
   const { nserieant, versaoant } = getNserieAndVersaoAnt(program) || {};

   const tipo = getType(vatId?.type);
   const versao = lastVersion;
   const email = buyerEmail;
// const cliente = `${firstName} ${lastName}`;
   const cliente = (`${firstName || ""} ${lastName || ""}`.trim() || buyerEmail).toUpperCase();
   const nome = cliente;
   const nomereg = cliente;
   const cgc = vatId?.id || "99999999999";
   const data = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
   const pago = `WIX-${orderNumber}`;
   const cidade = city || "X";
   const uf = getUF(subdivision) || "XX";
// const cep = postalCode;
   const cep = postalCode || "00000-000";

   const programa = program;
   const valor = item.totalPrice.value;
   const nn = '1';
   const pp = "BR";

   await TBLRegistronet.create({
      nserie,
      nserieant,
      nome,
      nomereg,
      tipo,
      versao,
      versaoant,
      data,
      pago,
      cidade,
      uf,
      cep,
      cgc,
      email,
      programa,
      valor,
      nn,
      pp
   });

   const registro = await TBLRegistro.create({
      nserie,
      nseant: nserieant,
      tipo,
      versao,
      verant: versaoant,
      email,
      cliente,
      cgc,
      cidade,
      uf,
      cep,
      nn,
      pp
   });

   console.log("License number: ", registro.nserie);

   await sendLicenseEmail(registro, cliente, uf, program);
}

const getNserieAndVersaoAnt = (program) => {
   const values = {
      "TOPOCAD": { nserieant: "TXXYYYY", versaoant: "VXX" },
      "MEMORIAL": { nserieant: "MXXYYY", versaoant: "MXX" },
      "PERFIS": { nserieant: "PXXYY", versaoant: "PXX" },
      "QFCAD": { nserieant: "QXXYY", versaoant: "QXX" }
   };

   return values[program];
}

const getType = (type) => {
   return type && type == 'CNPJ' ? 'B' : 'A';
}

const getNextNserie = async (program) => {
   const { nserie, versao } = await TBLRegistronet.findOne({
      order: [
         [col('nserie'), 'DESC']
      ],
      where: { programa: program }
   });
   const onlyNumbers = nserie.replace(/([^0-9]+)/gi, "");
   const letter = nserie.replace(/([^a-zA-Z]+)/gi, "");
   const extraDigit = program == "QFCAD" ? "0" : "";
   return { nserie: `${letter}${extraDigit}${Number(onlyNumbers) + 1}`, lastVersion: versao };
}

const getAction = (productId) => {
   const actions = {
      "be31f5b4-10cf-7a61-db8c-7d468bbf7583": { action: "create", program: "TOPOCAD" }, //TOPOCAD2000 V19
      "01df1086-d817-a377-f524-8a79b56547a2": { action: "update", program: "TOPOCAD" }, //TOPOCAD2000 V19 TESTE R$1,00
      "6c7f7a4d-ae62-d25d-1d9d-877cec140a16": { action: "update", program: "TOPOCAD" }, //TOPOCAD2000 V18/V19 nserieant = TXXYYYY
      "eeee001c-4671-61d2-7756-bf5a676ace1c": { action: "update", program: "TOPOCAD" }, //TOPOCAD2000 V17/V19 nserieant = TXXYYYY
      "8ff9ec96-26df-4037-6a80-8d55b4151223": { action: "update", program: "TOPOCAD" }, //TOPOCAD2000 VXX/V19 nserieant = TXXYYYY

      "6e262a99-bf61-e906-f029-6bdbd88f728a": { action: "create", program: "MEMORIAL" }, //MEMORIALCAD V9
      "d530e78e-cd16-f799-f7ca-797a137da267": { action: "create", program: "MEMORIAL" }, //MEMORIALCAD V9 TESTE R$1,00
      "0b81a3d2-bbaf-0b3f-f9bc-ad58821f2eca": { action: "update", program: "MEMORIAL" }, //MEMORIALCAD VX/V9 nserieant = MXXYY

      "3013644781": { action: "create", program: "PERFIS" }, //PERFIS2000 V12
      "c0e38d0d-01d1-7200-7717-ca17c4e6a9bc": { action: "create", program: "PERFIS" }, //PERFIS2000 V12 TESTE R$1,00
      "4625346131": { action: "update", program: "PERFIS" }, //PERFIS2000 VXX/V12 nserieant = PXXYY

      "3014244621": { action: "create", program: "QFCAD" }, //QFCAD2000 V6
      "709623d7-7f91-13d2-44e4-ff823b4a6294": { action: "create", program: "QFCAD" }, //QFCAD2000 V6 TESTE R$1,00
      "4652686311": { action: "update", program: "QFCAD" } //QFCAD2000 VX/V6 nserieant = QXXYY

   }

   return actions[productId];
}

const sendLicenseEmail = async (registro, nome, uf, programa) => {
   const { cgc, email, versao, nserie } = registro;
   const transporter = nodemailer.createTransport(emailConfig);

   const programName = getProgramName(programa);

   var mailOptions = {
      from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
      to: `${email}, microcad@amicrocad.com.br`,
      subject: `${programName} ${versao} - ${nserie} * CHAVE VIRTUAL`,
      text: `*${programName} ${versao} - ${nserie} >>> ${nome}-${uf}
      1-Clique no link a seguir para baixar / instalar / atualizar ${programName} ${versao} (caso ainda não tenha feito).
      https://microcad.blob.core.windows.net/downloads/${programName}${versao}.exe
      2-Abra o AutoCAD / BricsCAD / GstarCAD / ZwCAD, acesse um menu do ${programName} e clique em MICROCAD
      3-Clique em HABILITAR PARA CHAVE VIRTUAL.
      4-Informe o NUMERO DE SERIE / EMAIL / CPF ou CNPJ.
      Número de Série: >>> ${nserie} <<< TIPO =A (CPF) =B (CNPJ)
      Email: >>> ${email} <<< 
      CPF / CNPJ: >>> ${cgc} <<`
   };

   transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
         console.log(error);
         return res.send({ status: false })
      } else {
         console.log('Email sent: ' + info.response);
         return res.send({ status: true })
      }
   });
}

const getProgramName = (program) => {
   switch (program) {
      case "TOPOCAD": return "TOPOCAD2000";
      case "MEMORIAL": return "MEMORIALCAD";
      case "PERFIS": return "PERFIS2000";
      case "QFCAD": return "QFCAD2000"
   }
}

export default new LicenseController();
