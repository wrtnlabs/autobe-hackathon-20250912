import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformAuctionCandidate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionCandidate";

export async function test_api_auctionPlatform_member_auctionCandidates_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformAuctionCandidate =
    await api.functional.auctionPlatform.member.auctionCandidates.create(
      connection,
      {
        body: typia.random<IAuctionPlatformAuctionCandidate.ICreate>(),
      },
    );
  typia.assert(output);
}
