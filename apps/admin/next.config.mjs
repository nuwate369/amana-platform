/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // نسمح لـ Next بترجمة الحزم المشتركة من الـ Monorepo (TS خام بدون build).
  transpilePackages: [
    '@amana/shared-types',
    '@amana/shared-ui',
    '@amana/supabase-client',
    '@amana/i18n',
  ],
};

export default nextConfig;
