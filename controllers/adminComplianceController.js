const GrievanceTicket = require('../models/GrievanceTicket');
const IncidentLog = require('../models/IncidentLog');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Get all grievance tickets (filtered by status or SLA breaches)
 * @route   GET /api/v1/admin/compliance/grievance
 * @access  Private (Admin)
 */
const getGrievances = async (req, res, next) => {
  try {
    const { status, slaBreach } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (slaBreach === 'true') {
      filter.status = { $ne: 'RESOLVED' };
      filter.slaExpiryDate = { $lt: new Date() };
    }

    const grievances = await GrievanceTicket.find(filter)
      .populate('userId', 'mobileNumber kycDetails.personalInfo.fullName')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Grievance list retrieved successfully',
      errorCode: null,
      data: { grievances }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign grievance ticket to admin agent
 * @route   PUT /api/v1/admin/compliance/grievance/:id/assign
 * @access  Private (Admin)
 */
const assignGrievance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'adminId is required for assignment.',
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const ticket = await GrievanceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Grievance ticket not found.',
        errorCode: 'TICKET_NOT_FOUND',
        data: null
      });
    }

    ticket.assignedTo = adminId;
    ticket.status = 'IN_PROGRESS';
    ticket.history.push({
      status: 'IN_PROGRESS',
      updatedBy: req.admin.email,
      notes: `Ticket assigned to admin agent ID: ${adminId}`
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Grievance ticket assigned successfully.',
      errorCode: null,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve grievance ticket
 * @route   PUT /api/v1/admin/compliance/grievance/:id/resolve
 * @access  Private (Admin)
 */
const resolveGrievance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    if (!resolutionNotes) {
      return res.status(400).json({
        success: false,
        message: 'resolutionNotes is required to close the grievance.',
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const ticket = await GrievanceTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Grievance ticket not found.',
        errorCode: 'TICKET_NOT_FOUND',
        data: null
      });
    }

    ticket.status = 'RESOLVED';
    ticket.resolutionNotes = resolutionNotes;
    ticket.resolvedAt = new Date();
    ticket.history.push({
      status: 'RESOLVED',
      updatedBy: req.admin.email,
      notes: `Ticket resolved with notes: ${resolutionNotes}`
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: 'Grievance ticket marked as RESOLVED.',
      errorCode: null,
      data: { ticket }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log a security breach / incident (Super Admin only)
 * @route   POST /api/v1/admin/compliance/incidents/log
 * @access  Private (Super Admin)
 */
const logIncident = async (req, res, next) => {
  try {
    const { title, description, severity, affectedComponents, estimatedImpactedUsers, remediationSteps, reportedToCertIn } = req.body;

    if (!title || !description || !severity) {
      return res.status(400).json({
        success: false,
        message: 'title, description, and severity are required.',
        errorCode: 'VALIDATION_ERROR',
        data: null
      });
    }

    const incidentId = `INC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const incident = await IncidentLog.create({
      incidentId,
      title,
      description,
      severity,
      affectedComponents: affectedComponents || [],
      estimatedImpactedUsers: estimatedImpactedUsers || 0,
      remediationSteps: remediationSteps || '',
      reportedToCertIn: reportedToCertIn === 'true' || reportedToCertIn === true,
      reportedAt: (reportedToCertIn === 'true' || reportedToCertIn === true) ? new Date() : null,
      loggedBy: req.admin._id
    });

    // Log the security action in the main audit ledger
    await AuditLog.create({
      adminId: req.admin._id,
      performedByEmail: req.admin.email,
      action: 'LOG_INCIDENT',
      targetEntity: 'IncidentLog',
      targetId: incident._id,
      details: { title, severity },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(201).json({
      success: true,
      message: 'Security incident logged successfully in accordance with compliance guidelines.',
      errorCode: null,
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all logged security incidents (Super Admin only)
 * @route   GET /api/v1/admin/compliance/incidents
 * @access  Private (Super Admin)
 */
const getIncidents = async (req, res, next) => {
  try {
    const incidents = await IncidentLog.find()
      .populate('loggedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Security incidents list retrieved successfully',
      errorCode: null,
      data: { incidents }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Secure document media pipeline gateway (Authorizes, logs, and pipes files)
 * @route   GET /api/v1/admin/compliance/media/:userId/:fileType
 * @access  Private (Admin - View:Kyc permissions enforced)
 */
const getSecureMedia = async (req, res, next) => {
  try {
    const { userId, fileType } = req.params;

    // 1. Authorize file types based on admin role
    const kycDocuments = ['aadhaarFront', 'aadhaarBack', 'panCardPhoto'];
    
    let isKycFull = req.admin.role === 'SUPER_ADMIN' || req.admin.role === 'MODERATOR';

    if (kycDocuments.includes(fileType) && !isKycFull) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have elevated kyc:full privileges to download identity documents.',
        errorCode: 'FORBIDDEN',
        data: null
      });
    }

    // 2. Fetch User
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        errorCode: 'USER_NOT_FOUND',
        data: null
      });
    }

    // 3. Resolve local path
    let relativePath = '';
    if (fileType === 'aadhaarFront') relativePath = user.kycDetails?.identityVerification?.aadhaarFront;
    if (fileType === 'aadhaarBack') relativePath = user.kycDetails?.identityVerification?.aadhaarBack;
    if (fileType === 'panCardPhoto') relativePath = user.kycDetails?.identityVerification?.panCardPhoto;
    if (fileType === 'selfie') relativePath = user.kycDetails?.selfieVerification?.selfiePath;

    if (!relativePath) {
      return res.status(404).json({
        success: false,
        message: 'Requested document has not been uploaded by the user.',
        errorCode: 'FILE_NOT_FOUND',
        data: null
      });
    }

    const absolutePath = path.join(__dirname, '..', relativePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: 'File does not exist on the local secure storage server.',
        errorCode: 'FILE_NOT_FOUND',
        data: null
      });
    }

    // 4. Log the secure access in the immutable audit log
    await AuditLog.create({
      adminId: req.admin._id,
      performedByEmail: req.admin.email,
      action: 'DOWNLOAD_SECURE_MEDIA',
      targetEntity: 'User',
      targetId: user._id,
      details: { fileType, ipAddress: req.ip },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 5. Pipe file stream
    res.setHeader('Content-Type', 'image/png'); // adjust or detect mimetype
    return fs.createReadStream(absolutePath).pipe(res);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGrievances,
  assignGrievance,
  resolveGrievance,
  logIncident,
  getIncidents,
  getSecureMedia
};
