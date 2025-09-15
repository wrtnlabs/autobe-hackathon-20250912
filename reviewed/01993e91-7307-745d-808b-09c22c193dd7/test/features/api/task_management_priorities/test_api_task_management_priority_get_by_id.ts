import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriorities";

/**
 * This test case validates the retrieval of detailed task management
 * priority information by its UUID identifier for PMO users.
 *
 * It performs the following steps:
 *
 * 1. PMO User joins (registers) with valid credentials.
 * 2. PMO User logs in and obtains authentication tokens.
 * 3. Using the authenticated connection, requests detailed task priority by a
 *    valid UUID.
 * 4. Asserts that the response strictly matches the ITaskManagementPriorities
 *    schema.
 * 5. Requests the endpoint with a randomly generated nonexistent UUID and
 *    expects an error.
 * 6. Attempts unauthorized access without authentication and verifies the
 *    appropriate failure.
 * 7. Tests invalid UUID format cases and validates error handling.
 *
 * All assertions use typia.assert for type safety and TestValidator
 * functions to check expected results.
 */
export async function test_api_task_management_priority_get_by_id(
  connection: api.IConnection,
) {
  // 1. PMO User joins (registers)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecretPwd123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoAuthorized = await api.functional.auth.pmo.join(connection, {
    body: joinBody,
  });
  typia.assert(pmoAuthorized);

  // 2. PMO User logs in
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoLogin = await api.functional.auth.pmo.login(connection, {
    body: loginBody,
  });
  typia.assert(pmoLogin);

  // 3. Request with valid UUID (random for test; may not correspond to real data)
  const validPriorityId = typia.random<string & tags.Format<"uuid">>();

  const validPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.at(
      connection,
      {
        id: validPriorityId,
      },
    );
  typia.assert(validPriority);

  TestValidator.predicate(
    "priority id format is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      validPriority.id,
    ),
  );

  // Basic business logic validation on the priority properties
  TestValidator.predicate(
    "priority code is non-empty string",
    typeof validPriority.code === "string" && validPriority.code.length > 0,
  );
  TestValidator.predicate(
    "priority name is non-empty string",
    typeof validPriority.name === "string" && validPriority.name.length > 0,
  );

  // 4. Request with a nonexistent UUID => expect error
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "nonexistent priority id should throw",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.at(
        connection,
        {
          id: nonexistentId,
        },
      );
    },
  );

  // 5. Attempt unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.taskManagement.pmo.taskManagementPriorities.at(
      unauthenticatedConnection,
      { id: validPriorityId },
    );
  });

  // 6. Invalid UUID format cases
  const invalidUuidValues = [
    "not-a-uuid",
    "123",
    "",
    "00000000-0000-0000-0000-0000000000000", // one extra character
  ];

  for (const invalidId of invalidUuidValues) {
    await TestValidator.error(
      `invalid UUID format '${invalidId}' should throw`,
      async () => {
        await api.functional.taskManagement.pmo.taskManagementPriorities.at(
          connection,
          {
            id: invalidId as string & tags.Format<"uuid">,
          },
        );
      },
    );
  }
}
