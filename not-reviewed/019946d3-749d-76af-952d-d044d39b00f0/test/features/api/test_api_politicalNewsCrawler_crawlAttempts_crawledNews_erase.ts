import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_crawlAttempts_crawledNews_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.crawlAttempts.crawledNews.erase(
      connection,
      {
        crawlAttemptId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
