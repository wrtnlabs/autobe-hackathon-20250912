import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerTopicMentions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerTopicMentions";
import { IPoliticalNewsCrawlerTopicMentions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerTopicMentions";

export async function test_api_politicalNewsCrawler_popularTopics_topicMentions_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerTopicMentions.ISummary =
    await api.functional.politicalNewsCrawler.popularTopics.topicMentions.index(
      connection,
      {
        popularTopicId: typia.random<string>(),
        body: typia.random<IPoliticalNewsCrawlerTopicMentions.IRequest>(),
      },
    );
  typia.assert(output);
}
