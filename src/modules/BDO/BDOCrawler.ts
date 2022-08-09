/**
 * Puppeteer will request the page
 * Initial Function is only listing with pagination
 * Keyword
 * Year
 * Brand
 * Model
 * Price Range
 * View
 * Sorting
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio from 'cheerio';
import { Service } from 'typedi';
import { Vehicle } from '../../models/Vehicle';
import { plainToClass } from 'class-transformer';
import { SOURCE_TYPES } from '../../shared/constants/constants';
import _ from 'lodash';
import { BDO_CONFIG } from './BDOConfig';
import axios from 'axios';
import fs from 'fs';
import appRootPath from 'app-root-path';
import { v4 as uuidV4 } from 'uuid';
import * as json2csv from 'json2csv';

@Service()
export class BDOCrawlerFull {

    source: string = SOURCE_TYPES.BANK;
    sourceName = BDO_CONFIG.SOURCE;
    bdoUrl = BDO_CONFIG.CRAWL_URL;
    browser!: Browser;
    bdoPage!: Page;
    vehicles: Vehicle[] = [];

    // form fields selector
    TABLE_ROW_SELECTOR = '#vehicles > div > div.panels-flexible-row.panels-flexible-row-63-main-row.clearfix.sub-widecontent > div > div > div > div > div > div > div.view-content > table > tbody > tr';

    public start = async () => {
        this.browser = await puppeteer.launch({
            headless: false // Open Chromium
        });
        await this.getBdoPage();
    };

    public execute = async () => {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                const content = await this.bdoPage.content();
                const cherrioHtml = cheerio.load(content);
                try {
                    // navigate first page
                    await this._extractVehiclesData();

                    // loop all pages
                    let hasNextPage = await this._goToNextPage(cherrioHtml);
                    while (hasNextPage) {
                        await this._extractVehiclesData();
                        hasNextPage = await this._goToNextPage(cherrioHtml);
                    }

                    await this.bdoPage.close();
                    await this.getVehiclePhotos();
                    await this.generateCsv();
                    resolve(this.vehicles);
                } catch (error) {
                    reject(error);
                }
            }, 3000);
        });
    }

    private async _goToNextPage(cherrioHtml: cheerio.Root): Promise<boolean> {
        const pagerNext = cherrioHtml('.page-next').find('a');
        return await new Promise((resolve, reject) => {
            (async () => {
                if (!pagerNext) {
                    resolve(false);
                }
                if (pagerNext) {
                    try {
                        await this.bdoPage.click('#custom-pager > div.item-list > ul > li.pager-next');
                        await this.bdoPage.waitForResponse((response: any) => {
                            return response.url().indexOf('/views/ajax') > -1;
                        });
                        resolve(true);
                    } catch (error) {
                        resolve(false);
                    }
                }
            })();
        });
    }

    private _extractVehiclesData = async () => {
        const content = await this.bdoPage.content();
        const cherrioHtml = cheerio.load(content);

        if (_.isNull(cherrioHtml)) {
            throw new Error('Html is null.');
        }

        const rows = await cherrioHtml(this.TABLE_ROW_SELECTOR);

        for (const item of rows) {
            const brand = cheerio(item).find('.views-field-field-vehicle-brand').text().trim().toLowerCase();
            const model = cheerio(item).find('.views-field-field-generic-text-1').text().trim().toLowerCase();
            const year = cheerio(item).find('.views-field-field-year').text().trim().toLowerCase();
            const mileage = cheerio(item).find('.views-field-field-mileage-str').text().trim().toLowerCase();
            const color = cheerio(item).find('.views-field-field-color').text().trim().toLowerCase();
            const plate = cheerio(item).find('.views-field-field-plate').text().trim().toLowerCase();
            const price = cheerio(item).find('.views-field-field-property-price').text().trim().toLowerCase();
            const location = cheerio(item).find('.views-field-field-vehicle-location').text().trim().toLowerCase();
            const lightboxUrl = cheerio(item).find('.views-field-field-photos').find('a').attr('href');
            const newVehicle = plainToClass(Vehicle, {
                brand,
                model,
                year,
                mileage,
                color,
                plate,
                price,
                location,
                source: this.source,
                sourceName: this.sourceName,
                lightboxUrl
            });
            this.vehicles.push(newVehicle);
        }

    };

    private getBdoPage = async () => {
        this.bdoPage = await this.browser.newPage();
        await this.bdoPage.goto(this.bdoUrl, {
            waitUntil: 'networkidle2'
        });
    };

    private async getVehiclePhotos() {
        const newVehicles = [];
        for (const vehicle of this.vehicles) {
            const lightboxPage = await this.browser.newPage();
            await lightboxPage.goto(`https://www.bdo.com.ph${vehicle.lightboxUrl}`, {
                waitUntil: 'networkidle2'
            });
            const content = await lightboxPage.content();
            const cherrioHtml = cheerio.load(content);
            const imgs = cherrioHtml('.thumbs').find('img');
            vehicle.remotePhotos = [];
            vehicle.localPhotos = [];

            for (const img of imgs) {
                const imgUrl = cheerio(img).attr('src');
                if (imgUrl) {
                    const filename = `${uuidV4()}.jpg`;
                    const localPhoto = await this.downloadImage(imgUrl, `${appRootPath}/images`, filename);
                    vehicle.remotePhotos?.push(imgUrl);
                    vehicle.localPhotos?.push(localPhoto);
                }
            }
            newVehicles.push(vehicle);
            await lightboxPage.close();
        }
        this.vehicles = newVehicles;
    }

    private async downloadImage(url: string, filepath: string, filename: string) {

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        await new Promise((resolve, reject) => {
            response.data.pipe(fs.createWriteStream(`${filepath}/${filename}`))
                .on('error', reject)
                .once('close', () => resolve(`${filepath}/${filename}`));
        });
        return filename;
    }

    private async generateCsv() {
        const csvData = await json2csv.parse(this.vehicles, {
            fields: [
                {
                    label: 'Brand',
                    value: 'brand'
                },
                {
                    label: 'Model',
                    value: 'model'
                },
                {
                    label: 'Year',
                    value: 'year'
                },
                {
                    label: 'mileage',
                    value: 'mileage'
                },
                {
                    label: 'color',
                    value: 'color'
                },
                {
                    label: 'plate',
                    value: 'plate'
                },
                {
                    label: 'price',
                    value: 'price'
                },
                {
                    label: 'location',
                    value: 'location'
                },
                {
                    label: 'localPhotos',
                    value: 'localPhotos'
                },
                {
                    label: 'remotePhotos',
                    value: 'remotePhotos'
                },
            ]
        });
        const tmpPath = `${appRootPath}/csv/BDO_VEHICLES.csv`;
        await fs.writeFileSync(tmpPath, csvData);
    }

}
