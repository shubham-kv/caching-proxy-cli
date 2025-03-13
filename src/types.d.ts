export type CacheData = {
  contentType: string;
  data: Buffer;
};

export type CacheRecord = Record<string, CacheData>;
