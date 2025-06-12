import * as appointmentService from '../services/appointmentService.js';

/**
 * Initiates a new appointment booking.
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.doctorId - UUID of the doctor
 * @param {string} req.body.availabilityId - UUID of the availability slot
 * @param {string} req.body.type - Appointment type (IN_PERSON or VIRTUAL)
 * @param {string} [req.body.consultationType] - Consultation type (VIDEO, AUDIO, TEXT; required for VIRTUAL)
 * @param {number} [req.body.duration] - Duration in minutes (optional, defaults to 30 for VIRTUAL)
 * @param {Object} req.user - Authenticated user (patient)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with appointment data
 */
export const initiateAppointment = async (req, res, next) => {
  try {
    const data = await appointmentService.initiateAppointment(req.body, req.user, req.log);
    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    // Pass the error to the next middleware (global error handler)
    next(err);
  }
};

/**
 * Retrieves a list of appointments for the authenticated user.
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.skip=0] - Number of records to skip
 * @param {number} [req.query.take=10] - Number of records to take
 * @param {string} [req.query.status] - Appointment status filter
 * @param {string} [req.query.doctorId] - Doctor ID filter
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with appointments array
 */
export const getAppointments = async (req, res, next) => {
  try {
    const { skip, take, status, doctorId } = req.query;
    const appointments = await appointmentService.getAppointments(
      { skip, take, status, doctorId },
      req.user,
      req.logger,
    );
    res.status(200).json({
      status: 'success',
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single appointment by ID.
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with appointment data
 */
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

/**
 * Cancels an appointment.
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.body - Request body
 * @param {string} [req.body.reason] - Cancellation reason
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with cancelled appointment data
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment(
      req.params.id,
      req.user,
      req.body.reason,
      req.logger,
    );
    res.status(200).json({
      status: 'success',
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Joins an appointment (e.g., generates Agora token or Socket.IO room details).
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with session details
 */
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

/**
 * Sends a message in a TEXT consultation.
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.content - Message content
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with saved message and session details
 */
export const sendMessage = async (req, res, next) => {
  try {
    const data = await appointmentService.sendMessage(
      {
        appointmentId: req.params.id,
        content: req.body.content,
      },
      req.user,
      req.logger,
    );
    res.status(201).json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves messages for a TEXT consultation appointment.
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.skip=0] - Number of messages to skip
 * @param {number} [req.query.take=20] - Number of messages to retrieve
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with array of messages
 */
export const getMessages = async (req, res, next) => {
  try {
    const { skip, take } = req.query;
    const messages = await appointmentService.getMessages(
      {
        appointmentId: req.params.id,
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      },
      req.user,
      req.logger,
    );
    res.status(200).json({
      status: 'success',
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirms an appointment (by doctor or admin).
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON response with confirmed appointment data
 */
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

/**
 * Completes an appointment, setting status to COMPLETED.
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Appointment ID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 * @returns {Object} JSON response with completed appointment data
 */
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