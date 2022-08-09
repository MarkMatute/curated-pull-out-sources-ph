import { Service } from 'typedi';
import _ from 'lodash';
import axios from 'axios';
import cheerio from 'cheerio';
import { ICrawler } from './CrawlerDtos';

@Service()
export class Crawler implements ICrawler {

    public url: string;

    constructor(url: string) {
        this.url = url;
    }
    source = '';
    sourceName = '';

    public start = async (): Promise<any> => {
        console.log('Start...');
        return this;
    }

    public getHtml = async (url: string): Promise<cheerio.Root> => {
        if (!url || _.isEmpty(url)) {
            throw new Error('Url is empty.');
        }
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        return $;
    }

}
