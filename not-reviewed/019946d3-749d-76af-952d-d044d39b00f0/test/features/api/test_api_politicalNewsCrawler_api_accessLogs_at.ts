import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerApiAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAccessLog";

export async function test_api_politicalNewsCrawler_api_accessLogs_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiAccessLog =
    await api.functional.politicalNewsCrawler.api.accessLogs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
