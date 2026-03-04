import { Index } from "flexsearch";
import { KakaoMessage, SearchHit, SearchOptions } from "./types";

type FlexIndex = InstanceType<typeof Index>;

type IndexedRecord = Pick<KakaoMessage, "id" | "date" | "user" | "message">;

class SearchIndex {
  private index: FlexIndex;
  private records = new Map<number, IndexedRecord>();
  private orderedIds: number[] = [];
  private userIndex = new Map<string, Set<number>>();
  private userLabelByKey = new Map<string, string>();

  constructor() {
      this.index = new Index({
        encode: false,
        tokenize: "forward",
        optimize: true,
        worker: false,
      }) as FlexIndex;
  }

  private normalizeUser = (user: string): string => user.trim().toLowerCase();
  private normalizeMessage = (message: string): string => message.trim().toLowerCase();
  private normalizeQuery = (query: string): string => query.trim().toLowerCase();

  setData(messages: KakaoMessage[]) {
    this.records.clear();
    this.userIndex.clear();
    this.index = new Index({
      encode: false,
      tokenize: "forward",
      optimize: true,
    }) as FlexIndex;

    this.orderedIds = messages.map((message) => message.id);

    messages.forEach((message) => {
      this.records.set(message.id, message);
      this.index.add(message.id, this.normalizeMessage(message.message));

      const key = this.normalizeUser(message.user);
      this.userLabelByKey.set(key, message.user);

      if (!this.userIndex.has(key)) {
        this.userIndex.set(key, new Set());
      }
      this.userIndex.get(key)?.add(message.id);
    });
  }

  getUsers(): string[] {
    return Array.from(this.userIndex.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((user) => {
        const firstId = this.userIndex.get(user)?.values().next().value;
        if (firstId === undefined) return user;
        const original = this.userLabelByKey.get(user);
        return original || user;
      });
  }

  search(options: SearchOptions): { rows: SearchHit[]; total: number } {
    const query = this.normalizeQuery(options.query);
    const limit = options.limit;
    const userKey = options.userFilter
      ? this.normalizeUser(options.userFilter)
      : undefined;

    let candidateIds: number[] = [];

    if (query.length > 0) {
      const rawResult = this.index.search(query, {
        limit,
      }) as Array<number> | Array<string>;
      candidateIds = Array.from(new Set(rawResult)).map((id) =>
        typeof id === "string" ? Number(id) : id,
      );
    } else if (userKey) {
      const allowed = this.userIndex.get(userKey);
      if (allowed) {
        candidateIds = this.orderedIds.filter((id) => allowed.has(id));
      }
    } else {
      candidateIds = [...this.orderedIds];
    }

    if (userKey) {
      const allowed = this.userIndex.get(userKey);
      if (!allowed) {
        return { rows: [], total: 0 };
      }
      candidateIds = candidateIds.filter((id) => allowed.has(id));
    }

    const total = candidateIds.length;

    const rows = candidateIds
      .slice(0, limit)
      .map((id) => this.records.get(id))
      .filter((item): item is IndexedRecord => Boolean(item));

    return { rows, total };
  }
}

export const createSearchIndex = () => new SearchIndex();
export type { SearchIndex };
