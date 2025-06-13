import * as availabilityService from '../services/availabilityService.js';

export const getAvailabilities = async (req, res, next) => {
  try {
    const { skip, take, doctorId, status, startTime, endTime } = req.query;
    const availabilities = await availabilityService.getAvailabilities(
      { skip, take, doctorId, status, startTime, endTime },
      req.log
    );
    res.status(200).json(availabilities);
  } catch (err) {
    next(err);
  }
};

export const getMyAvailabilities = async (req, res, next) => {
  try {
    const { skip, take, status, startTime, endTime } = req.query;
    const availabilities = await availabilityService.getMyAvailabilities(
      req.user.id,
      { skip, take, status, startTime, endTime },
      req.log
    );
    res.status(200).json(availabilities);
  } catch (err) {
    next(err);
  }
};

export const getAvailabilityById = async (req, res, next) => {
  try {
    const availability = await availabilityService.getAvailabilityById(req.params.id, req.log);
    res.status(200).json(availability);
  } catch (err) {
    next(err);
  }
};

export const createAvailability = async (req, res, next) => {
  try {
    const availability = await availabilityService.createAvailability(req.body, req.user.id, req.log);
    res.status(201).json(availability);
  } catch (err) {
    next(err);
  }
};

export const updateAvailability = async (req, res, next) => {
  try {
    const availability = await availabilityService.updateAvailability(req.params.id, req.body, req.user.id, req.log);
    res.status(200).json(availability);
  } catch (err) {
    next(err);
  }
};

export const deleteAvailability = async (req, res, next) => {
  try {
    const result = await availabilityService.deleteAvailability(req.params.id, req.user.id, req.log);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};