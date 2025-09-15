import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_specialtyCoffeeLog_member_cafes_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.specialtyCoffeeLog.member.cafes.erase(
    connection,
    {
      cafeId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
