import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Test the Project Manager user registration via POST /auth/pm/join
 * endpoint.
 *
 * This test covers:
 *
 * 1. Successful registration with valid email, password, and name.
 * 2. Verification of returned ITaskManagementPm.IAuthorized including JWT
 *    token info.
 * 3. Handling of duplicate email registration attempts.
 * 4. Validation errors for incorrect email format.
 * 5. Validation errors for invalid password (too short).
 */
export async function test_api_project_manager_join_success(
  connection: api.IConnection,
) {
  // Step 1: Register PM user successfully
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12);
  const validName = RandomGenerator.name();

  const createBody = {
    email: validEmail,
    password: validPassword,
    name: validName,
  } satisfies ITaskManagementPm.ICreate;

  const authorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: createBody });
  typia.assert(authorized);

  TestValidator.equals("PM user email matches", authorized.email, validEmail);
  TestValidator.equals("PM user name matches", authorized.name, validName);
  TestValidator.predicate(
    "PM user has access token",
    Boolean(authorized.token.access) &&
      typeof authorized.token.access === "string",
  );
  TestValidator.predicate(
    "PM user has refresh token",
    Boolean(authorized.token.refresh) &&
      typeof authorized.token.refresh === "string",
  );

  // Step 2: Duplicate email should fail
  const duplicateBody = {
    email: validEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  await TestValidator.error("Duplicate email registration fails", async () => {
    await api.functional.auth.pm.join(connection, { body: duplicateBody });
  });

  // Step 3: Invalid email format
  const invalidEmailBody = {
    email: "invalid-email-format",
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  await TestValidator.error(
    "Invalid email format registration fails",
    async () => {
      await api.functional.auth.pm.join(connection, { body: invalidEmailBody });
    },
  );

  // Step 4: Invalid password (too short)
  const invalidPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "short",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  await TestValidator.error("Invalid password registration fails", async () => {
    await api.functional.auth.pm.join(connection, {
      body: invalidPasswordBody,
    });
  });
}
