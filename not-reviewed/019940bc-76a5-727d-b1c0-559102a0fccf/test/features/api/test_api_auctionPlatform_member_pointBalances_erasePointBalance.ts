import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_auctionPlatform_member_pointBalances_erasePointBalance(
  connection: api.IConnection,
) {
  const output =
    await api.functional.auctionPlatform.member.pointBalances.erasePointBalance(
      connection,
      {
        pointBalanceId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
