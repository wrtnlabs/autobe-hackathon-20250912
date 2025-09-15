import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPrivacySettings";

export async function test_api_travelRecord_admin_privacySettings_create(
  connection: api.IConnection,
) {
  const output: ITravelRecordPrivacySettings =
    await api.functional.travelRecord.admin.privacySettings.create(connection, {
      body: typia.random<ITravelRecordPrivacySettings.ICreate>(),
    });
  typia.assert(output);
}
