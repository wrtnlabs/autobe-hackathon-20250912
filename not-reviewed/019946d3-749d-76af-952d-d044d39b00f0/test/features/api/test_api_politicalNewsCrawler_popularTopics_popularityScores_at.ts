import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerPopularityScores } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularityScores";

export async function test_api_politicalNewsCrawler_popularTopics_popularityScores_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerPopularityScores =
    await api.functional.politicalNewsCrawler.popularTopics.popularityScores.at(
      connection,
      {
        popularTopicId: typia.random<string>(),
        id: typia.random<string>(),
      },
    );
  typia.assert(output);
}
