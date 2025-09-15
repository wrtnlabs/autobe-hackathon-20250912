import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Validates retrieval of detailed QA user information via GET
 * /taskManagement/pmo/taskManagement/qas/{id} endpoint with PMO role
 * authentication.
 *
 * This end-to-end test covers the complete workflow:
 *
 * 1. Registers a PMO user with /auth/pmo/join to get authorized context.
 * 2. Retrieves QA user details by ID via GET endpoint using PMO token.
 * 3. Validates all required QA user properties including UUID formats and
 *    timestamps.
 * 4. Ensures sensitive data like plaintext password is never exposed.
 * 5. Tests failure scenarios with unauthorized access, invalid UUIDs, and
 *    non-existent resource requests.
 *
 * The test asserts correct API behavior, proper authentication enforcement,
 * and accurate, secure data retrieval.
 */
export async function test_api_qa_user_detail_success_with_pmo_auth(
  connection: api.IConnection,
) {
  // 1. Register a new PMO user to obtain authorization
  const pmoJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinData });
  typia.assert(pmoUser);

  // 2. Retrieve QA user details by the PMO user's ID (simulate retrieving own QA user detail)
  const qaUserId = pmoUser.id;
  const qaUser: ITaskManagementQa =
    await api.functional.taskManagement.pmo.taskManagement.qas.at(connection, {
      id: qaUserId,
    });
  typia.assert(qaUser);

  // 3. Validate business logic and data presence
  TestValidator.predicate(
    "QA user password_hash is non-empty string",
    typeof qaUser.password_hash === "string" && qaUser.password_hash.length > 0,
  );
  TestValidator.predicate(
    "QA user email is string",
    typeof qaUser.email === "string",
  );
  TestValidator.predicate(
    "QA user name is string",
    typeof qaUser.name === "string",
  );

  // Validate timestamps format using typia.assert (date-time format is enforced at type level)
  typia.assert<string & tags.Format<"date-time">>(qaUser.created_at);
  typia.assert<string & tags.Format<"date-time">>(qaUser.updated_at);

  // deleted_at can be null or undefined or string datetime
  if (qaUser.deleted_at !== null && qaUser.deleted_at !== undefined) {
    typia.assert<string & tags.Format<"date-time">>(qaUser.deleted_at);
  }

  // Ensure id matches the requested id
  TestValidator.equals("QA user id matches request", qaUser.id, qaUserId);

  // Ensure email and name match the PMO user's returned info (note: PMO user has extra password_hash and token, QA user has password_hash but no token)
  TestValidator.equals(
    "QA user email matches PMO email",
    qaUser.email,
    pmoUser.email,
  );
  TestValidator.equals(
    "QA user name matches PMO name",
    qaUser.name,
    pmoUser.name,
  );

  // Ensure password_hash is different from plain password
  TestValidator.notEquals(
    "QA user password_hash is not plain password",
    qaUser.password_hash,
    pmoJoinData.password,
  );

  // 4. Unauthorized access test - create a connection without auth headers
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized access should throw error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.qas.at(
        unauthorizedConn,
        { id: qaUserId },
      );
    },
  );

  // 5. Invalid UUID format test for id
  await TestValidator.error(
    "Invalid UUID format should throw error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.qas.at(
        connection,
        { id: "invalid-uuid-format-string" },
      );
    },
  );

  // 6. Non-existent record access test
  let nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  // Ensure nonExistentUuid is distinct from qaUserId
  if (nonExistentUuid === qaUserId) {
    // Generate another UUID to ensure difference
    nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "Non-existent record access should throw error",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.qas.at(
        connection,
        { id: nonExistentUuid },
      );
    },
  );
}
