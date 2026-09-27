import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  title: z.string().max(160), synopsis: z.string().max(3000),
  chapters: z.array(z.object({ title: z.string(), summary: z.string() })).max(40),
  characters: z.array(z.string()).max(40), language: z.string().max(50),
});

export const generateTimeline = createServerFn({ method: "POST" })
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data }) => {
    const { createResponsesCall } = await import("./timeline-responses.server.ts");
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Layanan AI belum dikonfigurasi.");
    const payload = JSON.stringify(data);
    const call = createResponsesCall(new Request("http://localhost/timeline"), {
      baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra",
    }, [{ role: "user", content: `Buat kronologi peristiwa fiksi berdasarkan data naskah berikut: ${payload}\n\nBalas HANYA JSON valid tanpa markdown berupa objek {"events":[{"time":"...","era":"past|present","track":1,"event":"...","location":"...","characters":["..."],"connection":"..."}]}. Tulis dalam bahasa naskah. Hasilkan 4-8 peristiwa spesifik yang masuk akal, termasuk sekurangnya satu kejadian masa lalu jika cerita menyiratkannya. Susun urutan dari masa lalu menuju masa sekarang. Kejadian bersamaan gunakan track 1 dan 2 pada posisi waktu berurutan; untuk dua kejadian bersamaan pakai label time persis sama. Jangan mengarang karakter di luar daftar kecuali daftar kosong. connection menjelaskan hubungan kejadian lampau dengan masa sekarang; untuk kejadian sekarang boleh kosong. Lokasi dan waktu harus jelas bila diketahui, bila tidak gunakan deskripsi relatif tanpa menciptakan tanggal pasti.` }]);
    try {
      const text = await call.result.text;
      const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      const parsed = JSON.parse(cleaned);
      const schema = z.object({ events: z.array(z.object({
        time: z.string(), era: z.enum(["past", "present"]), track: z.number().int().min(1).max(4),
        event: z.string(), location: z.string(), characters: z.array(z.string()), connection: z.string(),
      })).min(1).max(16) });
      return schema.parse(parsed).events;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tidak dapat membuat timeline.";
      throw new Error(message);
    }
  });
