import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_member_bids_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.auctionPlatform.member.bids.erase(
    connection,
    {
      bidId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
