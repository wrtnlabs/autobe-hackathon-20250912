import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerCrawlSources } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSources";

export async function test_api_politicalNewsCrawler_politicalNewsCrawler_crawlSources_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSources =
    await api.functional.politicalNewsCrawler.politicalNewsCrawler.crawlSources.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlSources.ICreate>(),
      },
    );
  typia.assert(output);
}
