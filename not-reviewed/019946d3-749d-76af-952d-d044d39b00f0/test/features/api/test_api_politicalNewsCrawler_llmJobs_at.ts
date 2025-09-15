import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerLlmJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobs";

export async function test_api_politicalNewsCrawler_llmJobs_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLlmJobs =
    await api.functional.politicalNewsCrawler.llmJobs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
