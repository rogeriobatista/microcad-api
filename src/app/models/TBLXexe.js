import Sequelize, { Model } from 'sequelize';

class TBLXexe extends Model {
   static init(sequelize) {
      super.init(
         {
            id: {
               type: Sequelize.INTEGER,
               primaryKey: true,
               autoIncrement: true
            },
            nserie: Sequelize.STRING,
            uname: Sequelize.STRING,
            cname: Sequelize.STRING,
            ndata: Sequelize.STRING,
            nhora: Sequelize.STRING,
            exe: Sequelize.STRING
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBLXexe;
