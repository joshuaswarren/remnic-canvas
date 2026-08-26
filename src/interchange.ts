import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { Memory, MemoryStore } from "./types";
import { fromMarkdown, toMarkdown } from "./types";

/**
 * Remnic interchange: every memory is a plain markdown file with YAML
 * frontmatter, the same shape Remnic keeps on disk. Export produces one
 * .md per memory; import accepts .md files or a zip of them.
 */
export function exportZip(memories: Memory[]): Blob {
  const files: Record<string, Uint8Array> = {};
  for (const m of memories) {
    if (m.status === "forgotten") continue;
    files[`${m.id}.md`] = strToU8(toMarkdown(m));
  }
  return new Blob([zipSync(files).buffer as ArrayBuffer], { type: "application/zip" });
}

export async function importFiles(store: MemoryStore, fileList: FileList): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  const texts: string[] = [];
  for (const file of Array.from(fileList)) {
    if (file.name.endsWith(".zip")) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [name, data] of Object.entries(entries)) {
        if (name.endsWith(".md")) texts.push(strFromU8(data));
      }
    } else {
      texts.push(await file.text());
    }
  }
  for (const text of texts) {
    const memory = fromMarkdown(text);
    if (!memory) {
      skipped++;
      continue;
    }
    const existing = await store.get(memory.id);
    if (existing) {
      skipped++;
      continue;
    }
    await store.create(memory);
    imported++;
  }
  return { imported, skipped };
}
