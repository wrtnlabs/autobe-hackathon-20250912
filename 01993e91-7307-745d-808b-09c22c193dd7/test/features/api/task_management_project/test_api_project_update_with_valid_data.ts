import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the complete workflow of updating a project entity
 * for a project management system, ensuring correct authorization, resource
 * setup, and data integrity. The test includes:
 *
 * 1. Register a PM user and authenticate (join and login operation).
 * 2. Register a TPM user and authenticate (join and login operation).
 * 3. Create an initial project with the PM user as owner.
 * 4. Update the project to assign the TPM user as new owner and change code, name,
 *    description.
 * 5. Validate the response for correctness, including data and timestamps.
 *
 * This flow ensures business rules on ownership, authorization, and data
 * integrity are enforced.
 */
export async function test_api_project_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PM user
  const pmUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "PmSecurePass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmUserCreateBody });
  typia.assert(pmUser);

  const pmUserLoginBody = {
    email: pmUserCreateBody.email,
    password: pmUserCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmUserLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmUserLoginBody });
  typia.assert(pmUserLogin);

  // 2. Register and authenticate TPM user
  const tpmUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TpmSecurePass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmUserCreateBody });
  typia.assert(tpmUser);

  const tpmUserLoginBody = {
    email: tpmUserCreateBody.email,
    password: tpmUserCreateBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmUserLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmUserLoginBody });
  typia.assert(tpmUserLogin);

  // Switch back to PM for project creation and update
  await api.functional.auth.pm.login(connection, {
    body: pmUserLoginBody,
  });

  // 3. Create an initial project with PM user as owner
  const projectCreateBody = {
    owner_id: pmUser.id,
    code: `PRJ${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: `Initial Project ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Update the project with new owner (TPM user), updated code, name, description
  const updatedProjectCode = `UPD${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const updatedProjectName = `Updated Project ${RandomGenerator.name(2)}`;
  const updatedProjectDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const updateBody = {
    owner_id: tpmUser.id,
    code: updatedProjectCode,
    name: updatedProjectName,
    description: updatedProjectDescription,
  } satisfies ITaskManagementProject.IUpdate;

  const updatedProject: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.updateProject(connection, {
      projectId: project.id,
      body: updateBody,
    });
  typia.assert(updatedProject);

  // 5. Verify update response: owner_id, code, name, description
  TestValidator.equals(
    "project owner_id updated correctly",
    updatedProject.owner_id,
    tpmUser.id,
  );

  TestValidator.equals(
    "project code updated correctly",
    updatedProject.code,
    updatedProjectCode,
  );

  TestValidator.equals(
    "project name updated correctly",
    updatedProject.name,
    updatedProjectName,
  );

  TestValidator.equals(
    "project description updated correctly",
    updatedProject.description,
    updatedProjectDescription,
  );

  // 6. Validate created_at remains unchanged after update
  TestValidator.equals(
    "project created_at remains unchanged",
    updatedProject.created_at,
    project.created_at,
  );

  // 7. Validate updated_at is updated & newer than created_at
  TestValidator.predicate(
    "project updated_at is newer than created_at",
    new Date(updatedProject.updated_at).getTime() >
      new Date(updatedProject.created_at).getTime(),
  );
}
