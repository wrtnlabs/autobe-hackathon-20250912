import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlSchedules } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSchedules";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlSchedules_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSchedules =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlSchedules.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawlSchedules.IUpdate>(),
      },
    );
  typia.assert(output);
}
