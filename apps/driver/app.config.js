// إعداد ديناميكي — يقرأ الإعداد الثابت من app.json ويضيف plugin خرائط Mapbox
// مع حقن **مفتاح التنزيل السرّي** (sk.) من متغيّر البيئة، فلا يُكتب في أي ملف يُرفع.
//   • محليًّا: يُقرأ MAPBOX_DOWNLOAD_TOKEN من apps/driver/.env (متجاهَل في Git).
//   • بناء سحابي (EAS): يُحقَن عبر `eas secret:create --name MAPBOX_DOWNLOAD_TOKEN`.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN ?? '',
      },
    ],
  ],
});
