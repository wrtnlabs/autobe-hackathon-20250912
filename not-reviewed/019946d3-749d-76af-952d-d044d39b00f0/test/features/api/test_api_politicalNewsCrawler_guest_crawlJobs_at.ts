import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlJobs";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlJobs =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
