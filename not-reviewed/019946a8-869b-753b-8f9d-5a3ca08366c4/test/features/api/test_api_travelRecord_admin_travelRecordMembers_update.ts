import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_travelRecord_admin_travelRecordMembers_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordMember =
    await api.functional.travelRecord.admin.travelRecordMembers.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ITravelRecordMember.IUpdate>(),
      },
    );
  typia.assert(output);
}
