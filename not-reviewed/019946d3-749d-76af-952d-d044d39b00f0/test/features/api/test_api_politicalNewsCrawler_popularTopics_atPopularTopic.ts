import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerPopularTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularTopics";

export async function test_api_politicalNewsCrawler_popularTopics_atPopularTopic(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerPopularTopics =
    await api.functional.politicalNewsCrawler.popularTopics.atPopularTopic(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
