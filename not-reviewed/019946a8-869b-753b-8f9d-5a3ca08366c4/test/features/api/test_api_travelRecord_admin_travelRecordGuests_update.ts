import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordTravelRecordGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordTravelRecordGuest";

export async function test_api_travelRecord_admin_travelRecordGuests_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordTravelRecordGuest =
    await api.functional.travelRecord.admin.travelRecordGuests.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ITravelRecordTravelRecordGuest.IUpdate>(),
      },
    );
  typia.assert(output);
}
