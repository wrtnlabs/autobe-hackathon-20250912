import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordAdmin";

export async function test_api_auth_admin_refresh_refreshAdmin(
  connection: api.IConnection,
) {
  const output: ITravelRecordAdmin.IAuthorized =
    await api.functional.auth.admin.refresh.refreshAdmin(connection, {
      body: typia.random<ITravelRecordAdmin.IRefresh>(),
    });
  typia.assert(output);
}
