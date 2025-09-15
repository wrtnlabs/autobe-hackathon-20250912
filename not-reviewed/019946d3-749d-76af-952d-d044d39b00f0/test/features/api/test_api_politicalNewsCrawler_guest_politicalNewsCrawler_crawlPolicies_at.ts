import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawlPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawlPolicy";

export async function test_api_politicalNewsCrawler_guest_politicalNewsCrawler_crawlPolicies_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawlPolicy =
    await api.functional.politicalNewsCrawler.guest.politicalNewsCrawler.crawlPolicies.at(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
