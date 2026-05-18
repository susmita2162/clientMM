/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE: string;
  readonly VITE_MOCK_API_BASE_URL: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CLAIMS_SEARCH_API_URL: string;
  readonly VITE_CLAIM_MATCH_API_URL: string;
  readonly VITE_API_TIMEOUT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
