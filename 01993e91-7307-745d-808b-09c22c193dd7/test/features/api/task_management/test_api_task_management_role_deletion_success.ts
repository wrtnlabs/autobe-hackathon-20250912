import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate deletion of a TaskManagementRole by an authorized TPM user.
 *
 * This test covers the full workflow:
 *
 * 1. Register and authenticate a TPM user.
 * 2. Create a new TaskManagementRole.
 * 3. Delete the created role.
 * 4. Confirm deletion by attempting to delete again to verify error handling.
 *
 * It asserts all API responses for type correctness and enforces business
 * logic that only authorized TPM users can perform deletion that is
 * irreversible.
 *
 * @param connection API connection instance with automatic token
 *   management.
 */
export async function test_api_task_management_role_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register TPM user
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: "P@ssw0rd123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  // 2. User is automatically authenticated (token set in headers by SDK)

  // 3. Create TaskManagementRole
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const createdRole =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      { body: roleBody },
    );
  typia.assert(createdRole);
  TestValidator.predicate(
    "created role has UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdRole.id,
    ),
  );

  // 4. Delete the created role
  await api.functional.taskManagement.tpm.taskManagementRoles.erase(
    connection,
    { id: createdRole.id },
  );

  // 5. Attempt to delete the same role again, expect an error
  await TestValidator.error(
    "deleting non-existent role throws error",
    async () => {
      await api.functional.taskManagement.tpm.taskManagementRoles.erase(
        connection,
        { id: createdRole.id },
      );
    },
  );
}
