import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_member_iconPurchases_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.auctionPlatform.member.iconPurchases.erase(
      connection,
      {
        iconPurchaseId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
