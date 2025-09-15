import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerCrawlJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlJobs";
import { IPoliticalNewsCrawlerCrawlJobsICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlJobsICreate";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlJobs =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerCrawlJobsICreate>(),
      },
    );
  typia.assert(output);
}
