import { create } from 'zustand';

interface UploadState {
  isUploading: boolean;
  uploadResults: any | null;
  uploadError: string | null; 
  startUpload: (apiUrl: string, payloads: any) => Promise<void>;
  clearStore: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    isUploading: false,
    uploadResults: null,
    uploadError: null,
    startUpload: async (apiUrl, payloads) => {
        set({ isUploading: true, uploadError: null, uploadResults: null });
        try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templates: payloads }),
        });

        if (!res.ok) throw new Error(`Server Error: ${res.statusText}`);

        const data = await res.json();
        set({ uploadResults: data.results, isUploading: false });
        } catch (error: any) {
            set({ uploadError: error.message || 'Something went wrong', isUploading: false });
        }
    },
    clearStore: () => set({ uploadResults: null, uploadError: null, isUploading: false }),
}));