import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_politicalNewsCrawler_guest_crawlJobs_crawlAttempts_eraseCrawlAttempt(
  connection: api.IConnection,
) {
  const output =
    await api.functional.politicalNewsCrawler.guest.crawlJobs.crawlAttempts.eraseCrawlAttempt(
      connection,
      {
        crawlJobId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
