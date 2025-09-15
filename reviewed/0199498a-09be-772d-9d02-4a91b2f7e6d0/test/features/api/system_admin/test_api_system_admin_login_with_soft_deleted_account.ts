import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Verify that logging in with a soft-deleted (deactivated) system admin account
 * is denied and no session is issued.
 *
 * 1. Register a new system admin (using external_admin_id and email).
 * 2. Log in as this system admin with correct credentials.
 * 3. Soft delete (deactivate) the admin account using the returned admin UUID.
 * 4. Attempt to log in again with the same credentials.
 * 5. Check that login after deletion is denied, with clear error response and no
 *    token issued.
 *
 * This confirms the platform’s enforcement of system admin account deactivation
 * for authentication and session logic.
 */
export async function test_api_system_admin_login_with_soft_deleted_account(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const joinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: RandomGenerator.name(1) + "@company.com",
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const createdAdmin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(createdAdmin);

  // 2. Log in (should succeed)
  const loginBody = {
    external_admin_id: joinBody.external_admin_id,
    email: joinBody.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loggedIn: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login id matches created id",
    loggedIn.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login external_admin_id matches",
    loggedIn.external_admin_id,
    joinBody.external_admin_id,
  );
  TestValidator.equals("login email matches", loggedIn.email, joinBody.email);
  TestValidator.equals(
    "actor_type matches",
    loggedIn.actor_type,
    "systemAdmin",
  );
  TestValidator.predicate(
    "token.access present",
    typeof loggedIn.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh present",
    typeof loggedIn.token.refresh === "string",
  );

  // 3. Soft delete (deactivate) the admin
  await api.functional.storyfieldAi.systemAdmin.systemAdmins.erase(connection, {
    systemAdminId: createdAdmin.id,
  });

  // 4. Attempt to log in again (should be denied)
  await TestValidator.error(
    "cannot log in with soft deleted (deactivated) admin account",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: loginBody,
      });
    },
  );
}
