import { BdoCrawler } from '../index';
(async () => {
    await BdoCrawler.start();
    await BdoCrawler.setSearch('toyota');
    const results = await BdoCrawler.execute();
    console.table(results);
})();