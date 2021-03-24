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

@Service()
export class BDOCrawlerFull {
    
    source: string = SOURCE_TYPES.BANK;
    sourceName = 'BDO';
    bdoUrl = 'https://www.bdo.com.ph/properties-for-sale/vehicles';
    browser!: Browser;
    bdoPage!: Page;
    vehicles: Vehicle[] = [];

    // form fields selector
    TXT_SEARCH_BAR_SELECTOR = '#edit-body-value';
    BTN_FIND_SELECTOR = '#edit-submit-properties-for-sale';
    TABLE_ROW_SELECTOR = '#vehicles > div > div.panels-flexible-row.panels-flexible-row-63-main-row.clearfix.sub-widecontent > div > div > div > div > div > div > div.view-content > table > tbody > tr';

    public start = async () => {
        this.browser = await puppeteer.launch({
            headless: false
        });
        await this.getBdoPage();
    };

    public setSearch = async (search: string) => {
        await this.bdoPage.click(this.TXT_SEARCH_BAR_SELECTOR);
        await this.bdoPage.keyboard.type(search);
    };

    public execute = async () => {
        await this.bdoPage.click(this.BTN_FIND_SELECTOR);
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    await this._extractVehiclesData();
                    await this.browser.close();
                    resolve(this.vehicles);
                } catch (error) {
                    reject(error);
                }
            }, 3000);
        });
    }

    private _extractVehiclesData = async () => {
        const content = await this.bdoPage.content();
        const cherrioHtml = cheerio.load(content);

        if (_.isNull(cherrioHtml)) {
            throw new Error('Html is null.');
        }

        const rows = await cherrioHtml(this.TABLE_ROW_SELECTOR);

        rows.each((i, item) => {
            const brand = cheerio(item).find('.views-field-field-vehicle-brand').text().trim().toLowerCase();
            const model = cheerio(item).find('.views-field-field-generic-text-1').text().trim().toLowerCase();
            const year = cheerio(item).find('.views-field-field-year').text().trim().toLowerCase();
            const mileage = cheerio(item).find('.views-field-field-mileage-str').text().trim().toLowerCase();
            const color = cheerio(item).find('.views-field-field-color').text().trim().toLowerCase();
            const plate = cheerio(item).find('.views-field-field-plate').text().trim().toLowerCase();
            const price = cheerio(item).find('.views-field-field-property-price').text().trim().toLowerCase();
            const location = cheerio(item).find('.views-field-field-vehicle-location').text().trim().toLowerCase();
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
                sourceName: this.sourceName
            });
            this.vehicles.push(newVehicle);
        });
    };

    private getBdoPage = async () => {
        this.bdoPage = await this.browser.newPage();
        await this.bdoPage.goto(this.bdoUrl, {
            waitUntil: 'networkidle2'
        });
    };

}