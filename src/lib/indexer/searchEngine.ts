import { parseKakaoCsvFile } from "../parser/kakaoCsvParser";
import { LoadResult, SearchOptions, SearchPayload } from "./types";
import { createSearchIndex, SearchIndex } from "./searchIndex";

export class SearchEngine {
  private index: SearchIndex | null = null;

  private getEngine(): SearchIndex {
    if (!this.index) {
      this.index = createSearchIndex();
    }

    return this.index;
  }

  async loadCsv(file: File): Promise<LoadResult> {
    const start = performance.now();

    const messages = await parseKakaoCsvFile(file);
    const engine = this.getEngine();
    engine.setData(messages);

    const firstRows = engine.search({ query: "", userFilter: undefined, limit: 100 }).rows;
    const tookMs = Math.round(performance.now() - start);

    return {
      messageCount: messages.length,
      users: engine.getUsers(),
      firstRows,
      total: messages.length,
      tookMs,
    };
  }

  search(options: SearchOptions): SearchPayload {
    const start = performance.now();
    const engine = this.getEngine();
    const result = engine.search(options);

    return {
      rows: result.rows,
      total: result.total,
      tookMs: Math.round(performance.now() - start),
    };
  }

  reset() {
    this.index = null;
  }
}
