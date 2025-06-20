import * as doctorService from '../services/doctorService.js';

export const getDoctors = async (req, res, next) => {
  try {
    const { skip, take, specialty, hospitalId, name } = req.query;
    const doctors = await doctorService.getDoctors({
      skip,
      take,
      specialty,
      hospitalId,
      name,
    });
    res.status(200).json({
      status: 'success',
      data: doctors,
    });
  } catch (err) {
    next(err);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorService.getDoctorById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

export const getCurrentDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.getCurrentDoctor(req.user.id);
    res.status(200).json({
      status: 'success',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.createDoctor(req.body, req.file);
    res.status(201).json({
      status: 'success',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorService.updateDoctor(req.params.id, req.body, req.file);
    res.status(200).json({
      status: 'success',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDoctorFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const doctor = await doctorService.updateDoctorFcmToken(req.user.id, fcmToken);
    res.status(200).json({
      status: 'success',
      data: doctor,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    await doctorService.deleteDoctor(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};