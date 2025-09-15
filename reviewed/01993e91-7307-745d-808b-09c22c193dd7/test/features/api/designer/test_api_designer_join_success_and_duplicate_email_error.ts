import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Validates the registration flow for a new Designer user.
 *
 * Steps:
 *
 * 1. Register a Designer user with valid email, hashed password, and name.
 *
 *    - Asserts successful creation and correct response structure.
 * 2. Attempt to register another Designer user with the same email to check
 *    duplicate email prevention.
 *
 *    - Asserts an error indicating duplicate email constraint.
 */
export async function test_api_designer_join_success_and_duplicate_email_error(
  connection: api.IConnection,
) {
  // 1. Register first Designer user with valid data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // Simulate a realistic hash
  const name: string = RandomGenerator.name();

  const createBody1 = {
    email,
    password_hash: passwordHash,
    name,
  } satisfies ITaskManagementDesigner.ICreate;

  const authorizedUser: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: createBody1,
    });
  typia.assert(authorizedUser);

  // Validate response fields
  TestValidator.predicate(
    "valid UUID format for id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
  TestValidator.equals("email matches", authorizedUser.email, email);
  TestValidator.equals("name matches", authorizedUser.name, name);

  // 2. Attempt duplicate registration with the same email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.auth.designer.join(connection, {
      body: {
        email,
        password_hash: RandomGenerator.alphaNumeric(64),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  });
}
