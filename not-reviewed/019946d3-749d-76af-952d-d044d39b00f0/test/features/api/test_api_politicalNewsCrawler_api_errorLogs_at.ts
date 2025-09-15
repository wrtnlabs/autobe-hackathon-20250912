import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerApiErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiErrorLog";

export async function test_api_politicalNewsCrawler_api_errorLogs_at(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerApiErrorLog =
    await api.functional.politicalNewsCrawler.api.errorLogs.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
