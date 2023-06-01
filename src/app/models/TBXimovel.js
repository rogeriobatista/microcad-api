import Sequelize, { Model } from 'sequelize';

class TBXimovel extends Model {
   static init(sequelize) {
      super.init(
         {
            Id: {
               type: Sequelize.INTEGER,
               primaryKey: true,
               autoIncrement: true
            },
            cpj: Sequelize.STRING,
            imovel: Sequelize.STRING,
            proprieta: Sequelize.STRING,
            cpfpj: Sequelize.STRING,
            matricula: Sequelize.STRING,
            cartorio: Sequelize.STRING,
            codincra: Sequelize.STRING,
            certifica: Sequelize.STRING,
            municipio: Sequelize.STRING,
            estado: Sequelize.STRING,
            comarca: Sequelize.STRING,
            atrt: Sequelize.STRING
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBXimovel;
