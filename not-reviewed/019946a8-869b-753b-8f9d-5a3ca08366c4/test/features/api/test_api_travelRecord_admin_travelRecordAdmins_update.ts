import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordTravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordTravelRecordAdmin";

export async function test_api_travelRecord_admin_travelRecordAdmins_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordTravelRecordAdmin =
    await api.functional.travelRecord.admin.travelRecordAdmins.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ITravelRecordTravelRecordAdmin.IUpdate>(),
      },
    );
  typia.assert(output);
}
