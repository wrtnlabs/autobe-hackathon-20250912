import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformSponsorshipEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipEvent";

export async function test_api_auctionPlatform_admin_sponsorshipEvents_createSponsorshipEvent(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformSponsorshipEvent =
    await api.functional.auctionPlatform.admin.sponsorshipEvents.createSponsorshipEvent(
      connection,
      {
        body: typia.random<IAuctionPlatformSponsorshipEvent.ICreate>(),
      },
    );
  typia.assert(output);
}
