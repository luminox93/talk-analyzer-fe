# Talk Analyzer

A local-only Next.js web app for searching KakaoTalk chat exports in CSV format.

## Purpose
- Load a KakaoTalk CSV with columns `Date`, `User`, `Message` in the browser.
- Parse and index messages locally without uploading raw chat content.
- Provide fast keyword search and user filtering for large exports.

## Local Run

1. Install dependencies
```bash
cd fe
npm install
```
2. Start development server
```bash
npm run dev
```
3. Open
```bash
http://localhost:3000
```
4. Build
```bash
npm run build
```
5. Optional checks
```bash
npm run lint
```

## CSV Input Format
- Required columns: `Date`, `User`, `Message`.
- UTF-8 CSV export from KakaoTalk or equivalent compatible format.
- `Message` can contain quotes and newlines when enclosed by quotes.

Example (format only, max 3 lines):
```csv
Date,User,Message
2026-01-01 12:00,alice,"hello"
2026-01-01 12:01,bob,"multi\nline"
```

## Privacy Model
- No server storage of uploaded chat data.
- No network upload/transmission of raw chat messages.
- Parsing, indexing, and search run only in the browser.

## Performance Design
- Fast search is powered by an index-driven search structure.
- CSV parse and index build run in a Web Worker.
- Large result sets render with virtualization (`@tanstack/react-virtual`) to keep UI responsive.

## Limits and Caveats
- For very large exports, first parse/indexing may briefly consume memory and CPU as expected for local preprocessing.
- In this environment, `npm run build` and server startup may fail due to OS-level process/port constraints; validate on a normal local machine.
- This project is not a storage backend and is intended for local-only analysis.
