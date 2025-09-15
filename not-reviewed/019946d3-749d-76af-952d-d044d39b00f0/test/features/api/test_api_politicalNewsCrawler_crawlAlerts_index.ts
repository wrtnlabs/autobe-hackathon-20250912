import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerCrawlAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlAlert";
import { IPoliticalNewsCrawlerCrawlAlertRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlAlertRequest";

export async function test_api_politicalNewsCrawler_crawlAlerts_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlAlert =
    await api.functional.politicalNewsCrawler.crawlAlerts.index(connection, {
      body: typia.random<IPoliticalNewsCrawlerCrawlAlertRequest>(),
    });
  typia.assert(output);
}
