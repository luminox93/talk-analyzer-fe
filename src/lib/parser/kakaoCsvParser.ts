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

    const hasSeparator = [":", " - ", ","].some((separator) => rest.includes(separator));
    if (!hasSeparator) {
      continue;
    }

    const indexCandidates = [":", " - ", ","]
      .map((separator) => ({
        index: rest.indexOf(separator),
        separator,
      }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    if (indexCandidates.length === 0) {
      continue;
    }

    const { index, separator } = indexCandidates[0];
    const user = normalize(rest.slice(0, index));
    const message = normalize(rest.slice(index + separator.length));

    if (!user || message.length === 0) {
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
