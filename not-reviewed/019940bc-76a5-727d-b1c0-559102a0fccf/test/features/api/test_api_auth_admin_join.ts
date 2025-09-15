import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAuctionPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuctionPlatformAdmin";

export async function test_api_auth_admin_join(connection: api.IConnection) {
  const output: IAuctionPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IAuctionPlatformAdmin.ICreate>(),
    });
  typia.assert(output);
}
