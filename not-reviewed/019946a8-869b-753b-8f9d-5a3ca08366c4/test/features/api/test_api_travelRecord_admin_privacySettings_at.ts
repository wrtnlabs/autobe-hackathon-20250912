import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITravelRecordPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordPrivacySettings";

export async function test_api_travelRecord_admin_privacySettings_at(
  connection: api.IConnection,
) {
  const output: ITravelRecordPrivacySettings =
    await api.functional.travelRecord.admin.privacySettings.at(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
