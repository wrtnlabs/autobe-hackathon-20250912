import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPoliticalNewsCrawlerProcessingMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadata";

export async function test_api_politicalNewsCrawler_guest_llmJobs_metadata_updateMetadata(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingMetadata =
    await api.functional.politicalNewsCrawler.guest.llmJobs.metadata.updateMetadata(
      connection,
      {
        llmJobId: typia.random<string & tags.Format<"uuid">>(),
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IPoliticalNewsCrawlerProcessingMetadata.IUpdate>(),
      },
    );
  typia.assert(output);
}
