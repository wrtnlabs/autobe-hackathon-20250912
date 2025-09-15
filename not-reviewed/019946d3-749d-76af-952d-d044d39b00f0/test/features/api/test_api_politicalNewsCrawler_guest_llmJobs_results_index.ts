import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerLlmJobResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerLlmJobResult";
import { IPoliticalNewsCrawlerLlmJobResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLlmJobResult";

export async function test_api_politicalNewsCrawler_guest_llmJobs_results_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerLlmJobResult =
    await api.functional.politicalNewsCrawler.guest.llmJobs.results.index(
      connection,
      {
        llmJobId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerLlmJobResult.IRequest>(),
      },
    );
  typia.assert(output);
}
