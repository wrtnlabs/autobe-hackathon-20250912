import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerCrawlAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerCrawlAttempt";
import { IPoliticalNewsCrawlerCrawlAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlAttempt";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_crawlAttempts_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerCrawlAttempt.ISummary =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.crawlAttempts.index(
      connection,
      {
        crawlJobId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawlAttempt.IRequest>(),
      },
    );
  typia.assert(output);
}
