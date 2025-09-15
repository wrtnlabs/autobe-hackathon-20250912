import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerProcessedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessedContent";

export async function test_api_politicalNewsCrawler_rawDataStorage_processedContent_atProcessedContent(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessedContent =
    await api.functional.politicalNewsCrawler.rawDataStorage.processedContent.atProcessedContent(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        processedContentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
