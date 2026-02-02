import sharp from 'sharp';
import File from '../models/File.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const saveBase64Image = async (dataUrl, { createdBy, purpose = 'other' } = {}) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    throw new BadRequestError('Invalid image data');
  }

  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    throw new BadRequestError('Invalid image format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  const webpBuffer = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const file = await File.create({
    filename: `image-${Date.now()}.webp`,
    mimeType: 'image/webp',
    size: webpBuffer.length,
    data: webpBuffer,
    purpose,
    createdBy,
  });

  return file;
};

export const getFileById = async (id) => {
  const file = await File.findById(id);
  if (!file) {
    throw new NotFoundError('File not found');
  }
  return file;
};




