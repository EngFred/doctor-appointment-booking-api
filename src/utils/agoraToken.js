import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

export const generateAgoraToken = (channelName, uid, role = 'publisher', expirationInSeconds = 3600) => {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    throw new Error('Agora credentials not configured');
  }

  const roleEnum = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expirationTime = Math.floor(Date.now() / 1000) + expirationInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    roleEnum,
    expirationTime
  );
};