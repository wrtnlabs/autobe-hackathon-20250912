import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformSponsorshipAnimation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipAnimation";

export async function test_api_auctionPlatform_admin_sponsorshipAnimations_update(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformSponsorshipAnimation =
    await api.functional.auctionPlatform.admin.sponsorshipAnimations.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformSponsorshipAnimation.IUpdate>(),
      },
    );
  typia.assert(output);
}
