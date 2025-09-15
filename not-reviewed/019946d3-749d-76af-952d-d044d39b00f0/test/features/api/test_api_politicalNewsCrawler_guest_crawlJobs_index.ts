import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerCrawlJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlJobs";
import { IPoliticalNewsCrawlerCrawlJobsIRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlJobsIRequest";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlJobs =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.index(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlJobsIRequest>(),
      },
    );
  typia.assert(output);
}
