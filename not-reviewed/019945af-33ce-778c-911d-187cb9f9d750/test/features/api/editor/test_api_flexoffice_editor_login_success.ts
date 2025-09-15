import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Validate successful login of an Editor user after registration.
 *
 * This test implements the complete positive login flow and essential
 * negative cases:
 *
 * Steps:
 *
 * 1. Register new editor user via POST /auth/editor/join with realistic name,
 *    unique email, and password.
 * 2. Assert the registration response includes valid UUID id and authorization
 *    tokens with proper access and refresh tokens and expiration ISO date
 *    strings.
 * 3. Login using the same email and password via POST /auth/editor/login.
 * 4. Assert the login response issues authorization tokens similarly.
 * 5. Attempt login with invalid email, expect 401 unauthorized error.
 * 6. Attempt login with valid email but wrong password, expect 401
 *    unauthorized error.
 *
 * Each step uses typia.assert to validate API responses and TestValidator
 * for expected error behaviors. This scenario explicitly avoids invalid
 * type testing or direct header manipulation, strictly adhering to schema
 * compliance.
 */
export async function test_api_flexoffice_editor_login_success(
  connection: api.IConnection,
) {
  // 1. Create editor user via join API
  const fakeName = RandomGenerator.name();
  const fakeEmail = typia.random<string & tags.Format<"email">>();
  const fakePassword = RandomGenerator.alphaNumeric(12);
  const createBody = {
    name: fakeName,
    email: fakeEmail,
    password: fakePassword,
  } satisfies IFlexOfficeEditor.ICreate;

  const joinResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: createBody,
    });
  typia.assert(joinResponse);

  // Validate join response contents
  TestValidator.predicate(
    "joinResponse.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  TestValidator.predicate(
    "joinResponse.token.access is defined",
    typeof joinResponse.token.access === "string" &&
      joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "joinResponse.token.refresh is defined",
    typeof joinResponse.token.refresh === "string" &&
      joinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joinResponse.token.expired_at is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
      joinResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "joinResponse.token.refreshable_until is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
      joinResponse.token.refreshable_until,
    ),
  );

  // 2. Login with created editor credentials
  const loginBody = {
    email: fakeEmail,
    password: fakePassword,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Validate login response contents
  TestValidator.predicate(
    "loginResponse.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
  TestValidator.predicate(
    "loginResponse.token.access is defined",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "loginResponse.token.refresh is defined",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "loginResponse.token.expired_at is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
      loginResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "loginResponse.token.refreshable_until is ISO date string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
      loginResponse.token.refreshable_until,
    ),
  );

  // 3. Test login with invalid email
  const invalidEmailLoginBody = {
    email: typia.random<string & tags.Format<"email">>(), // random email not the joined one
    password: fakePassword,
  } satisfies IFlexOfficeEditor.ILogin;

  await TestValidator.error(
    "login should fail with invalid email",
    async () => {
      await api.functional.auth.editor.login(connection, {
        body: invalidEmailLoginBody,
      });
    },
  );

  // 4. Test login with valid email but wrong password
  const wrongPasswordLoginBody = {
    email: fakeEmail,
    password: RandomGenerator.alphaNumeric(12), // random password different from the original
  } satisfies IFlexOfficeEditor.ILogin;

  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.editor.login(connection, {
        body: wrongPasswordLoginBody,
      });
    },
  );
}
