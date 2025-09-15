import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlSources } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSources";

export async function test_api_politicalNewsCrawler_politicalNewsCrawler_crawlSources_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSources =
    await api.functional.politicalNewsCrawler.politicalNewsCrawler.crawlSources.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawlSources.IUpdate>(),
      },
    );
  typia.assert(output);
}
