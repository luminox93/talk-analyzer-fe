import Papa from "papaparse";
import { KakaoMessage, ParsedRow } from "../indexer/types";

const HEADER_ALIASES: Record<string, string[]> = {
  Date: ["Date", "date", "날짜"],
  User: ["User", "user", "보낸사람", "sender", "작성자"],
  Message: ["Message", "message", "내용", "본문", "msg"],
};

const normalize = (value: unknown): string => (value ?? "").toString().trim();
const normalizeUser = (value: unknown): string =>
  normalize(value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

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

const isTextMessage = (text: string): boolean => text.length > 0;

interface ParsedTxtMessage {
  date: string;
  user: string;
  message: string;
}

const TXT_LINE_PATTERNS: RegExp[] = [
  /^\[(?<date>[^\]]+)\]\s*(?<rest>.+)$/,
  /^(?<date>\d{4}[./-]\d{1,2}[./-]\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?),\s*(?<rest>.+)$/i,
  /^(?<date>\d{4}[./-]\d{1,2}[./-]\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?)(?:\s*-)\s*(?<rest>.+)$/i,
  /^(?<date>\d{4}\.\s*\d{1,2}\.\s*\d{1,2}[^,]*?(?:오전|오후)\s*\d{1,2}:\d{2}(?::\d{2})?),(?<rest>.+)$/i,
];

const splitSpeakerAndMessage = (line: string): ParsedTxtMessage | null => {
  for (const pattern of TXT_LINE_PATTERNS) {
    const match = pattern.exec(line);
    if (!match?.groups) {
      continue;
    }

    const date = normalize(match.groups.date);
    const rest = normalize(match.groups.rest);

    const colonMatch = rest.match(/^(?<user>.+?)\s*:\s*(?<message>.*)$/);
    if (colonMatch?.groups) {
      const user = normalizeUser(colonMatch.groups.user);
      const message = normalize(colonMatch.groups.message);

      if (!user) {
        continue;
      }

      return { date, user, message };
    }

    const dashMatch = rest.match(/^(?<user>.+?)\s*-\s*(?<message>.*)$/);
    if (dashMatch?.groups) {
      const user = normalizeUser(dashMatch.groups.user);
      const message = normalize(dashMatch.groups.message);

      if (!user) {
        continue;
      }

      return { date, user, message };
    }

    const commaMatch = rest.match(/^(?<user>.+?)\s*,\s*(?<message>.*)$/);
    if (!commaMatch?.groups) {
      continue;
    }

    const user = normalizeUser(commaMatch.groups.user);
    const message = normalize(commaMatch.groups.message);

    if (!user) {
      continue;
    }

    return { date, user, message };
  }

  return null;
};

const parseKakaoTxtFile = async (file: File): Promise<KakaoMessage[]> => {
  const text = await file.text();
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  const rows: ParsedTxtMessage[] = [];
  let currentMessage: ParsedTxtMessage | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = splitSpeakerAndMessage(trimmed);
    if (parsed) {
      if (currentMessage) {
        rows.push(currentMessage);
      }
      currentMessage = parsed;
      continue;
    }

    if (currentMessage) {
      currentMessage.message = `${currentMessage.message}\n${trimmed}`;
    }
  }

  if (currentMessage) {
    rows.push(currentMessage);
  }

  return rows
    .filter((message) => isTextMessage(message.message))
    .map((message, index) => ({
      id: index,
      date: message.date,
      user: message.user,
      message: message.message,
    }));
};

const parseKakaoCsvFile = (file: File): Promise<KakaoMessage[]> => {
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

          if (!isTextMessage(message)) {
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

const isTextChatFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  return file.type === "text/plain" || fileName.endsWith(".txt") || fileName.endsWith(".csv");
};

export const parseKakaoFile = async (file: File): Promise<KakaoMessage[]> => {
  const isTxt = file.name.toLowerCase().endsWith(".txt");

  if (isTxt) {
    return parseKakaoTxtFile(file);
  }

  const parsedFromCsv = await parseKakaoCsvFile(file);

  if (parsedFromCsv.length > 0 || !isTextChatFile(file)) {
    return parsedFromCsv;
  }

  const parsedFromTxt = await parseKakaoTxtFile(file);
  if (parsedFromTxt.length > 0) {
    return parsedFromTxt;
  }

  return parsedFromCsv;
};

export { parseKakaoCsvFile };
