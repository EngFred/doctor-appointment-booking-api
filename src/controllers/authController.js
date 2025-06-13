import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: 'Refresh token is required' });
    }
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfilePicture = async (req, res, next) => {
  try {
    const user = await authService.updateProfilePicture(req.user.id, req.file);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const user = await authService.updateFcmToken(req.user.id, fcmToken);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};