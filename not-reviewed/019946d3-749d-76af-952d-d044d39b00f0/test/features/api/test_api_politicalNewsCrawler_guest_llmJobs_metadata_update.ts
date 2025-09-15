import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerProcessingMetadataArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadataArray";
import { IPoliticalNewsCrawlerProcessingMetadataIUpdateArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadataIUpdateArray";

export async function test_api_politicalNewsCrawler_guest_llmJobs_metadata_update(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingMetadataArray =
    await api.functional.politicalNewsCrawler.guest.llmJobs.metadata.update(
      connection,
      {
        llmJobId: typia.random<string>(),
        body: typia.random<IPoliticalNewsCrawlerProcessingMetadataIUpdateArray>(),
      },
    );
  typia.assert(output);
}
