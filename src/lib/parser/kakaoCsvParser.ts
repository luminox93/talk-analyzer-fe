import Papa from "papaparse";
import { KakaoMessage, ParsedRow } from "../indexer/types";

const HEADER_ALIASES: Record<string, string[]> = {
  Date: ["Date", "date", "날짜"],
  User: ["User", "user", "보낸사람", "sender", "작성자"],
  Message: ["Message", "message", "내용", "본문", "msg"],
};

const normalize = (value: unknown): string => (value ?? "").toString().trim();

const pickValue = (row: ParsedRow, keys: string[]): string => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = normalize(row[key]);
      if (value.length > 0) {
        return value;
      }
    }
  }
  return "";
};

const isQuotedMultilineCompatible = (text: string): boolean => text.length > 0;

export const parseKakaoCsvFile = (file: File): Promise<KakaoMessage[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      delimiter: ",",
      complete: (results: {
        errors?: Array<{ type: string; message: string }>;
        data: ParsedRow[];
      }) => {
        if (results.errors?.length) {
          const hasCriticalErrors = results.errors.some(
            (error) => error.type === "Delimiter" || error.type === "Quotes",
          );
          if (hasCriticalErrors) {
            reject(new Error(results.errors.map((error) => error.message).join(", ")));
            return;
          }
        }

        const parsed = (results.data as ParsedRow[]).flatMap((row, index) => {
          const date = pickValue(row, HEADER_ALIASES.Date);
          const user = pickValue(row, HEADER_ALIASES.User);
          const message = pickValue(row, HEADER_ALIASES.Message);

          if (!isQuotedMultilineCompatible(message)) {
            return [];
          }

          return [
            {
              id: index,
              date,
              user,
              message,
            },
          ];
        });

        resolve(parsed);
      },
      error: (error: unknown) => {
        reject(error);
      },
    });
  });
};
