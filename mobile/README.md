# 食练格移动端

使用 React Native + Expo + TypeScript 重构的 Android/iOS 原生项目。当前交付默认使用明确标记的 Mock 数据，可切换到真实后端，API 失败不会回退到 Mock。

## 运行

```powershell
npm install
Copy-Item .env.example .env
npm start
```

正式 APK 必须使用 HTTPS API。Android 模拟器开发时，`10.0.2.2` 指向开发电脑；如需连接本机 HTTP 服务，应只在开发构建中配置明文网络权限。

## 数据源

默认 Mock：

```dotenv
EXPO_PUBLIC_DATA_SOURCE=mock
```

真实后端：

```dotenv
EXPO_PUBLIC_DATA_SOURCE=api
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api/v1
```

真实后端需实现：

- `GET /api/v1/app-bootstrap`
- `POST /api/v1/plan-suggestions`
- `POST /api/v1/plans/activate`

`src/config` 只保存前端固定配置；`src/data/mockSeed.ts` 只保存演示数据和 Mock 计划算法；`src/data/dataSource.ts` 负责 Mock/API 适配；页面只通过 `src/store/AppProvider.tsx` 读取统一的数据结构。

## 本地数据

- SQLite：饮食、训练、体重、目标、计划和设置。
- SQLCipher：原生构建中的数据库静态加密。
- SecureStore：保存随机生成的数据库密钥。
- JSON 导出：在“我的 > 数据导出与云备份”中生成并调用系统分享。

## 验证与构建

```powershell
npm run typecheck
npm run doctor
npm run export:android
npm run android:prebuild
npm run android:apk:debug
```

Android 安装包通常生成在 `android/app/build/outputs/apk/debug/app-debug.apk`。Windows 用户目录或项目路径含中文时，Expo/NDK 可能崩溃；请使用纯 ASCII 构建副本，并把 `TEMP`、`TMP` 指向纯 ASCII 临时目录。
