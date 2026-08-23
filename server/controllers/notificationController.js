const Notification = require("../models/Notification");

const publicNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  ride: notification.ride,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  res.json({ success: true, message: "Notifications retrieved successfully", data: { notifications: notifications.map(publicNotification), unreadCount } });
};

const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, recipient: req.user._id },
    { isRead: true },
    { new: true },
  );

  if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
  res.json({ success: true, message: "Notification marked as read", data: { notification: publicNotification(notification) } });
};

const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: "Notifications marked as read", data: {} });
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
