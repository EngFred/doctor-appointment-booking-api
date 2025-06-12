import admin from '../config/firebase.js';

export const sendFCMNotification = async (fcmToken, message) => {
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: message.title,
        body: message.body,
      }
    });
  } catch (error) {
    console.error("Failed to send FCM:", error.message);
  }
};
