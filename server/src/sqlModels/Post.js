const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  }, { timestamps: true });

  return Post;
};
