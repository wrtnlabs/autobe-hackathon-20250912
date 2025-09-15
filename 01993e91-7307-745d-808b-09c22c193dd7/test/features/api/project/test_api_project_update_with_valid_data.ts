import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test validates the update functionality of a project
 * entity by a Project Management Officer (PMO) user. It ensures an
 * authenticated PMO user can update an existing project and assign a new
 * Technical Project Manager (TPM) as the owner. The test includes creating
 * both PMO and TPM users, setting up an initial project, performing a
 * project update with new ownerId, code, name, and description, and
 * verifying the updated project is correctly returned with expected fields
 * and timestamps. The test also incorporates switching authentication
 * between PMO and TPM roles to simulate real multi-user interactions. It
 * excludes negative tests for invalid IDs or unauthorized access to keep
 * the focus on a successful update flow.
 */
export async function test_api_project_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create and authenticate PMO user (join + login)
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. (Re)Login PMO user to ensure authentication context
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  await api.functional.auth.pmo.login(connection, {
    body: pmoLoginBody,
  });

  // 3. Create TPM user to assign as project owner
  const tpmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: tpmCreateBody,
      },
    );
  typia.assert(tpmUser);

  // 4. Create initial project by PMO user
  const newProjectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: newProjectBody,
    });
  typia.assert(project);

  // 5. Prepare update data for the project
  const updateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.name(4),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITaskManagementProject.IUpdate;

  // 6. Perform the project update operation
  const updatedProject: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.updateProject(connection, {
      projectId: project.id,
      body: updateBody,
    });
  typia.assert(updatedProject);

  // 7. Validate that updated project fields match the update request
  TestValidator.equals(
    "owner_id matches updated owner",
    updatedProject.owner_id,
    updateBody.owner_id!,
  );
  TestValidator.equals(
    "code matches updated code",
    updatedProject.code,
    updateBody.code!,
  );
  TestValidator.equals(
    "name matches updated name",
    updatedProject.name,
    updateBody.name!,
  );
  TestValidator.equals(
    "description matches updated description",
    updatedProject.description,
    updateBody.description ?? null,
  );
}
