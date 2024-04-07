import Sequelize, { Model } from 'sequelize';

class TBLRegistro extends Model {
   static init(sequelize) {
      super.init(
         {
            nserie: {
               type: Sequelize.STRING,
               primaryKey: true,
            },
            tipo: Sequelize.STRING,
            versao: Sequelize.STRING,
            cliente: Sequelize.STRING,
            cidade: Sequelize.STRING,
            uf: Sequelize.STRING,
            cgc: Sequelize.STRING,
            email: Sequelize.STRING,
            serial: Sequelize.STRING,
            nseant: Sequelize.STRING,
            verant: Sequelize.STRING,
            ndata: Sequelize.STRING,
            nn: Sequelize.STRING,
            pp: Sequelize.STRING,
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBLRegistro;
