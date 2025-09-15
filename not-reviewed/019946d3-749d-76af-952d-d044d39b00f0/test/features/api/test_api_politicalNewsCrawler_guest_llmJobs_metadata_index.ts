import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerProcessingMetadataArray } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadataArray";

export async function test_api_politicalNewsCrawler_guest_llmJobs_metadata_index(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingMetadataArray =
    await api.functional.politicalNewsCrawler.guest.llmJobs.metadata.index(
      connection,
      {
        llmJobId: typia.random<string>(),
      },
    );
  typia.assert(output);
}
