import admin from 'firebase-admin';
import credential  from 'firebase-admin';

const serviceAccount = {
  "type": "service_account",
  "project_id": "afrodoctor-fcm",
  "private_key_id": "d7db6cddffd073deb215bdafc66e4e258ed5c7fe",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDFtqurPIXaZClc\nFfUGaxXSA3tftLGWe3ty9V9S+b9K1q929LX8ES+36nr1jlDIR2zTLZltP4JWVSft\ncpjkQ0V3QeTBBleRyxMo3JXmGOIHSKTJ2bBJ74QnlDqHGS85N9YruGrJy5g/Uzgg\nIFAxvR/N1XvwVPOYc0HtBZ4gIQIG4qyoN80YuJ9ZI8dT1um29hC9RhO+ynYFWcuA\nXwVQ2JI8Bu7PNuMONbcM8SbJH3z875CzRiR0OwpANWjJymtNg5T8qVLKPQim7Mg0\nS0qsJbSVzi9KBAtHj2BdpsC+FBdT+zxGciSbSglvtr9t8brbjIOI7jFMZlOTAQGj\nOvdS9aPnAgMBAAECggEARibWC4iKf95ZNITP70qQr/cvT9qHxnqi5zu76m+WGcJJ\n+N3EMp+QfGPU5Arui9mX+egsj7BgmSxW4e/u4tMhszpspbaP3Lme3zlBcKa0kFwM\nqFg2rk0vaXG1QJlFgbpXoiSps1crepCXEgMVIUjXH4wXkUM7OYTvx99d501+8Bze\nvkxS+FEyPesMf12A1vkPxg//KOeXIRwA3sPYJnH/aGEzgDJAyJs9Hy5zuq6UvEAe\niAcgQPFI3vz8gwzssY1IU4BErwvE9pZJKaHj7tLqCVhVzVG+1rkTnqU5vjZahApu\nWeWUuncnKvHILSGsyDa2GX9oLSjUf9J5DBi+8j9tvQKBgQDtfDo2yiAjVfMa7wL/\nBAsQYgR6+3xE9pzv1tIoZo3M+xmcaYT69/gx7rlW0s3jYZ38se3oM9uPzPanmRin\nFBJW/ZlTHgpeljkrXNWTsVWeZ6Z0Ezxq1+L/0YmvE2sHyX2OBi/62xzFfEp6q0ED\nQhIdGEgvpKZKjdA1x7+1T6e6xQKBgQDVIKwnyP+ZuCB9sE/Iix8FrCi68RWBY4Ru\nYKgbG59IkOKIxbU+GNPDnK8m5N8VlmYx8Ktu+aDKtX/bX/wTQOEXJcqcownyc52X\neyob7N8axhOdtqImZpd+nyk2mOsNXis9gNVCfj04vhcEsawAMHC/SsnBr6plJfFm\n4ZPJIKq+uwKBgBUQgMVdVk5sED0iWBywih6w4v7ZkaM4UKFBZ7CnsAovd40VGvN7\nzSr4pr3ZwuNZRD8mtRh0iRQPNQ2WmcYwFJRcuB3UO006e+WpvVP1VcfQH8aJ8kDz\n1zGjr1e1HDg7mgRf7h+NEdc+eAi7ae/VC3BDOBvpucpBG+e5SPrXDuSVAoGAD7KP\nW4LPaKgKJJfG2JN+nnFWsqYtGlGVIHgYCZ8YNUUOmlpNhhxYBJFWyTuUPsfMESOT\nzOGv+R4zI5pHO7fMnGLZMH5Frkjbs5uLt3DT4eny6evYt5FY2Sep5m6O6XYlIyuJ\nCZO4uKQvl9XqQD1RIJXGlHB20WphBF3a/7ZbPR8CgYA2e4lW1aB2Va6Fv/JLWEX/\nNIWQW0owh4DtHcmZyHLI0we+JaICAJtoaWck31TAhzLkK9l0XSYzMS5rrCULxnNq\noADSXW8Zd1V5MX9/HycPJCrxB/P2SJ2dIAPVRGpMn09moHr28gnyP7TxYpmhnVn/\nN/4yQzEK0MjUMP4mlM3+ZA==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@afrodoctor-fcm.iam.gserviceaccount.com",
  "client_id": "103110009117789398988",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40afrodoctor-fcm.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const messaging = admin.messaging();