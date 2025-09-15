import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformSponsorshipAnimation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformSponsorshipAnimation";
import { IAuctionPlatformSponsorshipAnimation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipAnimation";

export async function test_api_auctionPlatform_admin_sponsorshipAnimations_searchSponsorshipAnimations(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformSponsorshipAnimation =
    await api.functional.auctionPlatform.admin.sponsorshipAnimations.searchSponsorshipAnimations(
      connection,
      {
        body: typia.random<IAuctionPlatformSponsorshipAnimation.IRequest>(),
      },
    );
  typia.assert(output);
}
