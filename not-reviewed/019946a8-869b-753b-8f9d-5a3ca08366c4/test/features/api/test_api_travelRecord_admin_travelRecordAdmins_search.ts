import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordTravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordTravelRecordAdmin";
import { ITravelRecordTravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordTravelRecordAdmin";

export async function test_api_travelRecord_admin_travelRecordAdmins_search(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordTravelRecordAdmin.ISummary =
    await api.functional.travelRecord.admin.travelRecordAdmins.search(
      connection,
      {
        body: typia.random<ITravelRecordTravelRecordAdmin.IRequest>(),
      },
    );
  typia.assert(output);
}
