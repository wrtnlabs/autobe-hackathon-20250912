import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommunityAiAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAiAdmin";

export async function test_api_auth_admin_refresh(connection: api.IConnection) {
  const output: ICommunityAiAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: typia.random<ICommunityAiAdmin.IRefresh>(),
    });
  typia.assert(output);
}
