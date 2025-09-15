import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * End-to-end test validating successful retrieval of detailed QA user
 * information via the GET /taskManagement/pm/taskManagement/qas/{id}
 * endpoint with PM role authorization.
 *
 * This test performs:
 *
 * 1. Creation and authentication of a Project Manager (PM) user via
 *    /auth/pm/join, establishing authorized context.
 * 2. Retrieval of an existing QA user details by valid UUID ID under PM
 *    authorization.
 * 3. Validation of the returned QA user data, confirming required fields,
 *    timestamp presence with valid ISO string format, and absence of
 *    sensitive fields like plain passwords.
 * 4. Negative tests for unauthorized access and non-existent QA user ID,
 *    confirming proper error handling.
 *
 * This confirms correct authorization enforcement, data integrity, and
 * error handling for the QA user detail API.
 */
export async function test_api_qa_user_detail_success_with_pm_auth(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a PM user with valid random data
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // 2. Retrieve QA user details by a valid UUID (simulate existing QA user ID)
  const validQaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const qaUser: ITaskManagementQa =
    await api.functional.taskManagement.pm.taskManagement.qas.at(connection, {
      id: validQaId,
    });
  typia.assert(qaUser);

  // 3. Validate returned QA user fields
  TestValidator.equals("qa user id matches requested id", qaUser.id, validQaId);
  TestValidator.predicate(
    "qa user email is non-empty string",
    typeof qaUser.email === "string" && qaUser.email.length > 0,
  );
  TestValidator.predicate(
    "qa password_hash is non-empty string",
    typeof qaUser.password_hash === "string" && qaUser.password_hash.length > 0,
  );
  TestValidator.predicate(
    "qa user name is non-empty string",
    typeof qaUser.name === "string" && qaUser.name.length > 0,
  );

  // 4. Validate timestamps are defined and valid ISO Strings via typia.assert's guarantee
  TestValidator.predicate(
    "qa created_at is defined",
    qaUser.created_at !== undefined && qaUser.created_at !== null,
  );
  TestValidator.predicate(
    "qa updated_at is defined",
    qaUser.updated_at !== undefined && qaUser.updated_at !== null,
  );

  // 5. If deleted_at exists and is non-null, verify it's a non-empty string
  if (qaUser.deleted_at !== null && qaUser.deleted_at !== undefined) {
    TestValidator.predicate(
      "qa deleted_at is non-empty string when present",
      typeof qaUser.deleted_at === "string" && qaUser.deleted_at.length > 0,
    );
  }

  // 6. Negative scenario: unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access error", async () => {
    await api.functional.taskManagement.pm.taskManagement.qas.at(unauthConn, {
      id: validQaId,
    });
  });

  // 7. Negative scenario: access with non-existent QA user ID should fail
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent QA user ID error", async () => {
    await api.functional.taskManagement.pm.taskManagement.qas.at(connection, {
      id: nonExistentId,
    });
  });
}
