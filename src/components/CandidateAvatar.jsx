import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitial } from '@/lib/personUtils';
import { useCandidateProfilePicture } from '@/hooks/useCandidateProfilePicture';

export function CandidateAvatar({
  candidate,
  candidateId,
  name,
  profilePictureDocumentId,
  documents,
  className,
  fallbackClassName,
  imageClassName,
}) {
  const resolvedCandidateId = candidateId ?? candidate?.id;
  const resolvedName = name ?? candidate?.name;
  const resolvedDocumentId = profilePictureDocumentId ?? candidate?.profilePictureDocumentId;
  const pictureUrl = useCandidateProfilePicture(
    resolvedCandidateId,
    resolvedDocumentId,
    documents,
  );

  return (
    <Avatar className={className}>
      {pictureUrl ? (
        <AvatarImage
          src={pictureUrl}
          alt={resolvedName || 'Candidate'}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>
        {getInitial(resolvedName)}
      </AvatarFallback>
    </Avatar>
  );
}
