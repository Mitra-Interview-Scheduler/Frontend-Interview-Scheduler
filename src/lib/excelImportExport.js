import api from '@/services/api';
import { downloadBlobResponse } from '@/lib/documentUtils';

/**
 * Shared Excel import/export helpers for master-data and candidate screens.
 */
export async function exportExcel(path, filename) {
  const response = await api.get(path, { responseType: 'blob' });
  downloadBlobResponse(response, {
    fileName: filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function importExcel(path, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(path, formData);
  return response.data;
}

export function summarizeImportResult(result) {
  if (!result) return 'Import finished';
  const parts = [];
  if (result.created) parts.push(`${result.created} created`);
  if (result.skipped) parts.push(`${result.skipped} skipped`);
  if (result.failed) parts.push(`${result.failed} failed`);
  return parts.length ? parts.join(', ') : 'No rows processed';
}

export function createExcelApi(basePath, filename) {
  return {
    exportExcel: () => exportExcel(`${basePath}/export`, filename),
    importExcel: (file) => importExcel(`${basePath}/import`, file),
  };
}
