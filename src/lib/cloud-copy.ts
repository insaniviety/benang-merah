import type { Lang } from "./i18n";

export const cloudCopy: Record<Lang, { label: string; on: string; off: string; syncing: string; synced: string; error: string; hint: string }> = {
  id: { label: "Simpan di awan", on: "☁️ Tersinkron ke akun", off: "Hanya di perangkat ini", syncing: "Menyinkronkan…", synced: "Tersinkron", error: "Gagal sinkron, akan dicoba lagi", hint: "Naskah ini akan ikut terbuka di perangkat lain saat kamu login. Hanya akunmu yang bisa membacanya." },
  en: { label: "Save to cloud", on: "☁️ Synced to account", off: "This device only", syncing: "Syncing…", synced: "Synced", error: "Sync failed, will retry", hint: "This manuscript will open on any device you sign in to. Only your account can read it." },
  "zh-CN": { label: "保存到云端", on: "☁️ 已同步到账户", off: "仅限此设备", syncing: "同步中…", synced: "已同步", error: "同步失败，稍后重试", hint: "登录其他设备时也能打开此手稿。只有你的账户可以读取。" },
  "zh-TW": { label: "儲存到雲端", on: "☁️ 已同步到帳戶", off: "僅限此裝置", syncing: "同步中…", synced: "已同步", error: "同步失敗，稍後重試", hint: "登入其他裝置時也能開啟此手稿。只有你的帳戶可以讀取。" },
};
