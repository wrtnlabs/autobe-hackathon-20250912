import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlAttempt";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_crawlAttempts_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlAttempt =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.crawlAttempts.at(
      connection,
      {
        crawlJobId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
