import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerPopularTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerPopularTopic";

export async function test_api_politicalNewsCrawler_guest_popularTopics_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerPopularTopic =
    await api.functional.politicalNewsCrawler.guest.popularTopics.create(
      connection,
      {
        body: typia.random<IPoliticalNewsCrawlerPopularTopic.ICreate>(),
      },
    );
  typia.assert(output);
}
