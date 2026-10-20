// ================================================================
// CONECTOR MCP (SO LEITURA) - CONSULTA DE USUARIO DO REGISTRONET
// Usado pelo Claude (conector personalizado do claude.ai) para
// responder e-mails de suporte do TOPOCAD2000.
//
// Rota:
//   POST /mcp/:chave   -> MCP Streamable HTTP (JSON-RPC 2.0, sem SSE,
//                         sem sessao). GET/DELETE respondem 405.
//
// Variavel de ambiente necessaria (App Service > Environment):
//   MCP_CHAVE  -> segredo que vai no caminho da URL. Sem ela a rota
//                 responde 404 (conector desligado).
//
// URL do conector no claude.ai:
//   https://microcad.azurewebsites.net/mcp/<MCP_CHAVE>
//
// Ferramenta: consulta_usuario(email | cgc)
//   Procura em TBLRegistronet (email, emailcc ou cgc) e devolve, por
//   numero de serie: nome, cidade/UF, programa, versao, serie/versao
//   anterior, data do registro, ocorrencias de instalacao (TBLDadosins:
//   computador, ultima utilizacao, versao instalada, CAD) e a ultima
//   atualizacao da versao (TBLAtualiza) com o aviso de desatualizado.
//   NAO devolve CPF/CNPJ, endereco, telefone nem valores.
//   Somente SELECT: nenhuma gravacao no banco.
// ================================================================

import { Router } from 'express';
import { Op, QueryTypes } from 'sequelize';

import TBLRegistronet from './app/models/TBLRegistronet';
import TBLDadosins from './app/models/TBLDadosins';
import TBLAtualiza from './app/models/TBLAtualiza';

const router = new Router();

const MCP_CHAVE = process.env.MCP_CHAVE || '';
const MCP_VERSOES = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MCP_MAX_SERIES = 20;

// programa (TBLRegistronet) -> prefixo do nvxx (TBLAtualiza)
const PROGRAMA_PREFIXO = {
   TOPOCAD: 'TOP',
   QFCAD: 'QFC',
   PERFIS: 'PER',
   MEMORIAL: 'MEM',
};

// ---------------------------------------------------------------
// Utilitarios de formato
// ---------------------------------------------------------------
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim());

const soDigitos = (v) => txt(v).replace(/\D/g, '');

// yyMMdd -> dd/MM/yy
const fmtData6 = (d) => {
   const s = soDigitos(d);
   if (s.length !== 6) return txt(d);
   return `${s.substring(4, 6)}/${s.substring(2, 4)}/${s.substring(0, 2)}`;
};

// HHmmss -> HH:mm
const fmtHora6 = (h) => {
   const s = soDigitos(h);
   if (s.length < 4) return txt(h);
   return `${s.substring(0, 2)}:${s.substring(2, 4)}`;
};

// "V2150" ou "V21.60" -> 2150 / 2160 (null se nao der para ler)
const versaoNumero = (v) => {
   const s = soDigitos(v);
   if (!s) return null;
   return parseInt(s, 10);
};

// yyMMdd + HHmmss -> numero comparavel para ordenar (mais recente primeiro)
const ordemDataHora = (d, h) => parseInt((soDigitos(d) || '000000') + (soDigitos(h) || '000000').padEnd(6, '0'), 10);

// ---------------------------------------------------------------
// Consulta (somente leitura)
// ---------------------------------------------------------------
const buscaRegistros = async (email, cgc) => {
   const seq = TBLRegistronet.sequelize;
   const tab = TBLRegistronet.getTableName();

   if (email) {
      // email exato (minusculas) ou presente no emailcc (pode ter varios separados por ; ou ,)
      return TBLRegistronet.findAll({
         where: {
            [Op.or]: [
               seq.where(seq.fn('LOWER', seq.col('email')), email),
               { emailcc: { [Op.like]: `%${email}%` } },
            ],
         },
         order: [['nserie', 'DESC']],
         limit: MCP_MAX_SERIES,
      });
   }

   // cgc: compara so os digitos (no banco pode estar com pontos, barra e traco)
   const linhas = await seq.query(
      `SELECT TOP (${MCP_MAX_SERIES}) *
         FROM [${tab}]
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(cgc,''), '.', ''), '-', ''), '/', ''), ' ', '') = :cgc
        ORDER BY nserie DESC`,
      { replacements: { cgc }, type: QueryTypes.SELECT }
   );
   return linhas;
};

const buscaInstalacoes = async (nserie) =>
   TBLDadosins.findAll({
      where: { nserie0: { [Op.like]: `${nserie}%` } },
   });

const montaAtualiza = (atualizaLista, programa, versao) => {
   const prefixo = PROGRAMA_PREFIXO[txt(programa).toUpperCase()] || txt(programa).toUpperCase().substring(0, 3);
   const chave = (prefixo + txt(versao).toUpperCase()).trim();
   const linha = atualizaLista.find((a) => txt(a.nvxx).toUpperCase() === chave);
   if (!linha) return { nvxx: chave, ultima_atualizacao: '', data_ultima_atualizacao: '', numero: null };
   return {
      nvxx: chave,
      ultima_atualizacao: txt(linha.nvxxyy),
      data_ultima_atualizacao: txt(linha.ndata),
      numero: versaoNumero(linha.nvxxyy),
   };
};

const montaInstalacoes = (instalacoes, ultimaNumero) =>
   instalacoes
      .slice()
      .sort((a, b) => ordemDataHora(b.udata, b.uhora) - ordemDataHora(a.udata, a.uhora))
      .map((i) => {
         const instNumero = versaoNumero(i.nvyy);
         let desatualizado = null;
         if (instNumero !== null && ultimaNumero !== null) desatualizado = instNumero < ultimaNumero;
         return {
            serie_instalacao: txt(i.nserie0),
            computador: txt(i.cname),
            usuario_windows: txt(i.uname),
            primeira_utilizacao: `${fmtData6(i.ndata)} ${fmtHora6(i.nhora)}`.trim(),
            ultima_utilizacao: `${fmtData6(i.udata)} ${fmtHora6(i.uhora)}`.trim(),
            versao_instalada: txt(i.nvyy),
            versao_cad: txt(i.cadv),
            desatualizado,
         };
      });

const montaResumo = (consulta, series) => {
   if (series.length === 0) {
      return (
         `${consulta}: NAO ENCONTRADO no cadastro (TBLRegistronet). ` +
         'Nao ha numero de serie com este e-mail/CPF-CNPJ. ' +
         'Isso NAO significa teste de 30 dias: pode ser outro e-mail no cadastro, ' +
         'usuario em teste (o teste nao exige cadastro) ou uso nao autorizado da licenca. ' +
         'Pedir ao usuario o numero de serie ou o e-mail usado na compra.'
      );
   }
   const linhas = [`${consulta}: ${series.length} numero(s) de serie encontrado(s).`];
   series.forEach((s) => {
      linhas.push(
         `- ${s.nserie} | ${s.nome} | ${s.cidade}/${s.uf} | ${s.programa} ${s.versao_comprada}` +
            (s.nserie_anterior ? ` (anterior: ${s.nserie_anterior} ${s.versao_anterior})` : '') +
            ` | registro em ${s.data_registro} | ultima atualizacao da versao: ${s.ultima_atualizacao || 'nao cadastrada'}`
      );
      if (s.instalacoes.length === 0) {
         linhas.push('    sem ocorrencia de instalacao (nunca habilitou ou ainda nao usou).');
      }
      s.instalacoes.forEach((i) => {
         let estado = 'versao instalada desconhecida';
         if (i.desatualizado === true) estado = `DESATUALIZADO (instalada ${i.versao_instalada}, ultima ${s.ultima_atualizacao})`;
         if (i.desatualizado === false) estado = `atualizado (${i.versao_instalada})`;
         linhas.push(`    ${i.computador} | ultimo uso ${i.ultima_utilizacao} | CAD ${i.versao_cad || '?'} | ${estado}`);
      });
   });
   return linhas.join('\n');
};

const consultaUsuario = async (args) => {
   const email = txt(args && args.email).toLowerCase();
   const cgc = soDigitos(args && args.cgc);

   if (!email && !cgc) {
      return { erro: 'INFORME email OU cgc (CPF/CNPJ).' };
   }
   if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { erro: 'E-MAIL INVALIDO.' };
   }
   if (!email && cgc.length !== 11 && cgc.length !== 14) {
      return { erro: 'CPF/CNPJ INVALIDO (11 ou 14 digitos).' };
   }

   const consulta = email || `CPF/CNPJ ${cgc}`;
   const registros = await buscaRegistros(email, cgc);

   let atualizaLista = [];
   if (registros.length > 0) atualizaLista = await TBLAtualiza.findAll();

   const series = [];
   for (const r of registros) {
      const atu = montaAtualiza(atualizaLista, r.programa, r.versao);
      const instalacoes = await buscaInstalacoes(txt(r.nserie));
      const inst = montaInstalacoes(instalacoes, atu.numero);
      series.push({
         nserie: txt(r.nserie),
         nome: txt(r.nome),
         cidade: txt(r.cidade),
         uf: txt(r.uf),
         programa: txt(r.programa),
         versao_comprada: txt(r.versao),
         nserie_anterior: txt(r.nserieant),
         versao_anterior: txt(r.versaoant),
         data_registro: txt(r.data),
         situacao: 'CADASTRADO',
         ultima_atualizacao: atu.ultima_atualizacao,
         data_ultima_atualizacao: atu.data_ultima_atualizacao,
         desatualizado: inst.some((i) => i.desatualizado === true),
         instalacoes: inst,
      });
   }

   return {
      consulta,
      encontrado: series.length > 0,
      total_series: series.length,
      series,
      resumo: montaResumo(consulta, series),
   };
};

// ---------------------------------------------------------------
// MCP (JSON-RPC 2.0)
// ---------------------------------------------------------------
const FERRAMENTAS = [
   {
      name: 'consulta_usuario',
      description:
         'Consulta o cadastro do REGISTRONET (Microcad) pelo e-mail ou pelo CPF/CNPJ do usuario e devolve, ' +
         'para cada numero de serie encontrado: nome, cidade/UF, programa, versao comprada, serie/versao anterior, ' +
         'data do registro, ocorrencias de instalacao (computador, ultima utilizacao, versao instalada, versao do CAD) ' +
         'e a ultima atualizacao disponivel da versao, indicando se o usuario esta desatualizado. ' +
         'Somente leitura. Nao devolve CPF/CNPJ, endereco, telefone nem valores. ' +
         'Se nao encontrar, NAO significa teste de 30 dias: pode ser outro e-mail no cadastro ou uso nao autorizado.',
      inputSchema: {
         type: 'object',
         properties: {
            email: { type: 'string', description: 'E-mail do usuario (como veio no e-mail de suporte).' },
            cgc: { type: 'string', description: 'CPF ou CNPJ do usuario (so digitos ou formatado). Usar quando nao houver e-mail.' },
         },
      },
   },
];

const rpcErro = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const rpcOk = (id, result) => ({ jsonrpc: '2.0', id, result });

const trataMensagem = async (msg) => {
   if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return rpcErro(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid Request');
   }
   const { id, method, params } = msg;
   const ehNotificacao = id === undefined || id === null;

   switch (method) {
      case 'initialize': {
         const pedida = params && params.protocolVersion;
         const versao = MCP_VERSOES.includes(pedida) ? pedida : MCP_VERSOES[0];
         return rpcOk(id, {
            protocolVersion: versao,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'microcad-registronet', version: '1.0.0' },
            instructions:
               'Conector somente leitura do REGISTRONET (Microcad). Use consulta_usuario com o e-mail do remetente ' +
               'do e-mail de suporte (ou o CPF/CNPJ) para saber se e usuario cadastrado, a versao comprada, ' +
               'a versao instalada em cada computador e se esta com a ultima atualizacao.',
         });
      }
      case 'ping':
         return rpcOk(id, {});
      case 'tools/list':
         return rpcOk(id, { tools: FERRAMENTAS });
      case 'tools/call': {
         const nome = params && params.name;
         const args = (params && params.arguments) || {};
         if (nome !== 'consulta_usuario') {
            return rpcErro(id, -32602, `Unknown tool: ${nome}`);
         }
         try {
            const r = await consultaUsuario(args);
            const ehErro = !!r.erro;
            return rpcOk(id, {
               content: [{ type: 'text', text: ehErro ? r.erro : r.resumo }],
               structuredContent: ehErro ? undefined : r,
               isError: ehErro,
            });
         } catch (err) {
            console.error('MCP consulta_usuario ERRO:', err && err.message ? err.message : err);
            return rpcOk(id, { content: [{ type: 'text', text: 'ERRO AO CONSULTAR O BANCO.' }], isError: true });
         }
      }
      default:
         if (ehNotificacao) return null; // notifications/initialized etc.
         return rpcErro(id, -32601, `Method not found: ${method}`);
   }
};

const confereChave = (req, res) => {
   if (!MCP_CHAVE || req.params.chave !== MCP_CHAVE) {
      res.sendStatus(404);
      return false;
   }
   return true;
};

router.post('/mcp/:chave', async (req, res) => {
   if (!confereChave(req, res)) return undefined;
   const corpo = req.body;
   const lote = Array.isArray(corpo) ? corpo : [corpo];
   if (lote.length === 0) return res.status(400).json(rpcErro(null, -32600, 'Invalid Request'));

   const respostas = [];
   for (const msg of lote) {
      const r = await trataMensagem(msg);
      if (r) respostas.push(r);
   }
   if (respostas.length === 0) return res.sendStatus(202); // so notificacoes
   res.set('Content-Type', 'application/json');
   return res.json(Array.isArray(corpo) ? respostas : respostas[0]);
});

// Sem fluxo SSE do servidor para o cliente e sem sessao
router.get('/mcp/:chave', (req, res) => {
   if (!confereChave(req, res)) return undefined;
   return res.sendStatus(405);
});
router.delete('/mcp/:chave', (req, res) => {
   if (!confereChave(req, res)) return undefined;
   return res.sendStatus(405);
});

export default router;
