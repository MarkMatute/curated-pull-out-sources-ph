export class GetPaginationParams {
  content: any;
  cherrioHtml!: cheerio.Root;
}

export class GetPaginationResponse {
  currentPage!: number;
  lastPage!: number;
  nextPage!: number;
}
