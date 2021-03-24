import 'reflect-metadata';
import Container from 'typedi';
import { BDOCrawlerFull } from './modules/BDO/BDOCrawlerFull';

export const BdoCrawler = Container.get(BDOCrawlerFull);
