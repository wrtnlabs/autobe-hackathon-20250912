import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordTravelRecordGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordTravelRecordGuest";

export async function test_api_travelRecord_admin_travelRecordGuests_at(
  connection: api.IConnection,
) {
  const output: ITravelRecordTravelRecordGuest =
    await api.functional.travelRecord.admin.travelRecordGuests.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
