import { useEffect, useMemo, useState } from 'react';
import candidateAPI from '@/services/candidateAPI';
import { createDocumentObjectUrl } from '@/lib/documentUtils';
import { findProfilePictureDocument } from '@/lib/candidateProfilePicture';

const profilePictureUrlCache = new Map();

const getCacheKey = (candidateId, documentId) => `${candidateId}:${documentId}`;

export const invalidateCandidateProfilePictureCache = (candidateId, documentId) => {
  if (candidateId == null || documentId == null) return;
  const cacheKey = getCacheKey(candidateId, documentId);
  const cachedUrl = profilePictureUrlCache.get(cacheKey);
  if (cachedUrl) {
    window.URL.revokeObjectURL(cachedUrl);
    profilePictureUrlCache.delete(cacheKey);
  }
};

export function useCandidateProfilePicture(candidateId, profilePictureDocumentId, documents) {
  const resolvedDocument = useMemo(() => {
    const fromDocuments = findProfilePictureDocument(documents);
    if (fromDocuments?.id) {
      return fromDocuments;
    }
    if (profilePictureDocumentId) {
      return { id: profilePictureDocumentId };
    }
    return null;
  }, [documents, profilePictureDocumentId]);

  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!candidateId || !resolvedDocument?.id) {
      setUrl(null);
      return undefined;
    }

    const cacheKey = getCacheKey(candidateId, resolvedDocument.id);
    const cachedUrl = profilePictureUrlCache.get(cacheKey);
    if (cachedUrl) {
      setUrl(cachedUrl);
      return undefined;
    }

    let cancelled = false;

    candidateAPI.downloadCandidateDocument(candidateId, resolvedDocument.id)
      .then((response) => {
        if (cancelled) return;
        const objectUrl = createDocumentObjectUrl(response, {
          contentType:
            response.headers?.['content-type']
            || resolvedDocument.contentType
            || 'image/jpeg',
        });
        profilePictureUrlCache.set(cacheKey, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId, resolvedDocument]);

  return url;
}
