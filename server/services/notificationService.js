const Notification = require("../models/Notification");
const { emitUserNotification } = require("../socket/socketEmitter");

const createNotification = async ({ recipient, type, title, message, ride = null }) => {
  const notification = await Notification.create({ recipient, type, title, message, ride });
  emitUserNotification(notification);
  return notification;
};

module.exports = { createNotification };
