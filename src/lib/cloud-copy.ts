import type { Lang } from "./i18n";

export const cloudCopy: Record<Lang, { label: string; on: string; off: string; syncing: string; synced: string; error: string; hint: string }> = {
  id: { label: "Simpan di awan", on: "☁️ Simpan ke akun", off: "Hanya di perangkat ini", syncing: "Menunggu sinkron…", synced: "Tersinkron", error: "Gagal sinkron, akan dicoba lagi", hint: "Simpan awan aktif otomatis. Tunggu status Tersinkron sebelum menghapus aplikasi. Hanya akunmu yang dapat mengakses; pilihan lokal saja tidak dapat dipulihkan setelah data perangkat dihapus." },
  en: { label: "Save to cloud", on: "☁️ Account storage", off: "This device only", syncing: "Sync pending…", synced: "Synced", error: "Sync failed, will retry", hint: "Cloud storage is on by default. Wait for Synced before uninstalling. Only your account has access; device-only work cannot be restored after device data is removed." },
  "zh-CN": { label: "保存到云端", on: "☁️ 账户存储", off: "仅限此设备", syncing: "等待同步…", synced: "已同步", error: "同步失败，稍后重试", hint: "默认启用云端存储。卸载前请等待「已同步」。仅你的账户可访问；设备数据删除后无法恢复仅保存在本地的作品。" },
  "zh-TW": { label: "儲存到雲端", on: "☁️ 帳戶儲存", off: "僅限此裝置", syncing: "等待同步…", synced: "已同步", error: "同步失敗，稍後重試", hint: "預設啟用雲端儲存。解除安裝前請等待「已同步」。僅你的帳戶可存取；裝置資料刪除後無法復原僅儲存在本機的作品。" },
};
