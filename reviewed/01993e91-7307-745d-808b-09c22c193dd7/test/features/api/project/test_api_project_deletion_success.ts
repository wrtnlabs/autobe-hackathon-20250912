import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test scenario validates the full lifecycle of deleting a project by
 * a PM user. It ensures that PM users can authenticate, create TPM users as
 * project owners, create projects, and delete them securely.
 *
 * Steps include PM user registration, TPM user registration, project
 * creation, project deletion operation, and validation of expected
 * behaviors. This enforces all business rules around authorization and
 * project management.
 */
export async function test_api_project_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: PM user joins and obtains authorization
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmJoinBody,
    });
  typia.assert(pmUser);

  // Step 2: TPM user joins and obtains authorization
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherPass#456",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // Step 3: Create a project owned by the TPM user
  const projectCreateBody = {
    owner_id: typia.assert<string & tags.Format<"uuid">>(tpmUser.id),
    code: `PRJ-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals(
    "project owner_id matches TPM user id",
    project.owner_id,
    tpmUser.id,
  );

  // Step 4: Delete the created project using PM user authorization
  await api.functional.taskManagement.pm.projects.eraseProject(connection, {
    projectId: typia.assert<string & tags.Format<"uuid">>(project.id),
  });

  // Step 5: Confirm deletion success by expecting no error on eraseProject call
  // No response to validate as eraseProject returns void
}
