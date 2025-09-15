import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_travelRecord_admin_travelRecordMembers_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.travelRecord.admin.travelRecordMembers.erase(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
