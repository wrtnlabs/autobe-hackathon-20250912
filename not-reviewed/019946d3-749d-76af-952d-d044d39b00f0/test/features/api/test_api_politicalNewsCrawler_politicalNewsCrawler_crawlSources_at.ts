import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlSources } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSources";

export async function test_api_politicalNewsCrawler_politicalNewsCrawler_crawlSources_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSources =
    await api.functional.politicalNewsCrawler.politicalNewsCrawler.crawlSources.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
