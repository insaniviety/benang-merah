import type { Lang } from "./i18n";

export const workspaceCopy = {
  id: {
    deleteLabel: "Hapus Naskah", deleteTitle: "Hapus Naskah?",
    deleteMessage: "Apakah Anda yakin ingin menghapus naskah ini? Tindakan ini tidak dapat dibatalkan.",
    confirm: "Ya, Hapus", cancel: "Batal", empty: "Belum ada naskah. Mulai tulis karya pertamamu!",
    create: "Buat Naskah Baru", welcome: "Selamat datang di Benang Merah", name: "Nama Penulis",
    continue: "Mulai Menulis", intro: "Kisah baru dimulai dari Anda.", local: "Profil penulis tersimpan di perangkat Anda.",
  },
  en: {
    deleteLabel: "Delete Manuscript", deleteTitle: "Delete Manuscript?",
    deleteMessage: "Are you sure you want to delete this manuscript? This action cannot be undone.",
    confirm: "Yes, Delete", cancel: "Cancel", empty: "No manuscripts yet. Start writing your first masterpiece!",
    create: "Create New Manuscript", welcome: "Welcome to Benang Merah", name: "Writer Name",
    continue: "Start Writing", intro: "A new story begins with you.", local: "Your writer profile is saved on this device.",
  },
  "zh-CN": {
    deleteLabel: "删除手稿", deleteTitle: "确认删除手稿？",
    deleteMessage: "您确定要删除此手稿吗？此操作无法撤销。",
    confirm: "确认删除", cancel: "取消", empty: "暂无手稿。开始创作您的第一部作品吧！",
    create: "新建手稿", welcome: "欢迎来到 Benang Merah", name: "作者姓名",
    continue: "开始写作", intro: "新的故事，由您开启。", local: "作者资料保存在您的设备上。",
  },
  "zh-TW": {
    deleteLabel: "刪除稿件", deleteTitle: "確認刪除稿件？",
    deleteMessage: "您確定要刪除此稿件嗎？此操作無法復原。",
    confirm: "確認刪除", cancel: "取消", empty: "暫無稿件。開始創作您的第一部作品吧！",
    create: "建立新稿件", welcome: "歡迎來到 Benang Merah", name: "作者姓名",
    continue: "開始寫作", intro: "新的故事，由您開啟。", local: "作者資料儲存在您的裝置上。",
  },
} satisfies Record<Lang, Record<string, string>>;