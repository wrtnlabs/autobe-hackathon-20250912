import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerProcessedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessedContent";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_processedContent_updateProcessedContent(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessedContent =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.processedContent.updateProcessedContent(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        processedContentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerProcessedContent.IUpdate>(),
      },
    );
  typia.assert(output);
}
