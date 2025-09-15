import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerLocalCacheFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerLocalCacheFiles";

export async function test_api_politicalNewsCrawler_guest_rawDataStorage_localCacheFiles_updateLocalCacheFile(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerLocalCacheFiles =
    await api.functional.politicalNewsCrawler.guest.rawDataStorage.localCacheFiles.updateLocalCacheFile(
      connection,
      {
        rawDataStorageId: typia.random<string & tags.Format<"uuid">>(),
        localCacheFileId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerLocalCacheFiles.IUpdate>(),
      },
    );
  typia.assert(output);
}
