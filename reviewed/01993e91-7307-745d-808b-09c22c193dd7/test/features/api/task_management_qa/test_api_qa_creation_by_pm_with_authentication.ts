import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This test validates the QA user creation API secured by PM
 * authentication.
 *
 * Business Context: The QA user accounts should only be created by
 * authorized PM users. PM users first must join the system via
 * /auth/pm/join endpoint and then login via /auth/pm/login to obtain
 * authentication tokens. Only after successful authentication, PM can
 * create QA users.
 *
 * Workflow Steps:
 *
 * 1. Create a PM user with realistic data through /auth/pm/join.
 * 2. Login as the PM user through /auth/pm/login to get authentication tokens.
 * 3. Using the authenticated PM session, create a QA user by posting to
 *    /taskManagement/pm/taskManagement/qas, supplying valid and realistic
 *    QA user data (email, password_hash, and name).
 * 4. Assert that the created QA user matches the data sent (except
 *    password_hash is hashed and returned as is) and typia.assert validates
 *    the response.
 * 5. Check error scenario when trying to create a QA user with duplicate email
 *    to verify uniqueness validation triggers error.
 * 6. Verify error scenario when trying to create a QA user with invalid data
 *    (e.g., empty email or invalid email format) is rejected.
 * 7. All API calls are awaited and typia.assert confirms response types.
 * 8. No manipulation of connection.headers manually; authentication is handled
 *    by the SDK.
 *
 * The test ensures full coverage of authentication and creation workflows,
 * positive success scenarios, and realistic error handling.
 */
export async function test_api_qa_creation_by_pm_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(3),
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // Step 2: Login as PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLoginAuthorized);

  // TestValidator to ensure login returns consistent user id and email
  TestValidator.equals(
    "PM user ID consistency between join and login",
    pmLoginAuthorized.id,
    pmAuthorized.id,
  );
  TestValidator.equals(
    "PM user email consistency between join and login",
    pmLoginAuthorized.email,
    pmAuthorized.email,
  );

  // Step 3: Create QA user with valid data
  const qaCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(40),
    name: RandomGenerator.name(3),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa =
    await api.functional.taskManagement.pm.taskManagement.qas.create(
      connection,
      { body: qaCreateBody },
    );
  typia.assert(qaUser);

  // Verify created QA user matches request fields (except password_hash which should match as hash)
  TestValidator.equals(
    "QA user email matches request",
    qaUser.email,
    qaCreateBody.email,
  );
  TestValidator.equals(
    "QA user name matches request",
    qaUser.name,
    qaCreateBody.name,
  );
  TestValidator.equals(
    "QA user password_hash matches request",
    qaUser.password_hash,
    qaCreateBody.password_hash,
  );

  // Step 5: Duplicate email should cause error
  await TestValidator.error(
    "duplicate QA user email should cause error",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.create(
        connection,
        { body: qaCreateBody },
      );
    },
  );

  // Step 6: Test invalid email formats and missing required fields
  // Empty email
  const invalidEmptyEmail = {
    email: "",
    password_hash: RandomGenerator.alphaNumeric(40),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementQa.ICreate;
  await TestValidator.error(
    "QA user creation with empty email should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.create(
        connection,
        { body: invalidEmptyEmail },
      );
    },
  );

  // Invalid email format
  const invalidFormatEmail = {
    email: "invalid-email-format",
    password_hash: RandomGenerator.alphaNumeric(40),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementQa.ICreate;
  await TestValidator.error(
    "QA user creation with invalid email format should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.create(
        connection,
        { body: invalidFormatEmail },
      );
    },
  );

  // Missing name (empty string, as schema requires string)
  const invalidEmptyName = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(40),
    name: "",
  } satisfies ITaskManagementQa.ICreate;
  await TestValidator.error(
    "QA user creation with empty name should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.create(
        connection,
        { body: invalidEmptyName },
      );
    },
  );
}
