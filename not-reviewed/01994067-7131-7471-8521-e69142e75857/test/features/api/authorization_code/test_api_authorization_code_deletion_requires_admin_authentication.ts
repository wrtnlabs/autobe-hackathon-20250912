import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";

export async function test_api_authorization_code_deletion_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "password123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin user logs in
  const loginResult: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "password123!",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(loginResult);

  // 3. Admin deletes an authorization code
  const codeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.oauthServer.admin.authorizationCodes.erase(connection, {
    id: codeId,
  });
}
