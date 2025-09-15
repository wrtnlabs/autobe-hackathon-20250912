import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system administrator login via external_admin_id and business
 * email.
 *
 * This test ensures that a system admin can log in with valid credentials,
 * and covers various edge cases. The workflow is as follows:
 *
 * 1. Register a new system admin using unique external_admin_id and email.
 * 2. Attempt to log in with the same credentials and expect a valid JWT
 *    (IAuthorized) response.
 * 3. Validate the token/session structure and returned claims.
 * 4. Attempt login with unregistered credentials and confirm error.
 * 5. Soft-delete (deactivate) the admin in the test and confirm login is
 *    rejected (simulate by registering, then modifying deleted_at
 *    field—skipped if there's no API support, else only business logic
 *    validation).
 * 6. Attempt to re-register with duplicate credentials (same
 *    external_admin_id/email) and confirm error.
 */
export async function test_api_system_admin_login_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const joinInput = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphabets(6)}@admin-login.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const registered: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(registered);
  TestValidator.equals(
    "registration should reflect input external_admin_id",
    registered.external_admin_id,
    joinInput.external_admin_id,
  );
  TestValidator.equals(
    "registered actor_type should be systemAdmin",
    registered.actor_type,
    "systemAdmin",
  );
  TestValidator.equals(
    "registered email matches join email",
    registered.email,
    joinInput.email,
  );

  // 2. Login with correct credentials
  const loginInput = {
    external_admin_id: joinInput.external_admin_id,
    email: joinInput.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loggedIn: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginInput,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login response id is same as registration",
    loggedIn.id,
    registered.id,
  );
  TestValidator.equals(
    "login response actor_type should be systemAdmin",
    loggedIn.actor_type,
    "systemAdmin",
  );
  TestValidator.equals(
    "login response email matches registered email",
    loggedIn.email,
    joinInput.email,
  );
  TestValidator.equals(
    "login response external_admin_id matches registered",
    loggedIn.external_admin_id,
    joinInput.external_admin_id,
  );
  TestValidator.predicate(
    "login response should have JWT token info",
    typeof loggedIn.token.access === "string" &&
      typeof loggedIn.token.refresh === "string" &&
      typeof loggedIn.token.expired_at === "string" &&
      typeof loggedIn.token.refreshable_until === "string",
  );

  // 3. Attempt login with unregistered external_admin_id/email
  await TestValidator.error(
    "login with incorrect credentials should fail",
    async () => {
      await api.functional.auth.systemAdmin.login(connection, {
        body: {
          external_admin_id: RandomGenerator.alphaNumeric(14),
          email: `${RandomGenerator.alphabets(8)}@notreg.com`,
        } satisfies IStoryfieldAiSystemAdmin.ILogin,
      });
    },
  );

  // 4. Attempt to re-register with existing credentials (should fail)
  await TestValidator.error(
    "re-registering with same external_admin_id and email should fail",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: joinInput,
      });
    },
  );

  // 5. (If there is support to 'soft-delete' admin, simulate login failure after deactivation, else skip as unavailable)
  // Since there is no delete endpoint in provided API, skip soft-delete scenario here.
}
