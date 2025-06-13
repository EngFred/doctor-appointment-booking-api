import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        specialty: true,
        hospitalId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized. User not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized. Invalid or expired token.' });
  }
};

export const restrictToSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ status: 'error', message: 'Forbidden. Super Admin access required.' });
  }
  next();
};

export const restrictToDoctor = (req, res, next) => {
  if (req.user.role !== 'DOCTOR') {
    return res.status(403).json({ status: 'error', message: 'Forbidden. Doctor access required.' });
  }
  next();
};