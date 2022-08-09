import { BdoCrawler } from '../index';
(async () => {
    await BdoCrawler.start();
    const results = await BdoCrawler.execute();
    console.table(results);
})();
