export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      error: 'Access denied. Admins only.',
    });
  }
  next();
};