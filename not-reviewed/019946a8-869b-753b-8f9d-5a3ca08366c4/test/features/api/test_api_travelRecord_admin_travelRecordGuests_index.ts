import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordTravelRecordGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordTravelRecordGuest";
import { ITravelRecordTravelRecordGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordTravelRecordGuest";

export async function test_api_travelRecord_admin_travelRecordGuests_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordTravelRecordGuest =
    await api.functional.travelRecord.admin.travelRecordGuests.index(
      connection,
      {
        body: typia.random<ITravelRecordTravelRecordGuest.IRequest>(),
      },
    );
  typia.assert(output);
}
