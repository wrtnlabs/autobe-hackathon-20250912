import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test deletion of a task management priority entity by ID by a TPM user.
 *
 * This test validates the full lifecycle flow including:
 *
 * - TPM user registration and login
 * - Creation of task management priority
 * - Successful deletion of created priority
 * - Error on deleting previously deleted priority
 * - Error handling for invalid or missing IDs
 *
 * All API responses are validated and error cases are checked with proper
 * expectation. The test strictly follows schema requirements and business
 * logic constraints.
 */
export async function test_api_task_management_priority_deletion_tpm(
  connection: api.IConnection,
) {
  // Step 1. Register a TPM user
  const joinBody = {
    email: `user_${typia.random<string & tags.Pattern<"^[a-z0-9]{8}$">>()}@example.com`,
    password: "P@ssw0rd123",
    name: `User${RandomGenerator.name(2)}`,
  } satisfies ITaskManagementTpm.IJoin;
  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Step 2. Login as the same TPM user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // Step 3. Create a new priority record
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementPriority.ICreate;
  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      { body: createBody },
    );
  typia.assert(priority);

  // Step 4. Delete the created priority by ID
  await api.functional.taskManagement.tpm.taskManagementPriorities.erase(
    connection,
    { id: priority.id },
  );

  // Step 5. Attempt to delete the same priority again to verify deletion
  await TestValidator.error(
    "deletion of already deleted priority should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementPriorities.erase(
        connection,
        { id: priority.id },
      );
    },
  );

  // Step 6. Attempt deletion with invalid IDs to check error handling
  const invalidIds = [
    "00000000-0000-0000-0000-000000000000", // valid UUID format but probably non-existent
    "invalid-uuid-string",
    "",
  ];

  for (const id of invalidIds) {
    await TestValidator.error(
      `deletion with invalid id '${id}' should fail`,
      async () => {
        await api.functional.taskManagement.tpm.taskManagementPriorities.erase(
          connection,
          { id: id as string & tags.Format<"uuid"> },
        );
      },
    );
  }
}
