import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIPoliticalNewsCrawlerProcessedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalNewsCrawlerProcessedContent";
import { IPoliticalNewsCrawlerProcessedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessedContent";

export async function test_api_politicalNewsCrawler_rawDataStorage_processedContent_searchProcessedContent(
  connection: api.IConnection,
) {
  const output: IPageIPoliticalNewsCrawlerProcessedContent.ISummary =
    await api.functional.politicalNewsCrawler.rawDataStorage.processedContent.searchProcessedContent(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerProcessedContent.IRequest>(),
      },
    );
  typia.assert(output);
}
