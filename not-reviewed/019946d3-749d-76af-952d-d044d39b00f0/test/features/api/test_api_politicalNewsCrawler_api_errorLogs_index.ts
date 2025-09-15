import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPoliticalNewsCrawlerApiErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerApiErrorLog";
import { IPoliticalNewsCrawlerApiErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerApiErrorLog";

export async function test_api_politicalNewsCrawler_api_errorLogs_index(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerApiErrorLog.ISummary =
    await api.functional.politicalNewsCrawler.api.errorLogs.index(connection, {
      body: typia.random<IPoliticalNewsCrawlerApiErrorLog.IRequest>(),
    });
  typia.assert(output);
}
