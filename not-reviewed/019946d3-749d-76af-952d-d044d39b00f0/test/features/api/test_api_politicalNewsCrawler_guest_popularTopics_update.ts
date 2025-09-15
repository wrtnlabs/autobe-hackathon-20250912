import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerPopularTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularTopic";

export async function test_api_politicalNewsCrawler_guest_popularTopics_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerPopularTopic =
    await api.functional.politicalNewsCrawler.guest.popularTopics.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerPopularTopic.IUpdate>(),
      },
    );
  typia.assert(output);
}
