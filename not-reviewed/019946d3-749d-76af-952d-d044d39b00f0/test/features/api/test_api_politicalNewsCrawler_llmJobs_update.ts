import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerLlmJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobs";

export async function test_api_politicalNewsCrawler_llmJobs_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLlmJobs =
    await api.functional.politicalNewsCrawler.llmJobs.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IPoliticalNewsCrawlerLlmJobs.IUpdate>(),
    });
  typia.assert(output);
}
