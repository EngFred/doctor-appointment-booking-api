import * as availabilityService from '../services/availabilityService.js';

export const getAvailabilities = async (req, res, next) => {
  try {
    const { skip, take, doctorId, status, startTime, endTime } = req.query;
    const availabilities = await availabilityService.getAvailabilities({
      skip,
      take,
      doctorId,
      status,
      startTime,
      endTime,
    });
    res.status(200).json({
      status: 'success',
      data: availabilities,
    });
  } catch (err) {
    next(err);
  }
};

export const getAvailabilityById = async (req, res, next) => {
  try {
    const availability = await availabilityService.getAvailabilityById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (err) {
    next(err);
  }
};

export const createAvailability = async (req, res, next) => {
  try {
    const availability = await availabilityService.createAvailability(req.body);
    res.status(201).json({
      status: 'success',
      data: availability,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAvailability = async (req, res, next) => {
  try {
    const availability = await availabilityService.updateAvailability(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: availability,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAvailability = async (req, res, next) => {
  try {
    await availabilityService.deleteAvailability(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};