import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerPopularityScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerPopularityScore";
import { IPoliticalNewsCrawlerPopularityScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularityScore";

export async function test_api_politicalNewsCrawler_guest_popularTopics_popularityScores_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerPopularityScore.ISummary =
    await api.functional.politicalNewsCrawler.guest.popularTopics.popularityScores.index(
      connection,
      {
        popularTopicId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerPopularityScore.IRequest>(),
      },
    );
  typia.assert(output);
}
