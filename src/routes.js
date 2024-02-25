import { Router } from 'express';
import LicenseController from './app/controllers/LicenseController';
import jwt from "jsonwebtoken";
import { next } from 'sucrase/dist/parser/tokenizer';

function ensureToken(req,res,next) {
    const bearerHeader=req.headers["authorization"]
    if (typeof bearerHeader !== "undefined")
       {
          const token = bearerHeader.split(" ")[1]
          req.token = token
          jwt.verify(req.token,'12345678', function(err,data){
            if(err){
                    res.sendStatus(403)
                }
                else{
                    next()
                }
            })
        }
    else
       {
          res.sendStatus(401)
       }
}

const routes = new Router();
//
routes.get('/', (req, res) => res.send('API MICROCAD V2.92 is running OK.'));
//
/** API App Mobile */
routes.get('/api/search/:predicate',                   LicenseController.search);
routes.post('/api/email/send',                         LicenseController.sendEmail);
//
routes.get('/api/atualiza',                            LicenseController.atualiza);
routes.post('/api/atualiza/update',                    LicenseController.atualizaUpdate);
routes.get('/api/dadosdat',                            LicenseController.dadosdat);
routes.get('/api/dadosins',                            LicenseController.dadosins);
routes.post('/api/dadosins/update',                    LicenseController.updateDadosins);
routes.get('/api/dadosins/delete/:id',                 LicenseController.deleteDadosins);
routes.get('/api/dadosdatmail',                        LicenseController.dadosdatmail);
routes.get('/api/dadosdth',                            LicenseController.dadosdth);
routes.get('/api/dadosdth/delete/:nserie0',            LicenseController.deleteDadosdth);
routes.get('/api/dadosins000',                         LicenseController.dadosins000);
routes.get('/api/dadosins000/delete/:id',              LicenseController.deleteDadosins000);
routes.get('/api/dadostxt',                            LicenseController.dadostxt);
routes.get('/api/naoreg',                              LicenseController.naoreg);
routes.get('/api/registro',                            LicenseController.registro);
routes.get('/api/registronet',                         LicenseController.registronet);
routes.get('/api/registro/delete/:nserie',             LicenseController.deleteRegistro);
routes.get('/api/xemail',                              LicenseController.xemail);
routes.get('/api/xexe',                                LicenseController.xexe);
routes.get('/api/xexe/delete/:id',                     LicenseController.deleteXex);
//
routes.get('/api/emails',                              LicenseController.listEmails);
routes.get('/api/emails/:email',                       LicenseController.getEmail);
routes.post('/api/emails/import',                      LicenseController.importEmails);
routes.post('/api/emails/clear',                       LicenseController.clearEmails);
//
routes.get('/apimicrocad',                             LicenseController.microcad);
//
routes.get('/apimicrocadusu',                          LicenseController.microcadusu);
//
routes.get('/apiconregistronet/:id',                   LicenseController.conregistronet);
routes.get('/apiconregistronetultimo',                 LicenseController.conregistronetultimo);
routes.post('/apiupdregistronet',                      LicenseController.updregistronet);
routes.get('/apidelregistronet/:id',                   LicenseController.delregistronet);
routes.get('/apilisregistronet/:id1/:id2',             LicenseController.lisregistronet);
//
routes.get('/apiconregistro/:id',                      LicenseController.conregistro);
routes.post('/apiupdregistro',                         LicenseController.updregistro);
routes.get('/apidelregistro/:id',                      LicenseController.delregistro);
routes.get('/apilisregistro/:id1',                     LicenseController.lisregistro);
routes.get('/teste/:id',                               LicenseController.teste);
routes.get('/testex/:id',ensureToken,                  LicenseController.testex);

routes.post('/apilogin',                               LicenseController.login);
//
routes.put('/apiupddat',                               LicenseController.upddat);
routes.get('/apiincdatmail/:id1&:id2&:id3&:id4',       LicenseController.incdatmail);
//
routes.get('/apiupddth/:id1&:id2&:id3&:id4&:id5',      LicenseController.upddth);
//
routes.put('/apiupdins',                               LicenseController.updins);
routes.get('/apilisins/:id1',                          LicenseController.lisins);
routes.put('/apidelins',                               LicenseController.delins);
routes.get('/apitotins/:id1',                          LicenseController.totins);
routes.put('/apiupdins000',                            LicenseController.updins000);
routes.put('/apiupdins000X',                           LicenseController.updins000X);
//
routes.get('/apiupdtxt/:id1&:id2&:id3',                LicenseController.updtxt);
routes.get('/apiconatu/:id1',                          LicenseController.conatu);
routes.put('/apiupdnreg',                              LicenseController.updnreg);
//
//
routes.get('/checklicense/:id',     LicenseController.show);
routes.post('/updatelicense',       LicenseController.update);
routes.delete('/deletelicense/:id', LicenseController.delete);
routes.get('/listlicense',          LicenseController.index);
routes.get('/countlicense',         LicenseController.count);
//
/** API Imóveis */
routes.get('/api/imoveis/:cpj', LicenseController.getImoveis);
routes.get('/api/imoveis/search/:cpj/:predicate', LicenseController.searchImoveis);
routes.get('/api/imoveis/index/:cpj/:index', LicenseController.getImoveisByIndex);
routes.get('/api/imoveis/:id', LicenseController.getImoveisById);
routes.post('/api/imoveis', LicenseController.upsertImoveis);
routes.put('/api/imoveis/:id', LicenseController.upsertImoveis);
routes.delete('/api/imoveis/:id', LicenseController.deleteImoveis);
/** API Proprietários */
routes.get('/api/proprietarios/:cpj', LicenseController.getProprieta);
routes.get('/api/proprietarios/search/:cpj/:predicate', LicenseController.searchProprietarios);
routes.get('/api/proprietarios/index/:cpj/:id', LicenseController.getProprietaByIndex);
routes.get('/api/proprietarios/:id', LicenseController.getProprietaById);
routes.post('/api/proprietarios', LicenseController.upsertProprieta);
routes.put('/api/proprietarios/:id', LicenseController.upsertProprieta);
routes.delete('/api/proprietarios/:id', LicenseController.deleteProprieta);
/** API Responsáveis Técnicos */
routes.get('/api/resptecs/:cpj', LicenseController.getResptec);
routes.get('/api/resptecs/search/:cpj/:predicate', LicenseController.searchResptecs);
routes.get('/api/resptecs/index/:cpj/:id', LicenseController.getResptecByIndex);
routes.get('/api/resptecs/:id', LicenseController.getResptecById);
routes.post('/api/resptecs', LicenseController.upsertResptec);
routes.put('/api/resptecs/:id', LicenseController.upsertResptec);
routes.delete('/api/resptecs/:id', LicenseController.deleteResptec);
export default routes;
