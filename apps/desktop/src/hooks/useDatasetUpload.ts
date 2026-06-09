import { useState } from 'react';

export const useDatasetUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5172';

  const uploadFile = async (file: File): Promise<any> => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.txt', '.tsv', '.json'];
    if (!allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setUploadError('Supported: CSV, Excel, TXT, TSV, JSON.');
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const targetUrl = `${API_BASE_URL}/api/project/import-csv`;

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        return data;
      } else {
        setUploadError(data.error || 'Upload failed.');
        return null;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setUploadError('Upload timed out.');
      } else {
        setUploadError('Network error during upload.');
      }
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, uploadError, setUploadError };
};
