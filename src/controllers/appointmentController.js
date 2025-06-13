import * as appointmentService from '../services/appointmentService.js';

export const initiateAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.initiateAppointment(req.body, req.user, req.log);
    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const { skip, take, status, doctorId } = req.query;
    const appointments = await appointmentService.getAppointments(
      { skip, take, status, doctorId },
      req.user,
      req.log,
    );
    res.status(200).json({
      status: 'success',
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
};

export const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id, req.user, req.log);
    res.status(200).json({
      status: 'success',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment(
      req.params.id,
      req.user,
      req.log,
    );
    res.status(200).json({
      status: 'success',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

export const joinAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.joinAppointment(req.params.id, req.user, req.log);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const confirmAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.confirmAppointment(req.params.id, req.user, req.log);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const completeAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.completeAppointment(req.params.id, req.user, req.log);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};