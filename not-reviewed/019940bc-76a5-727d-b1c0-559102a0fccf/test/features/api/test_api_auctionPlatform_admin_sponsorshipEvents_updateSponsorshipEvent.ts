import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformSponsorshipEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipEvent";

export async function test_api_auctionPlatform_admin_sponsorshipEvents_updateSponsorshipEvent(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformSponsorshipEvent =
    await api.functional.auctionPlatform.admin.sponsorshipEvents.updateSponsorshipEvent(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IAuctionPlatformSponsorshipEvent.IUpdate>(),
      },
    );
  typia.assert(output);
}
