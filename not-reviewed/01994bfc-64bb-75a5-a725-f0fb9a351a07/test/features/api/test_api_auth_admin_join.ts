import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdmin";

export async function test_api_auth_admin_join(connection: api.IConnection) {
  const output: ICommunityAiAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<ICommunityAiAdmin.ICreate>(),
    });
  typia.assert(output);
}
