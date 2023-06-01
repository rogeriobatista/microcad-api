import Sequelize, { Model } from 'sequelize';

class TBXproprieta extends Model {
   static init(sequelize) {
      super.init(
         {
            Id: {
               type: Sequelize.INTEGER,
               primaryKey: true,
               autoIncrement: true
            },
            cpj: Sequelize.STRING,
            proprieta: Sequelize.STRING,
            identifica: Sequelize.STRING,
            endereco: Sequelize.STRING,
            cpfpj: Sequelize.STRING,
            conjuge: Sequelize.STRING,
            conjudenti: Sequelize.STRING,
            conjucpf: Sequelize.STRING
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBXproprieta;
