import Sequelize, { Model } from 'sequelize';

class TBLDadostxt extends Model {
   static init(sequelize) {
      super.init(
         {
            id: {
               type: Sequelize.INTEGER,
               primaryKey: true,
               autoIncrement: true,
            },
            ncmd: Sequelize.STRING,
            ntot: Sequelize.INTEGER,
            ndata: Sequelize.STRING,
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBLDadostxt;
