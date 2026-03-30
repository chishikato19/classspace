import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../../config/firebase';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  thumbnailLink?: string;
}

class DriveService {
  private accessToken: string | null = null;

  async authenticate(): Promise<string> {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    
    const provider = new GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    
    // Force prompt to ensure we get a fresh access token
    provider.setCustomParameters({
      prompt: 'consent'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Could not get Google Drive access token");
    }
    
    this.accessToken = credential.accessToken;
    return this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async fetchFiles(folderId: string = 'root', pageToken?: string): Promise<{ files: DriveFile[], nextPageToken?: string }> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with Google Drive");
    }

    const queryParts = [
      "mimeType='application/vnd.google-apps.folder'",
      "mimeType='application/pdf'",
      "mimeType='application/vnd.google-apps.presentation'",
      "mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation'",
      "mimeType='application/vnd.ms-powerpoint'",
      "mimeType='application/vnd.google-apps.document'",
      "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
      "mimeType='application/msword'"
    ];
    const q = `(${queryParts.join(' or ')}) and trashed=false and '${folderId}' in parents`;
    
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.append('q', q);
    url.searchParams.append('fields', 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)');
    url.searchParams.append('orderBy', 'folder, modifiedTime desc');
    url.searchParams.append('pageSize', '50');
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.accessToken = null; // Token expired
      }
      const errorText = await response.text();
      console.error('Drive API Error Response:', errorText);
      
      let errorMessage = `Google Drive API error: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        // Fallback to raw text if not JSON
        if (response.status === 403) {
          errorMessage = "Google Drive API error: 403 Forbidden. The API might be disabled or the app lacks permissions.";
        }
      }
      
      throw new Error(errorMessage);
    }

    return await response.json();
  }
}

export const driveService = new DriveService();
