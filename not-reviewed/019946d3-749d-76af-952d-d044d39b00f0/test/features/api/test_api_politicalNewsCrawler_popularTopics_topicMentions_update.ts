import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerTopicMentions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerTopicMentions";

export async function test_api_politicalNewsCrawler_popularTopics_topicMentions_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerTopicMentions =
    await api.functional.politicalNewsCrawler.popularTopics.topicMentions.update(
      connection,
      {
        popularTopicId: typia.random<string>(),
        id: typia.random<string>(),
        body: typia.random<IPoliticalNewsCrawlerTopicMentions.IUpdate>(),
      },
    );
  typia.assert(output);
}
