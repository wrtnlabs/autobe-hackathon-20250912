import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_member_members_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.auctionPlatform.member.members.erase(
    connection,
    {
      memberId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
