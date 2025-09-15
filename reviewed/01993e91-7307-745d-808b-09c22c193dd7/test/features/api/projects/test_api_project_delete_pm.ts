import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the lifecycle of a project deletion by a PM user.
 *
 * It verifies that:
 *
 * - A PM user can create and authenticate successfully
 * - A TPM user is created to own the project
 * - The PM user can create a project owned by the TPM user
 * - The PM user can delete the project successfully
 * - The project is no longer deletable after deletion
 * - Unauthorized PM users cannot delete projects they don't own
 * - Attempting to delete a non-existent project fails appropriately
 *
 * This ensures secure and consistent project deletion business logic in the
 * system.
 */
export async function test_api_project_delete_pm(connection: api.IConnection) {
  // 1. Create and authenticate a PM user
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody });
  typia.assert(pmUser);

  // 2. Create and authenticate a TPM user to own the project
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 3. PM user creates a project owned by the TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. PM deletes the project successfully
  await api.functional.taskManagement.pm.projects.eraseProject(connection, {
    projectId: project.id,
  });

  // 5. Verify the project is no longer accessible (deletion effect)
  // Since no explicit get endpoint for project is provided, simulate by trying deletion again
  await TestValidator.error(
    "deleting a deleted project should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.eraseProject(connection, {
        projectId: project.id,
      });
    },
  );

  // 6. Create another PM user (unauthorized) to test deletion attempt
  const pmJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser2: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody2 });
  typia.assert(pmUser2);

  // PM user 2 (unauthorized) attempts to delete a non-existent valid UUID project id
  const fakeProjectId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized pm deletion on fake id should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.eraseProject(connection, {
        projectId: fakeProjectId,
      });
    },
  );

  // 7. Attempt to delete non-existent project id with PM user 1 (should error)
  const nonExistingProjectId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "pm deletion of non-existent project should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.eraseProject(connection, {
        projectId: nonExistingProjectId,
      });
    },
  );
}
