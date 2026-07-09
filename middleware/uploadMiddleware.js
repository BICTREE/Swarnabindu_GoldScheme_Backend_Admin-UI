const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'uploads');

// Ensure upload folders exist
const createFolders = () => {
  const dirs = [
    uploadDir,
    path.join(uploadDir, 'profiles'),
    path.join(uploadDir, 'kyc'),
    path.join(uploadDir, 'selfies')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createFolders();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = '';
    if (file.fieldname === 'profilePicture') {
      folder = 'profiles';
    } else if (file.fieldname === 'selfie') {
      folder = 'selfies';
    } else {
      folder = 'kyc';
    }
    cb(null, path.join(uploadDir, folder));
  },
  filename: (req, file, cb) => {
    // Generate unique name: fieldname-userId-timestamp.ext
    const userId = req.user ? req.user._id : 'anonymous';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter (JPG and PNG only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, and PNG images are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limits
  fileFilter: fileFilter
});

module.exports = upload;
