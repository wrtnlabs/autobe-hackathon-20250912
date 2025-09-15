import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerCrawlSchedules } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSchedules";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlSchedules_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSchedules =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlSchedules.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlSchedules.ICreate>(),
      },
    );
  typia.assert(output);
}
