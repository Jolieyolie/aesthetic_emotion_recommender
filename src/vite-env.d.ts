/// <reference types="vite/client" />
/// <reference types="vite/client" />

declare module "*.css" {}
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_IMAGE_TABLE?: string;
}
