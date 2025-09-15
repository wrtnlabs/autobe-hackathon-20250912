import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordMember";
import { ITravelRecordMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordMember";

export async function test_api_travelRecord_admin_travelRecordMembers_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordMember.ISummary =
    await api.functional.travelRecord.admin.travelRecordMembers.index(
      connection,
      {
        body: typia.random<ITravelRecordMember.IRequest>(),
      },
    );
  typia.assert(output);
}
