import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_specialtyCoffeeLog_member_cafes_coffeeLogs_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.specialtyCoffeeLog.member.cafes.coffeeLogs.erase(
      connection,
      {
        cafeId: typia.random<string & tags.Format<"uuid">>(),
        coffeeLogId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
