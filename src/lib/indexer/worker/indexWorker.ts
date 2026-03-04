/* eslint-disable no-restricted-globals */

import { SearchEngine } from "../searchEngine";
import {
  WorkerRequest,
  WorkerResponse,
  LoadCsvRequest,
  SearchRequest,
} from "../../worker/messages";

declare const self: DedicatedWorkerGlobalScope;

const searchEngine = new SearchEngine();

const post = (data: WorkerResponse) => {
  self.postMessage(data);
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const payload = event.data;

    if (payload.type === "LOAD_CSV") {
      const request = payload as LoadCsvRequest;
      const loaded = await searchEngine.loadCsv(request.payload.file);

      post({
        type: "LOADED",
        payload: {
          messageCount: loaded.messageCount,
          users: loaded.users,
          firstRows: loaded.firstRows,
          total: loaded.total,
          tookMs: loaded.tookMs,
        },
      });
      return;
    }

    if (payload.type === "SEARCH") {
      const request = payload as SearchRequest;
      const result = searchEngine.search(request.payload);

      post({
        type: "SEARCH_RESULT",
        payload: {
          query: request.payload.query,
          userFilter: request.payload.userFilter,
          result: result.rows,
          total: result.total,
          tookMs: result.tookMs,
        },
      });
      return;
    }

    post({
      type: "ERROR",
      payload: {
        requestType: payload.type,
        message: "Unsupported request type",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Worker encountered an unexpected error";

    post({
      type: "ERROR",
      payload: {
        requestType: (event.data && event.data.type) || "SEARCH",
        message,
      },
    });
  }
};
