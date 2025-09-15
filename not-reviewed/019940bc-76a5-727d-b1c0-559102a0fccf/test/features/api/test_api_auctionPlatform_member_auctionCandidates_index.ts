import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformAuctionCandidates } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformAuctionCandidates";
import { IAuctionPlatformAuctionCandidates } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAuctionCandidates";

export async function test_api_auctionPlatform_member_auctionCandidates_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformAuctionCandidates.ISummary =
    await api.functional.auctionPlatform.member.auctionCandidates.index(
      connection,
      {
        body: typia.random<IAuctionPlatformAuctionCandidates.IRequest>(),
      },
    );
  typia.assert(output);
}
