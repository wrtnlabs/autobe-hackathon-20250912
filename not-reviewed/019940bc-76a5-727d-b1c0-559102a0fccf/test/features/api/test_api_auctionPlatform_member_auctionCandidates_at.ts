import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformAuctionCandidate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionCandidate";

export async function test_api_auctionPlatform_member_auctionCandidates_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionCandidate =
    await api.functional.auctionPlatform.member.auctionCandidates.at(
      connection,
      {
        auctionCandidateId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
