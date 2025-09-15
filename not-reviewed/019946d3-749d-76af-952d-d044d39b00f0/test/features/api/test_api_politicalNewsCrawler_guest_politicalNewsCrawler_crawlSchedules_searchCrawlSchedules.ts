import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerCrawlSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlSchedule";
import { IPoliticalNewsCrawlerCrawlSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlSchedule";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlSchedules_searchCrawlSchedules(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlSchedule.ISummary =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlSchedules.searchCrawlSchedules(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlSchedule.IRequest>(),
      },
    );
  typia.assert(output);
}
