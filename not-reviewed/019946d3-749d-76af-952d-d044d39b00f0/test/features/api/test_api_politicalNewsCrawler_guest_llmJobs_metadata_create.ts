import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPoliticalNewsCrawlerProcessingMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadata";
import { IPoliticalNewsCrawlerProcessingMetadataICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalNewsCrawlerProcessingMetadataICreate";

export async function test_api_politicalNewsCrawler_guest_llmJobs_metadata_create(
  connection: api.IConnection,
) {
  const output: IPoliticalNewsCrawlerProcessingMetadata =
    await api.functional.politicalNewsCrawler.guest.llmJobs.metadata.create(
      connection,
      {
        llmJobId: typia.random<string>(),
        body: typia.random<IPoliticalNewsCrawlerProcessingMetadataICreate>(),
      },
    );
  typia.assert(output);
}
