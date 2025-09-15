import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";

/**
 * Validate TaskManagementPriority update by PMO.
 *
 * Business context:
 *
 * - PMO users can manage task priority levels, affecting task sorting and
 *   urgency display.
 * - Updating a priority requires proper PMO authentication.
 *
 * Process steps:
 *
 * 1. PMO user registration via /auth/pmo/join.
 * 2. Create a task priority using POST
 *    /taskManagement/pmo/taskManagementPriorities.
 * 3. Update the created priority using PUT
 *    /taskManagement/pmo/taskManagementPriorities/{id} with new code, name,
 *    and description.
 * 4. Validate the update response for correct id preservation and updated
 *    field values.
 * 5. Attempt update with invalid UUID and expect error.
 * 6. Attempt update with missing required fields in body and expect error.
 * 7. Attempt update without proper authorization (simulate by using another
 *    PMO user or unauthenticated connection) and expect authorization
 *    failure.
 *
 * This test ensures robust authorization and update logic enforcement at
 * the API level.
 */
export async function test_api_task_management_priority_update_pmo(
  connection: api.IConnection,
) {
  // 1. PMO join and authenticate
  const pmoJoinBody1 = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmouser1: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody1 });
  typia.assert(pmouser1);

  // 2. Create a task priority
  const createPriorityBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITaskManagementPriority.ICreate;

  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: createPriorityBody },
    );
  typia.assert(priority);

  // 3. Successful update with new values
  const updatePriorityBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies ITaskManagementPriority.IUpdate;

  const updatedPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.update(
      connection,
      {
        id: priority.id,
        body: updatePriorityBody,
      },
    );
  typia.assert(updatedPriority);

  TestValidator.equals(
    "task priority id should not change on update",
    updatedPriority.id,
    priority.id,
  );
  TestValidator.equals(
    "task priority code should be updated",
    updatedPriority.code,
    updatePriorityBody.code,
  );
  TestValidator.equals(
    "task priority name should be updated",
    updatedPriority.name,
    updatePriorityBody.name,
  );
  TestValidator.equals(
    "task priority description should be updated",
    updatedPriority.description ?? null,
    updatePriorityBody.description ?? null,
  );

  // 4. Negative test: update with invalid UUID
  await TestValidator.error(
    "update with invalid priority ID should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.update(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000",
          body: updatePriorityBody,
        },
      );
    },
  );

  // 5. Negative test: update with missing all fields (empty body)
  await TestValidator.error(
    "update with empty body should fail due to missing fields",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.update(
        connection,
        {
          id: priority.id,
          body: {},
        },
      );
    },
  );

  // 6. Negative test: unauthorized update attempt (by creating another PMO user and switching context)
  const pmoJoinBody2 = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmouser2: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody2 });
  typia.assert(pmouser2);

  // Attempt to update priority with pmouser2's authentication (simulate by reusing connection)
  // Because connection.headers are managed by SDK upon api call, calling join switches auth
  await TestValidator.error(
    "unauthorized user should not update task priority",
    async () => {
      await api.functional.taskManagement.pmo.taskManagementPriorities.update(
        connection,
        {
          id: priority.id,
          body: updatePriorityBody,
        },
      );
    },
  );
}
