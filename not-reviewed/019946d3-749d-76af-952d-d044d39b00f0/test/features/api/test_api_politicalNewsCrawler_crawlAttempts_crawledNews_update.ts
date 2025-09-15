import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerCrawledNews } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerCrawledNews";

export async function test_api_politicalNewsCrawler_crawlAttempts_crawledNews_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerCrawledNews =
    await api.functional.politicalNewsCrawler.crawlAttempts.crawledNews.update(
      connection,
      {
        crawlAttemptId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerCrawledNews.IUpdate>(),
      },
    );
  typia.assert(output);
}
