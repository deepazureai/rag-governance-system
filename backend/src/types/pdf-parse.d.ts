declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
    text: string;
  }

  interface ParseOptions {
    pagerender?: (pageData: any) => Promise<string>;
    password?: string;
    max?: number;
    cMapUrl?: string;
    cMapPacked?: boolean;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: ParseOptions
  ): Promise<PDFData>;

  export = pdfParse;
}
