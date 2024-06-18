///////////////////////////////////////////////////////////////////////////////////////////

import { Op, col } from 'sequelize';

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

const WIX_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3oGVOgcYuK2RfY6OKUBT
yu37dqNJyyhs/jWX6N/89dFLmXMCtqv9hTCOOYXG9MFHCtmqmS6zR6nM/Eh683fx
dCe/nAOYwchOQg2gu++vb729lH/9dYhVR7b1kDXM/Q199leAXhznshlr7g9RKTRq
ms3pY3klzVdBhmyfhShpqVKUQYtsYPs1FIPx/ErHjC49qwcLyjl1/PewNX9WWrjw
z5G0e5qhZ2opHeh4JBhxmKQ2R/53GNf/Pp6indTQ+KqhCuOJX3m1iaOcDElDBMpD
DCKC4BCrK5mJllE4sxGx2XWhPOrwpjqo77nLxJQBwT7p7rVdxciyxO/G92rFVXEY
dwIDAQAB
-----END PUBLIC KEY-----`;
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

      const transporter = nodemailer.createTransport({
         host: 'smtp.gmail.com',
         secure: false,
         port: 587,
         auth: {
            user: 'microcad.adm@gmail.com',
            pass: 'cvsqizatsjqelemi'
         },
      });

      var mailOptions = {
         from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
         to: `${email}, comercial@topocad2000.com.br`,
         subject: `TOPOCAD2000 ${versao} - ${nserie} * CHAVE VIRTUAL`,
         text: `*TOPOCAD2000 ${versao} - ${nserie} >>> ${nome}-${uf}
         1-Clique no link a seguir para baixar / instalar / atualizar TOPOCAD2000 ${versao} (caso ainda não tenha feito).
         https://www.topocad2000.com.br/downloads/TOPOCAD2000${versao}.exe 
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
   async microcad(req, res) {
      const { nserie, uname, cname } = req.query
      console.log(nserie, uname, cname)
      const licences =
         [
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC' },
            // {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC1'},
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC2' },
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC3' },
            { nserie: 'REGV01', uname: 'FELIX', cname: 'FELIX-PC4' },
            { nserie: 'REGV01', uname: 'CACOB', cname: 'RICARDO-PC' },
            { nserie: 'REGV01', uname: 'RICARDO MELO', cname: 'RICARDO-PC' },
            { nserie: 'REGV01', uname: 'PLOTAGEM 4', cname: '4-PLOTAGEM' },
            { nserie: 'REGV01', uname: 'ROGERIO BATISTA', cname: 'DESKTOP-J5RQF1S' }
         ]
      const valid = licences.some(x => x.nserie == nserie && x.uname == uname && x.cname == cname)
      return res.json({ valid: valid })
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
      const { nserie, nome, nomereg, programa, tipo, versao, nserieant, versaoant, serial, dataenv, data, valor, desconto, frete, pago, codrastre, rua, bairro, cidade, uf, cep, cgc, telefone, email, emailcc, nn, pp, obs, } = req.body;
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
   //NAOREG
   async updnreg(req, res) {
      const { nserie0, uname, cname, ndata, nhora, ntipo } = req.body;
      const addRecord = await TBLNaoreg.create({
         nserie0: nserie0,
         uname: uname,
         cname: cname,
         ndata: ndata,
         nhora: nhora,
         ntipo: ntipo,
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

}

const createLicenseFromAutomation = async (billingInfo, buyerEmail, orderNumber, item, program) => {
   const { nserie, lastVersion } = await getNextNserie(program);

   const { firstName, lastName, vatId } = billingInfo.contactDetails;
   const { city, subdivision, postalCode } = billingInfo.address

   const tipo = getType(vatId?.type);
   const versao = lastVersion;
   const email = buyerEmail;
   const cliente = `${firstName} ${lastName}`;
   const nome = cliente;
   const nomereg = cliente;
   const cgc = vatId?.id || "99999999999";
   const data = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
   const pago = `WIX-${orderNumber}`;
   const cidade = city || "X";
   const uf = getUF(subdivision) || "XX";
   const cep = postalCode;
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

const getUF = (subdivision) => {
   const [country, uf] = subdivision.split("-");
   return uf;
}

const updateLicenceFromAutomation = async (billingInfo, buyerEmail, orderNumber, item, program) => {
   const { nserie, lastVersion } = await getNextNserie(program);

   const { firstName, lastName, vatId } = billingInfo.contactDetails;
   const { city, subdivision, postalCode } = billingInfo.address

   const { nserieant, versaoant } = getNserieAndVersaoAnt(program);
   const tipo = getType(vatId?.type);
   const versao = lastVersion;
   const email = buyerEmail;
   const cliente = `${firstName} ${lastName}`;
   const nome = cliente;
   const nomereg = cliente;
   const cgc = vatId?.id || "99999999999";
   const data = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
   const pago = `WIX-${orderNumber}`;
   const cidade = city || "X";
   const uf = getUF(subdivision) || "XX";
   const cep = postalCode;
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
   const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      secure: false,
      port: 587,
      auth: {
         user: 'microcad.adm@gmail.com',
         pass: 'cvsqizatsjqelemi'
      },
   });

   const programName = getProgramName(programa);

   var mailOptions = {
      from: '"MICROCAD-Computação Grafica e Sistemas" <microcad.adm@gmail.com>',
      to: `${email}, comercial@topocad2000.com.br`,
      subject: `${programName} ${versao} - ${nserie} * CHAVE VIRTUAL`,
      text: `*${programName} ${versao} - ${nserie} >>> ${nome}-${uf}
      1-Clique no link a seguir para baixar / instalar / atualizar ${programName} ${versao} (caso ainda não tenha feito).
      https://www.topocad2000.com.br/downloads/${programName}${versao}.exe 
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
