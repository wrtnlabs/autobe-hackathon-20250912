import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";

/**
 * Test the admin login process with valid credentials including both successful
 * and failure scenarios.
 *
 * Business context: Admin accounts are identified by an internal sender ID and
 * a mutable nickname. Successful login must issue JWT tokens containing access
 * and refresh tokens with expiration timestamps. The system must properly
 * reject invalid login attempts to protect admin resources.
 *
 * This test covers:
 *
 * 1. Admin account creation (join) with random but valid internal_sender_id and
 *    nickname.
 * 2. Admin login with the correct credentials and validation of the returned
 *    authorized admin payload.
 * 3. Validation of the JWT token fields for correctness of token string and valid
 *    ISO date formats.
 * 4. Negative test verifying that login with invalid credentials fails with an
 *    error.
 */
export async function test_api_admin_login_successful_authentication(
  connection: api.IConnection,
) {
  // 1. Create admin account using join
  const internalSenderId = RandomGenerator.alphaNumeric(20);
  const nickname = RandomGenerator.name(2);
  const createBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotAdmin.ICreate;

  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "admin token access is non-empty string",
    typeof adminAuthorized.token.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin token refresh is non-empty string",
    typeof adminAuthorized.token.refresh === "string" &&
      adminAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin token expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      adminAuthorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "admin token refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      adminAuthorized.token.refreshable_until,
    ),
  );

  TestValidator.equals(
    "admin internal_sender_id matches input",
    adminAuthorized.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "admin nickname matches input",
    adminAuthorized.nickname,
    nickname,
  );

  // 2. Login with correct credentials
  const loginBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotAdmin.ILogin;

  const loginAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  TestValidator.equals(
    "login id matches join id",
    loginAuthorized.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "login internal_sender_id matches",
    loginAuthorized.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "login nickname matches",
    loginAuthorized.nickname,
    nickname,
  );

  TestValidator.predicate(
    "login token access non-empty string",
    typeof loginAuthorized.token.access === "string" &&
      loginAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh non-empty string",
    typeof loginAuthorized.token.refresh === "string" &&
      loginAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expired_at ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      loginAuthorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "login token refreshable_until ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(
      loginAuthorized.token.refreshable_until,
    ),
  );

  // 3. Negative test: login with invalid credentials should error
  await TestValidator.error(
    "login with invalid internal_sender_id should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          internal_sender_id: "invalid_id",
          nickname: "invalid_nick",
        } satisfies IChatbotAdmin.ILogin,
      });
    },
  );
}
