import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformSponsorshipAnimation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipAnimation";

export async function test_api_auctionPlatform_admin_sponsorshipAnimations_create(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformSponsorshipAnimation =
    await api.functional.auctionPlatform.admin.sponsorshipAnimations.create(
      connection,
      {
        body: typia.random<IAuctionPlatformSponsorshipAnimation.ICreate>(),
      },
    );
  typia.assert(output);
}
