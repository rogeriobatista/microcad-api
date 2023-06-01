import Sequelize, { Model } from 'sequelize';

class TBXresptec extends Model {
   static init(sequelize) {
      super.init(
         {
            Id: {
               type: Sequelize.INTEGER,
               primaryKey: true,
               autoIncrement: true
            },
            cpj: Sequelize.STRING,
            respetec: Sequelize.STRING,
            titulo: Sequelize.STRING,
            xcr: Sequelize.STRING,
            ncr: Sequelize.STRING
         },
         {
            sequelize,
         }
      );

      return this;
   }
}

export default TBXresptec;
