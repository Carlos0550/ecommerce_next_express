declare module "file-type" {
  export interface FileTypeResult {
    ext: string;
    mime: string;
  }
  export interface FileTypeOptions {
    sampleSize?: number;
  }
  export function fileTypeFromBuffer(
    buffer: Uint8Array | ArrayBuffer,
    options?: FileTypeOptions,
  ): Promise<FileTypeResult | undefined>;
  export function fileTypeFromStream(
    stream: unknown,
    options?: FileTypeOptions,
  ): Promise<FileTypeResult | undefined>;
  export function fileTypeFromTokenizer(
    tokenizer: unknown,
    options?: FileTypeOptions,
  ): Promise<FileTypeResult | undefined>;
  export const supportedExtensions: ReadonlySet<string>;
  export const supportedMimeTypes: ReadonlySet<string>;
}
