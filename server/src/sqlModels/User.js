const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    work: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    study: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    dob: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    relationship: {
      type: DataTypes.ENUM('', 'Single', 'In a Relationship', 'Married', 'Divorced', 'Separated'),
      allowNull: true,
      defaultValue: '',
    },
  }, { timestamps: true });

  return User;
};
