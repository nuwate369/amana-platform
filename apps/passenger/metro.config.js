// Metro مهيّأ للـ Monorepo + nativewind.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { FileStore } = require('metro-cache');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// راقب جذر الـ Monorepo كي تُحلّ الحزم المشتركة.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// ذاكرة مؤقّتة خاصّة بكل تطبيق.
//
// التطبيقان يتشاركان جذر الـ Monorepo، وMetro يخزّن مؤقّتًا في مجلّد النظام
// المشترك — فبناء أحدهما بعد الآخر كان يقرأ وحدات من مشروع جاره ويفشل بخطأ
// «Unable to resolve module» لملفّ ليس في مشروعه أصلًا. العزل داخل مجلّد
// التطبيق يجعل التلوّث مستحيلًا بدل الاعتماد على مسح الذاكرة يدويًّا.
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, 'node_modules', '.cache', 'metro') }),
];

module.exports = withNativeWind(config, { input: './global.css' });
