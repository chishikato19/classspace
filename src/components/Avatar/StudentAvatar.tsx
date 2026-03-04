import React, { useState, useEffect } from 'react';
import { AvatarConfig, Student } from '../../types';
import { getAvatarUrl, DEFAULT_AVATAR_STYLE, AvatarStyle } from '../../utils/avatarUtils';
import { User } from 'lucide-react';

interface StudentAvatarProps {
  student?: Student;
  avatarConfig?: AvatarConfig;
  name?: string; // Direct name prop if student object is not available
  size?: number;
  className?: string;
  showInitialsFallback?: boolean;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({ 
  student, 
  avatarConfig, 
  name,
  size = 48, 
  className = '',
  showInitialsFallback = true
}) => {
  const [hasError, setHasError] = useState(false);

  // Determine the name to use
  const displayName = name || student?.name || 'unknown';

  // Determine the config to use
  const config = avatarConfig || student?.avatarConfig || {
    style: DEFAULT_AVATAR_STYLE as AvatarStyle,
    seed: displayName,
  };

  const imgSrc = getAvatarUrl({
    seed: config.seed,
    style: config.style as AvatarStyle,
    backgroundColor: config.backgroundColor,
    size: size
  });

  useEffect(() => {
    setHasError(false);
  }, [imgSrc]);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError && showInitialsFallback && displayName !== 'unknown') {
    // Fallback to initials if image fails to load
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
      
    return (
      <div 
        className={`flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-400 rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <User size={size * 0.6} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={displayName || 'Avatar'}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
};
