export const createDocumentObjectUrl = (response, document) =>
  window.URL.createObjectURL(new Blob([response.data], { type: document.contentType }));

export const downloadBlobResponse = (response, document) => {
  const url = createDocumentObjectUrl(response, document);
  const link = window.document.createElement('a');

  link.href = url;
  link.download = document.fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const revokeObjectUrl = (url) => {
  if (url) {
    window.URL.revokeObjectURL(url);
  }
};
