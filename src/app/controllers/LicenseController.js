///////////////////////////////////////////////////////////////////////////////////////////

import { Op, col } from 'sequelize';

import jwt from "jsonwebtoken";

import nodemailer from "nodemailer"

import TBLDadosdat     from '../models/TBLDadosdat';
import TBLDadosdatmail from '../models/TBLDadosdatmail';
import TBLDadosdth     from '../models/TBLDadosdth';
import TBLDadosins     from '../models/TBLDadosins';
import TBLDadosins000  from '../models/TBLDadosins000';
import TBLDadostxt     from '../models/TBLDadostxt';
import TBLAtualiza     from '../models/TBLAtualiza';
import TBLNaoreg       from '../models/TBLNaoreg';
import TBLRegistro     from '../models/TBLRegistro';
import TBLRegistronet  from '../models/TBLRegistronet';
import TBLXemail       from '../models/TBLXemail';
import TBLXexe         from '../models/TBLXexe';
import TBXimovel from '../models/TBXimovel';
import TBXproprieta from '../models/TBXproprieta';
import TBXresptec from '../models/TBXresptec';

class LicenseController {

   async search(req, res) {
      const { predicate } = req.params;

      return res.json(await TBLRegistronet.findAll({
         where: {
           [Op.or]: [
              { [ 'email' ]: { [Op.like]: `%${predicate}%` } },
              { [ 'nome' ]: { [Op.like]: `%${predicate}%` } },
              { [ 'nserie' ]: { [Op.like]: `%${predicate}%` } },
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
            pass: 'eswrhymhuckhxqiu'
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
       
      transporter.sendMail(mailOptions, function(error, info){
      if (error) {
         console.log(error);
         return res.send({status: false})
      } else {
         console.log('Email sent: ' + info.response);
         return res.send({status: true})
      }
      });
   }
   //
   //
   async dadosdat(req, res) {
      return res.json(await TBLDadosdat.findAll({
         order: [
            [ col('ndata'), 'DESC'],
            [ col('nvxx'), 'DESC']
         ]
      }))
   }

   async dadosins(req, res) {
      return res.json(await TBLDadosins.findAll({
         order: [
            [ col('nserie0'), 'DESC']
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
            [ col('nvxx'), 'DESC'],
            [ col('nvxxyy'), 'DESC']
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
            [ col('totd'), 'DESC']
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
            [ col('ntot'), 'DESC']
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

   async registronet(req, res) {
      return res.json(await TBLRegistronet.findAll());
   }

   async xemail(req, res) {
      return res.json(await TBLXemail.findAll())
   }

   async xexe(req, res) {
      return res.json(await TBLXexe.findAll({
         order: [
            [ col('nserie'), 'DESC']
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

         const promises = uniqBy(emails).map(async(item) => {
            const { nserie, email, data, origem } = item;

            const emailsExists = await TBLXemail.findOne({where: { email: email }})

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
            
            const emailExists = await TBLXemail.findOne({where: { email: email }})

            if (emailExists && emailExists.nserie !== 'XXXXXXX') {
               await TBLXemail.update({ nserie, email, data }, { where: { email: email } });
            }
            
            if (!emailExists)
            {
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
      const {nserie, uname, cname } = req.query
      console.log(nserie, uname, cname)
      const licences =
      [
         {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC'},
      // {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC1'},
         {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC2'},
         {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC3'},
         {nserie: 'REGV01',uname: 'FELIX'     ,cname: 'FELIX-PC4'},
         {nserie: 'REGV01',uname: 'RICARDO MELO',  cname: 'RICARDO-PC'},
         {nserie: 'REGV01',uname: 'PLOTAGEM 4',cname: '4-PLOTAGEM'},
         {nserie: 'REGV01',uname: 'ROGERIO BATISTA'   ,cname: 'DESKTOP-J5RQF1S'}
      ]
      const valid = licences.some(x => x.nserie == nserie && x.uname == uname && x.cname == cname)
      return res.json({ valid: valid })
   }
   //
   //MICROCADUSU
   async microcadusu(req, res) {
      const {nserie0, uname, cname } = req.query; // nserie0, cname, uname
      const rules = [
         {nserie0:'T279999A',uname:'XXXXX',cname:'XXXXX-PC7',codigo:1,mensagem:'AAA BBB CCC XXXX YYY ZZZ OK1'},
         {nserie0:'T279999A',uname:'XXXXX',cname:'XXXXX-PC8',codigo:2,mensagem:'OK2'},
         {nserie0:'T279999A',uname:'XXXXX',cname:'XXXXX-PC9',codigo:3,mensagem:'OK3'}
      ];
      const response = rules.find(rule => rule.nserie0 == nserie0 && rule.uname == uname && rule.cname == cname);
      if (response) return res.json({ cod: response.codigo, msg: response.mensagem });
      return res.json({cod: 0, msg: 'OK'});
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
         order: [ [ 'nserie', 'DESC' ]]
      });
      if (registro) {
         return res.json(registro);
      }
      return res.json({});
   }
   // UPD REGISTRONET
   async updregistronet(req, res) {
      const {nserie,nome,nomereg,programa,tipo,versao,nserieant,versaoant,serial,dataenv,data,valor,desconto,frete,pago,codrastre,rua,bairro,cidade,uf,cep,cgc,telefone,email,emailcc,nn,pp,obs,} = req.body;
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
            [ col(id1), 'ASC']
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
   // UPD REGISTRO
   async updregistro(req, res) {
      const { nserie, tipo, versao, cliente, uf, cgc, email, serial, verant,nn,pp } = req.body;
      const registro = await TBLRegistro.findByPk(nserie);
      if (registro) {
         await TBLRegistro.update(
            {
               nserie,
               tipo,
               versao,
               cliente,
               uf,
               cgc,
               email,
               serial,
               verant,
               nn,
               pp,
            },
            { where: { nserie } }
         );
         return res.json({ nserie, tipo, versao, cliente, uf, cgc, email, serial, verant, nn, pp });
      }

      const addRecord = await TBLRegistro.create({
         nserie,
         tipo,
         versao,
         cliente,
         uf,
         cgc,
         email,
         serial,
         verant,
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
      const {login,pass}=req.body;
      if (!!login && !!pass && login == 'testefixo' && pass == "87654321")
      {
         const token=jwt.sign({login:login,pass:pass},'12345678')
         return  res.json({token:token});
      }
      return res.sendStatus(400);
   }
   //

   //DADOSDAT
   async upddat(req, res) {
      const {nvxx,ndata} = req.body;
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
            { where: { id: registro.id} }
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
         return res.json({ id1});
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
      const {nserie0,uname,cname,ndata,nhora,chave,nvyy} = req.body;
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
         },
            { where: { id: registro.id} }
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
      const {nserie0, uname,cname} = req.body; // nserie0, uname, cname
      const sucess = await TBLDadosins.destroy({ where: {nserie0: nserie0, uname: uname, cname: cname} });
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
      const {nvxx,uname,cname,ndata,nhora,nvyy} = req.body;
      const registro = await TBLDadosins000.findOne({ where: {nvxx: nvxx, uname: uname, cname: cname} });

      //return res.json(registro)

      if (registro) {
         registro.udata = ndata;
         registro.uhora = nhora;

         const idata = registro.ndata;
         const ihora = registro.nhora;
         const idataFormatada = `${idata.substring(2,4)}/${idata.substring(4,6)}/${idata.substring(0,2)}`
         const ihoraFormatada = `${ihora.substring(0,2)}:${ihora.substring(2,4)}:${ihora.substring(4,6)}`
         const idatacompleta = new Date(`${idataFormatada} ${ihoraFormatada}`)
         //console.log(idatacompleta + " <<< IDATA COMPLETA");

         const udata = ndata;
         const uhora = nhora;
         const udataFormatada = `${udata.substring(2,4)}/${udata.substring(4,6)}/${udata.substring(0,2)}`
         const uhoraFormatada = `${uhora.substring(0,2)}:${uhora.substring(2,4)}:${uhora.substring(4,6)}`
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
            },
            { where: { id: registro.id} }
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
      });
      return res.json(addRecord);
   }
   //DADOSINS000X
   async updins000X(req, res) {
      const {nvxx,uname,cname,ndata,nhora,nvyy} = req.body;
      const registro = await TBLDadosins000.findOne({ where: {nvxx: nvxx, uname: uname, cname: cname} });
      if (registro) {
         registro.udata = ndata;
         registro.uhora = nhora;

         const idata = registro.ndata;
         const ihora = registro.nhora;
         const idataFormatada = `${idata.substring(2,4)}/${idata.substring(4,6)}/${idata.substring(0,2)}`
         const ihoraFormatada = `${ihora.substring(0,2)}:${ihora.substring(2,4)}:${ihora.substring(4,6)}`
         const idatacompleta = new Date(`${idataFormatada} ${ihoraFormatada}`)
         //console.log(idatacompleta + " <<< IDATA COMPLETA");

         const udata = ndata;
         const uhora = nhora;
         const udataFormatada = `${udata.substring(2,4)}/${udata.substring(4,6)}/${udata.substring(0,2)}`
         const uhoraFormatada = `${uhora.substring(0,2)}:${uhora.substring(2,4)}:${uhora.substring(4,6)}`
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
         },
            { where: { id: registro.id} }
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
      });
      return res.json(addRecord);
   }
   //
   //DADOSTXT
   async updtxt(req, res) {
      const { id1, id2, id3 } = req.params; //ncmd, ntot, ndata

    //const registro = await TBLDadostxt.findByPk(id1);
      const registro = await TBLDadostxt.findOne({where: {ncmd: id1, ndata: id3} } );

      if (registro) {
         await TBLDadostxt.update(
            {
               ncmd: registro.ncmd,
               ntot: registro.ntot + +id2,
               ndata: registro.ndata,
            },
          //{ where: {ncmd: id1} }
            { where: {ncmd: id1, ndata: id3} }
         );
         return res.json(registro);
      }

      const addRecord = await TBLDadostxt.create({ncmd: id1, ntot: +id2, ndata: id3});
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
         const {nserie0,uname,cname,ndata,nhora,ntipo} = req.body;
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
      const imoveis = await TBXimovel.findAll({ where: { cpj } });
      if (imoveis) {
         return res.json(imoveis);
      }
      return res.json([]);
   }

   async searchImoveis(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXimovel.findAll({
         where: { 'imovel': { [Op.like]: `%${predicate}%` }, cpj }
      }))
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

         return res.json({ cpj, imovel, proprieta, cpfpj, matricula, cartorio, codincra, certifica, municipio, estado, comarca, atrt });
      }

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
      const proprietarios = await TBXproprieta.findAll({ where: { cpj } });
      if (proprietarios) {
         return res.json(proprietarios);
      }
      return res.json([]);
   }

   async searchProprietarios(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXproprieta.findAll({
         where: { 'proprieta': { [Op.like]: `%${predicate}%` }, cpj }
      }))
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

         return res.json({ cpj, proprieta, identifica, endereco, cpfpj, conjuge, conjudenti, conjucpf });
      }

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
      const responsaveisTecnico = await TBXresptec.findAll({ where: { cpj } });
      if (responsaveisTecnico) {
         return res.json(responsaveisTecnico);
      }
      return res.json([]);
   }

   async searchResptecs(req, res) {
      const { cpj, predicate } = req.params;

      return res.json(await TBXresptec.findAll({
         where: { 'respetec': { [Op.like]: `%${predicate}%` }, cpj }
      }))
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

         return res.json({ cpj, respetec, titulo, xcr, ncr });
      }

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

}

export default new LicenseController();
