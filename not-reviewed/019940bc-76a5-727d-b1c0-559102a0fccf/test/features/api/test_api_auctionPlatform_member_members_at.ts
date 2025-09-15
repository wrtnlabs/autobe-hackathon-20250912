import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAuctionPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformMember";

export async function test_api_auctionPlatform_member_members_at(
  connection: api.IConnection,
) {
  const output: IAuctionPlatformMember =
    await api.functional.auctionPlatform.member.members.at(connection, {
      memberId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
