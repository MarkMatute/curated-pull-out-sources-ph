import 'reflect-metadata';
import Container from 'typedi';
import { BDOCrawlerFull } from './modules/BDO/BDOCrawler';

export const BdoCrawler = Container.get(BDOCrawlerFull);
