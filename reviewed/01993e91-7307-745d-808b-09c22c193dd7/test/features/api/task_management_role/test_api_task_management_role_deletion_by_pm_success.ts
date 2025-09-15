import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validates that a Project Manager (PM) user can delete a
 * TaskManagementRole.
 *
 * This test follows the workflow:
 *
 * 1. Create and login a PM user.
 * 2. Create a TPM user and login to establish multi-role context.
 * 3. Create a TaskManagementRole to be deleted.
 * 4. Delete the TaskManagementRole by its unique ID as the PM user.
 * 5. Confirm deletion by checking the deleted role is no longer retrievable.
 *
 * Ensures authorization is handled properly through role switching.
 * Validates the permanence of deletion via absence of the role
 * post-deletion.
 */
export async function test_api_task_management_role_deletion_by_pm_success(
  connection: api.IConnection,
) {
  // 1. Create and login PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pm = await api.functional.auth.pm.join(connection, {
    body: {
      email: pmEmail,
      password: "StrongPass!123",
      name: RandomGenerator.name(),
    } satisfies ITaskManagementPm.ICreate,
  });
  typia.assert(pm);

  // 2. Create and login TPM user for multi-role context
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpm = await api.functional.auth.tpm.join(connection, {
    body: {
      email: tpmEmail,
      password: "StrongPass!123",
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(tpm);

  // 3. As TPM user (currently authenticated), create a TaskManagementRole
  const roleCreateBody = {
    code: RandomGenerator.alphabets(3).toUpperCase(),
    name: RandomGenerator.name(),
    description: `Role ${RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 })}`,
  } satisfies ITaskManagementTaskManagementRoles.ICreate;
  const role =
    await api.functional.taskManagement.tpm.taskManagementRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(role);

  // 4. Switch authentication to PM user
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: "StrongPass!123",
    } satisfies ITaskManagementPm.ILogin,
  });

  // 5. Delete the created TaskManagementRole by ID as PM
  await api.functional.taskManagement.pm.taskManagementRoles.erase(connection, {
    id: role.id,
  });

  // 6. Attempt to delete again to confirm role is permanently deleted
  await TestValidator.error(
    "deleted role cannot be deleted again",
    async () => {
      await api.functional.taskManagement.pm.taskManagementRoles.erase(
        connection,
        { id: role.id },
      );
    },
  );
}
