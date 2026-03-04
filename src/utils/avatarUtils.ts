export const DEFAULT_AVATAR_STYLE = 'bottts';

export type AvatarStyle = string;

export interface AvatarOptions {
  seed: string;
  style?: AvatarStyle;
  backgroundColor?: string;
  size?: number;
}

/**
 * Generates a DiceBear avatar URL based on the provided options.
 * @param options Avatar configuration options
 * @returns The URL of the generated avatar image
 */
export const getAvatarUrl = ({ 
  seed, 
  style = DEFAULT_AVATAR_STYLE as AvatarStyle, 
  backgroundColor,
  size
}: AvatarOptions): string => {
  const baseUrl = 'https://api.dicebear.com/9.x';
  const params = new URLSearchParams();
  
  params.append('seed', seed);
  
  if (backgroundColor) {
    params.append('backgroundColor', backgroundColor);
  }
  
  if (size) {
    params.append('size', size.toString());
  }

  // Ensure style is valid, fallback to default if not
  const validStyle = style || DEFAULT_AVATAR_STYLE;

  return `${baseUrl}/${validStyle}/svg?${params.toString()}`;
};

/**
 * Generates a random seed string.
 * @returns A random string
 */
export const getRandomSeed = (): string => {
  return Math.random().toString(36).substring(2, 15);
};
