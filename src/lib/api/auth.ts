import apiClient from './client';

export interface AuthResponse {
  csrfToken?: string;
  session?: {
    id: string;
    expiresAt: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    profileImage: string | null;
    isAdmin: boolean;
  };
}

export const authAPI = {
  googleSignIn: async (idToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/google', { idToken });
    return response as unknown as AuthResponse;
  },

  googleCodeSignIn: async (data: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/google/code', data);
    return response as unknown as AuthResponse;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/profile/me');
    return response;
  },

  logout: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/auth/logout', {});
    return response as unknown as { success: boolean };
  },
};
