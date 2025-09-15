import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Sign up and authenticate a TPM user for authorization
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(authorizedUser);

  // Step 2: Create a TPM user to own the project
  const tpmUserCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32), // assuming password hashed already
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      { body: tpmUserCreateBody },
    );
  typia.assert(tpmUser);

  // Step 3: Create a project linked to the TPM user owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(),
    description: null, // optional nullable
  } satisfies ITaskManagementProject.ICreate;

  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);

  // Step 4: Delete the project using its projectId
  await api.functional.taskManagement.tpm.projects.eraseProject(connection, {
    projectId: createdProject.id,
  });

  // Step 5: (Optional) Verify deletion by attempting GET or list - API not provided so skipped
  // Note: Negative tests for invalid tokens or non-existent projects not implemented due to lack of API access
}
