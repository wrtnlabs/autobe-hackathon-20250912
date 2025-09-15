import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionCandidate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionCandidate";

export async function test_api_auctionPlatform_admin_auctionCandidates_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionCandidate =
    await api.functional.auctionPlatform.admin.auctionCandidates.update(
      connection,
      {
        auctionCandidateId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformAuctionCandidate.IUpdate>(),
      },
    );
  typia.assert(output);
}
