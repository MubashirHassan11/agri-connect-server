import * as fileService from '../services/file.service.js';

export const getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = await fileService.getFileById(id);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    return res.send(file.data);
  } catch (error) {
    return res.status(error.status || 404).json({
      success: false,
      message: error.message || 'File not found',
    });
  }
};





