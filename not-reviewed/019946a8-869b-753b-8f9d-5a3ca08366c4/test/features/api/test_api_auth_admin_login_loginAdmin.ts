import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITravelRecordAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITravelRecordAdmin";

export async function test_api_auth_admin_login_loginAdmin(
  connection: api.IConnection,
) {
  const output: ITravelRecordAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdmin(connection, {
      body: typia.random<ITravelRecordAdmin.ILogin>(),
    });
  typia.assert(output);
}
