import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_system_admin_session_deletion_success(
  connection: api.IConnection,
) {
  // 1. System Admin Join
  const createPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32), // simulate hashed password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createPayload,
    });
  typia.assert(admin);

  // 2. Login as systemAdmin
  const loginPayload = {
    email: createPayload.email,
    password_hash: createPayload.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loginResult: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginPayload,
    });
  typia.assert(loginResult);

  // 3. Extract the session ID to delete (using admin.id)
  const sessionId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(admin.id);

  // 4. Delete the session
  await api.functional.enterpriseLms.systemAdmin.sessions.erase(connection, {
    id: sessionId,
  });

  // 5. Validate that deleting the same session again throws an error
  await TestValidator.error(
    "deleting non-existing session throws error",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.sessions.erase(
        connection,
        { id: sessionId },
      );
    },
  );
}
