import Sequelize from 'sequelize';
import databaseConfig from '../config/database';

import TBLAtualiza     from '../app/models/TBLAtualiza';
import TBLDadosdat     from '../app/models/TBLDadosdat';
import TBLDadosdatmail from '../app/models/TBLDadosdatmail';
import TBLDadosdth     from '../app/models/TBLDadosdth';
import TBLDadosins     from '../app/models/TBLDadosins';
import TBLDadosins000  from '../app/models/TBLDadosins000';
import TBLDadostxt     from '../app/models/TBLDadostxt';
import TBLNaoreg       from '../app/models/TBLNaoreg';
import TBLRegistro     from '../app/models/TBLRegistro';
import TBLRegistronet  from '../app/models/TBLRegistronet';
import TBLXemail       from '../app/models/TBLXemail';
import TBLXexe         from '../app/models/TBLXexe';
import TBXimovel       from '../app/models/TBXimovel';
import TBXproprieta    from '../app/models/TBXproprieta';
import TBXresptec      from '../app/models/TBXresptec';

const models = [TBLAtualiza,TBLDadosdat,TBLDadosdatmail,TBLDadosdth,TBLDadosins,TBLDadosins000,TBLDadostxt,TBLNaoreg,TBLRegistro,TBLRegistronet, TBLXemail, TBLXexe, TBXimovel, TBXproprieta, TBXresptec];

class Database {
   constructor() {
      this.init();
   }
   init() {
      this.connection = new Sequelize(databaseConfig);
      models
         .map(model => model.init(this.connection))
         .map(
            model => model.associate && model.associate(this.connection.models)
         );
   }

}

export default new Database();
