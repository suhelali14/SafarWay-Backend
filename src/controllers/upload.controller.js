const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the file path
    const filePath = `/uploads/${req.file.filename}`;
    res.status(201).json({
      message: 'File uploaded successfully',
      filePath,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

// Upload multiple media files for posts
const uploadMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Generate URLs for uploaded files
    const urls = req.files.map(file => {
      return `${req.protocol}://${req.get('host')}/uploads/media/${file.filename}`;
    });

    res.json({
      success: true,
      message: 'Media files uploaded successfully',
      data: {
        urls: urls,
        count: urls.length
      }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  uploadMedia
}; 