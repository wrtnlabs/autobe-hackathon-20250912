import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates updating a task management priority by a TPM user.
 *
 * Steps:
 *
 * 1. Create and authenticate as TPM user via /auth/tpm/join
 * 2. Create a task priority to obtain a valid priority ID
 * 3. Update the created priority using PUT with modified code, name, description
 * 4. Validate the returned priority's fields are updated correctly with unchanged
 *    ID
 * 5. Test failure cases including invalid ID, unauthorized access, and invalid
 *    update payload
 */
export async function test_api_task_management_priority_update_tpm(
  connection: api.IConnection,
) {
  // 1. TPM User creation and authentication
  const joinBody = {
    email: `tpm_user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass!234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(tpmUser);

  // 2. Create a task priority to get valid ID
  const priorityCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(5)}`,
    name: `Priority ${RandomGenerator.alphaNumeric(4)}`,
    description: "Initial priority description",
  } satisfies ITaskManagementPriority.ICreate;

  const createdPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityCreateBody,
      },
    );
  typia.assert(createdPriority);

  // 3. Update the created priority
  const updateBody = {
    code: `updated_code_${RandomGenerator.alphaNumeric(5)}`,
    name: `Updated Priority ${RandomGenerator.alphaNumeric(4)}`,
    description: "Updated priority description",
  } satisfies ITaskManagementPriority.IUpdate;

  const updatedPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.update(
      connection,
      {
        id: createdPriority.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPriority);

  // Validate id integrity
  TestValidator.equals(
    "updated priority id remains the same",
    updatedPriority.id,
    createdPriority.id,
  );
  // Validate fields changed
  TestValidator.notEquals(
    "priority code is updated",
    updatedPriority.code,
    createdPriority.code,
  );
  TestValidator.notEquals(
    "priority name is updated",
    updatedPriority.name,
    createdPriority.name,
  );
  TestValidator.notEquals(
    "priority description is updated",
    updatedPriority.description ?? null,
    createdPriority.description ?? null,
  );

  // 4. Failure case: Update using invalid ID
  await TestValidator.error(
    "update fails with non-existent priority id",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementPriorities.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // random non-existing UUID
          body: updateBody,
        },
      );
    },
  );

  // 5. Failure case: Unauthorized - unauthenticated user attempts update
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update fails", async () => {
    await api.functional.taskManagement.tpm.taskManagementPriorities.update(
      unauthConn,
      {
        id: createdPriority.id,
        body: updateBody,
      },
    );
  });

  // 6. Failure case: Invalid payload (empty update object)
  await TestValidator.error(
    "update fails with empty update payload",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementPriorities.update(
        connection,
        {
          id: createdPriority.id,
          body: {},
        },
      );
    },
  );
}
