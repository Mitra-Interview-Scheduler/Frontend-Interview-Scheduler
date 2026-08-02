const PROFILE_PICTURE_DOCUMENT_TYPES = new Set(['PROFILE', 'PROFILE_PICTURE', 'PROFILE PICTURE']);

export const isProfilePictureDocumentType = (documentType) => {
  const normalized = String(documentType || '').trim().toUpperCase();
  return PROFILE_PICTURE_DOCUMENT_TYPES.has(normalized);
};

export const isProfilePictureImageFile = (document) => {
  const contentType = String(document?.contentType || '').trim().toLowerCase();
  if (contentType === 'image/jpeg' || contentType === 'image/jpg' || contentType === 'image/png') {
    return true;
  }

  const fileName = String(document?.fileName || '').trim().toLowerCase();
  return /\.(png|jpe?g)$/.test(fileName);
};

export const isProfilePictureDocument = (document) =>
  isProfilePictureDocumentType(document?.documentType) && isProfilePictureImageFile(document);

export const findProfilePictureDocument = (documents) => {
  if (!Array.isArray(documents)) return null;
  return documents.find(isProfilePictureDocument) || null;
};
