declare module "csv-parser" {
  import { Transform } from "stream";

  interface CsvParserOptions {
    separator?: string;
    newline?: string;
    strict?: boolean;
    mapHeaders?: (header: string) => string;
    mapValues?: (value: string, header: string) => any;
    skipLines?: number;
    headers?: string[] | boolean;
    quote?: string;
    escape?: string;
    trim?: boolean;
    skipEmptyLines?: boolean;
  }

  function csvParser(options?: CsvParserOptions): Transform;
  namespace csvParser {}
  export = csvParser;
}
