import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITravelRecordPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITravelRecordPrivacySettings";
import { ITravelRecordPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPrivacySettings";

export async function test_api_travelRecord_admin_privacySettings_index(
  connection: api.IConnection,
) {
  const output: IPageITravelRecordPrivacySettings.ISummary =
    await api.functional.travelRecord.admin.privacySettings.index(connection, {
      body: typia.random<ITravelRecordPrivacySettings.IRequest>(),
    });
  typia.assert(output);
}
