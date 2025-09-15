import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerCrawlSources } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlSources";
import { IPoliticalNewsCrawlerCrawlSources } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSources";

export async function test_api_politicalNewsCrawler_politicalNewsCrawler_crawlSources_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlSources.ISummary =
    await api.functional.politicalNewsCrawler.politicalNewsCrawler.crawlSources.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlSources.IRequest>(),
      },
    );
  typia.assert(output);
}
