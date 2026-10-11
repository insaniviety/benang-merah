import type { Lang } from "./i18n";

export const pwaCopy: Record<Lang, {
  install: string; title: string; description: string; ios: string; browser: string;
  offline: string; preview: string; close: string;
}> = {
  id: {
    install: "Install aplikasi", title: "Install Benang Merah",
    description: "Menulis offline tersedia setelah aplikasi dibuka online sekali. Analisis Gemini tetap membutuhkan internet.",
    ios: "Di Safari, ketuk Bagikan, lalu Tambahkan ke Layar Utama.",
    browser: "Buka aplikasi yang telah dipublikasikan di Chrome atau Edge, lalu pilih Install aplikasi di menu browser atau ikon instalasi di bilah alamat.",
    offline: "Offline · Gemini tidak tersedia", preview: "Instalasi dan akses offline tersedia pada aplikasi yang telah dipublikasikan, bukan di pratinjau ini.", close: "Tutup",
  },
  en: {
    install: "Install app", title: "Install Benang Merah",
    description: "Offline writing is available after opening the app online once. Gemini analysis still requires internet.",
    ios: "In Safari, tap Share, then Add to Home Screen.",
    browser: "Open the published app in Chrome or Edge, then choose Install app in the browser menu or the install icon in the address bar.",
    offline: "Offline · Gemini unavailable", preview: "Installation and offline access are available in the published app, not in this preview.", close: "Close",
  },
  "zh-CN": {
    install: "安装应用", title: "安装 Benang Merah",
    description: "首次联网打开应用后即可离线写作。Gemini 分析仍需网络连接。",
    ios: "在 Safari 中点按“分享”，然后选择“添加到主屏幕”。",
    browser: "在 Chrome 或 Edge 中打开已发布的应用，然后从浏览器菜单或地址栏的安装图标选择安装应用。",
    offline: "离线 · Gemini 不可用", preview: "安装和离线访问仅适用于已发布的应用，不适用于此预览。", close: "关闭",
  },
  "zh-TW": {
    install: "安裝應用程式", title: "安裝 Benang Merah",
    description: "首次連網開啟應用程式後即可離線寫作。Gemini 分析仍需網路連線。",
    ios: "在 Safari 中點選「分享」，然後選擇「加入主畫面」。",
    browser: "在 Chrome 或 Edge 中開啟已發佈的應用程式，然後從瀏覽器選單或網址列的安裝圖示選擇安裝應用程式。",
    offline: "離線 · Gemini 無法使用", preview: "安裝和離線存取僅適用於已發佈的應用程式，不適用於此預覽。", close: "關閉",
  },
};