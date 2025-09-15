import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSchedule";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlSchedules_getCrawlSchedule(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlSchedule =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlSchedules.getCrawlSchedule(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
