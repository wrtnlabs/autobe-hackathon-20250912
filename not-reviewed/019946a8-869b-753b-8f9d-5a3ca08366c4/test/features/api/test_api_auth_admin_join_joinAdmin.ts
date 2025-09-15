import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordAdmin";

export async function test_api_auth_admin_join_joinAdmin(
  connection: api.IConnection,
) {
  const output: ITravelRecordAdmin.IAuthorized =
    await api.functional.auth.admin.join.joinAdmin(connection, {
      body: typia.random<ITravelRecordAdmin.ICreate>(),
    });
  typia.assert(output);
}
