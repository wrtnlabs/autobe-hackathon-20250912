import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlJob";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlJob =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawlJob.IUpdate>(),
      },
    );
  typia.assert(output);
}
