export interface ICrawler {
  url: string;
  source: string;
  sourceName: string;
  start(): Promise<this>;
  getHtml(url: string): Promise<cheerio.Root>;
}
