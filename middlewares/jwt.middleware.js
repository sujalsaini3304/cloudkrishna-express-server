import jwt from "jsonwebtoken"

const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin" || decoded.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required"
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

const verifySuperAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if ( decoded.email !== process.env.SUPER_ADMIN_EMAIL || decoded.role !== "super-admin" ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    req.superAdmin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

export default verifyAdminToken;
export { verifySuperAdminToken };