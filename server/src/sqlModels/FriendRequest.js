const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FriendRequest = sequelize.define('FriendRequest', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
  }, { timestamps: true });

  return FriendRequest;
};
