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

module.exports = {
  uploadImage,
}; 