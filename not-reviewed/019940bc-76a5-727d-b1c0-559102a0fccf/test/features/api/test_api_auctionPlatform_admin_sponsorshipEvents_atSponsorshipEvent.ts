import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformSponsorshipEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipEvent";

export async function test_api_auctionPlatform_admin_sponsorshipEvents_atSponsorshipEvent(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformSponsorshipEvent =
    await api.functional.auctionPlatform.admin.sponsorshipEvents.atSponsorshipEvent(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
