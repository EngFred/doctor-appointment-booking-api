import prisma from '../config/database.js';
import { generateAgoraToken } from '../utils/agoraToken.js';
import { sendNotification } from '../services/notificationService.js';

export const createConsultation = async (req, res) => {
  try {
    if (req.user?.role !== 'PATIENT') {
      return res.status(403).json({ success: false, message: 'Patient access required' });
    }

    const { doctorId, type } = req.body;
    if (!doctorId || !['VIDEO', 'AUDIO', 'TEXT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Doctor ID and valid type (VIDEO, AUDIO, TEXT) are required' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId: req.user.id,
        doctorId,
        type,
        status: 'PENDING',
      },
    });

    let agoraToken = null;
    if (type === 'VIDEO' || type === 'AUDIO') {
      agoraToken = generateAgoraToken(
        `consultation_${consultation.id}`,
        req.user.id,
        'publisher',
        3600
      );
    }

    // Send notifications
    await sendNotification({
      userId: req.user.id,
      title: 'Consultation Requested',
      body: `Your ${type.toLowerCase()} consultation with Dr. ${doctor.lastName} is pending.`,
    });
    await sendNotification({
      userId: doctorId,
      title: 'New Consultation Request',
      body: `Patient ${req.user.firstName} requested a ${type.toLowerCase()} consultation.`,
    });

    res.status(201).json({
      success: true,
      data: {
        id: consultation.id,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        type: consultation.type,
        status: consultation.status,
        agoraToken,
        channelName: `consultation_${consultation.id}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserConsultations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const where = role === 'PATIENT' ? { patientId: userId } : { doctorId: userId };

    const consultations = await prisma.consultation.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: consultations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    if (
      (req.user.role === 'PATIENT' && req.user.id !== consultation.patientId) ||
      (req.user.role === 'DOCTOR' && req.user.id !== consultation.doctorId)
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const updatedConsultation = await prisma.consultation.update({
      where: { id },
      data: { status },
    });

    // Send notification
    const recipientId = req.user.role === 'PATIENT' ? consultation.doctorId : consultation.patientId;
    await sendNotification({
      userId: recipientId,
      title: 'Consultation Status Updated',
      body: `Your ${consultation.type.toLowerCase()} consultation is now ${status.toLowerCase()}.`,
    });

    res.status(200).json({ success: true, data: updatedConsultation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};