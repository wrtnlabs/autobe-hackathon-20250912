import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerTopicMentions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerTopicMentions";

export async function test_api_politicalNewsCrawler_popularTopics_topicMentions_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerTopicMentions =
    await api.functional.politicalNewsCrawler.popularTopics.topicMentions.at(
      connection,
      {
        popularTopicId: typia.random<string>(),
        id: typia.random<string>(),
      },
    );
  typia.assert(output);
}
