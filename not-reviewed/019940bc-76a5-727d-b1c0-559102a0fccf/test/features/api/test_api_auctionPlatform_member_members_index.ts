import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIAuctionPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuctionPlatformMember";
import { IAuctionPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformMember";

export async function test_api_auctionPlatform_member_members_index(
  connection: api.IConnection,
) {
  const output: IPageIAuctionPlatformMember.ISummary =
    await api.functional.auctionPlatform.member.members.index(connection, {
      body: typia.random<IAuctionPlatformMember.IRequest>(),
    });
  typia.assert(output);
}
