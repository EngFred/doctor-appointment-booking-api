import * as hospitalService from '../services/hospitalService.js';

export const createHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.createHospital(req.body, req.file);
    res.status(201).json({
      status: 'success',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

export const getHospitals = async (req, res, next) => {
  try {
    const { skip, take, name, services, latitude, longitude } = req.query;
    const hospitals = await hospitalService.getHospitals({
      skip,
      take,
      name,
      services: services ? services.split(',') : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });
    res.status(200).json({
      status: 'success',
      data: hospitals,
    });
  } catch (err) {
    next(err);
  }
};

export const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

export const updateHospital = async (req, res, next) => {
  try {
    const hospital = await hospitalService.updateHospital(req.params.id, req.body, req.file);
    res.status(200).json({
      status: 'success',
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHospital = async (req, res, next) => {
  try {
    await hospitalService.deleteHospital(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};