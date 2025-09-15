import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerApiAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerApiAccessLog";
import { IPoliticalNewsCrawlerApiAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiAccessLog";

export async function test_api_politicalNewsCrawler_api_accessLogs_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerApiAccessLog.ISummary =
    await api.functional.politicalNewsCrawler.api.accessLogs.index(connection, {
      body: typia.random<IPoliticalNewsCrawlerApiAccessLog.IRequest>(),
    });
  typia.assert(output);
}
