import * as notificationService from '../services/notificationService.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { skip, take, status, notificationType } = req.query;
    const notifications = await notificationService.getNotifications(
      { skip, take, status, notificationType },
      req.user,
      req.log
    );
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
};

export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await notificationService.getNotificationById(req.params.id, req.user, req.log);
    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.id, req.user, req.log);
    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user, req.log);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};