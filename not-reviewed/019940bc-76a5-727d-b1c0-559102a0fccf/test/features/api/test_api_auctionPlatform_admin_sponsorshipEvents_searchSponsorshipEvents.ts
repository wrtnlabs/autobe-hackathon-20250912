import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformSponsorshipEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformSponsorshipEvent";
import { IAuctionPlatformSponsorshipEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformSponsorshipEvent";

export async function test_api_auctionPlatform_admin_sponsorshipEvents_searchSponsorshipEvents(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformSponsorshipEvent.ISummary =
    await api.functional.auctionPlatform.admin.sponsorshipEvents.searchSponsorshipEvents(
      connection,
      {
        body: typia.random<IAuctionPlatformSponsorshipEvent.IRequest>(),
      },
    );
  typia.assert(output);
}
