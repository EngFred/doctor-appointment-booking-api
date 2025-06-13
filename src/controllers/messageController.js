import * as messageService from '../services/messageService.js';

export const sendMessage = async (req, res, next) => {
  try {
    const message = await messageService.sendMessage(req.body, req.user, req.log);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { skip, take, appointmentId, receiverId } = req.query;
    const messages = await messageService.getMessages(
      { skip, take, appointmentId, receiverId },
      req.user,
      req.log
    );
    res.status(200).json(messages);
  } catch (err) {
    next(err);
  }
};

export const getMessageById = async (req, res, next) => {
  try {
    const message = await messageService.getMessageById(req.params.id, req.user, req.log);
    res.status(200).json(message);
  } catch (err) {
    next(err);
  }
};

export const updateMessageStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const message = await messageService.updateMessageStatus(req.params.id, status, req.user, req.log);
    res.status(200).json(message);
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const result = await messageService.deleteMessage(req.params.id, req.user, req.log);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};