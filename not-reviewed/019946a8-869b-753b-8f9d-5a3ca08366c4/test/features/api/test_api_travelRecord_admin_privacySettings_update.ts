import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPrivacySettings";

export async function test_api_travelRecord_admin_privacySettings_update(
  connection: api.IConnection,
) {
  const output: ITravelRecordPrivacySettings =
    await api.functional.travelRecord.admin.privacySettings.update(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITravelRecordPrivacySettings.IUpdate>(),
    });
  typia.assert(output);
}
