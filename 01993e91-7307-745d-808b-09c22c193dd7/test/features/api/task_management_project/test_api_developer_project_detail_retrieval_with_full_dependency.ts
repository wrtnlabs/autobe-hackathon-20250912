import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/*
 * This end-to-end test validates the detailed project retrieval scenario for Developer role.
 * It comprises multi-actor workflow involving Developer and TPM user roles with authentication flows.
 * The test covers positive paths for project creation and access permissions,
 * as well as negative tests for error handling of unauthorized or invalid project accesses.
 *
 * The sequential steps are:
 * 1) Developer user registration and authentication.
 * 2) TPM user (owner) registration and authentication.
 * 3) TPM user creates a valid project.
 * 4) Developer user reloads authentication.
 * 5) Developer fetches project details.
 * 6) Verify project data consistency.
 * 7) Test error case for unauthorized access.
 */
export async function test_api_developer_project_detail_retrieval_with_full_dependency(
  connection: api.IConnection,
) {
  // 1. Developer user registration and authentication
  const developerEmail = RandomGenerator.alphaNumeric(8) + "@email.com";
  const developerPlainPassword = RandomGenerator.alphaNumeric(12);
  const developerJoinBody = {
    email: developerEmail,
    password_hash: developerPlainPassword,
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developerAuthorized: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developerAuthorized);

  // 2. TPM user registration and authentication
  const tpmEmail = RandomGenerator.alphaNumeric(8) + "@email.com";
  const tpmPlainPassword = RandomGenerator.alphaNumeric(12);
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPlainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmAuthorized);

  // 3. TPM user login to get authorization context
  const tpmLoginBody = {
    email: tpmEmail,
    password: tpmPlainPassword,
  } satisfies ITaskManagementTpm.ILogin;
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });

  // 4. TPM user creates a new project
  const projectCreateBody = {
    owner_id: tpmAuthorized.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);
  TestValidator.equals(
    "Project owner ID matches",
    createdProject.owner_id,
    projectCreateBody.owner_id,
  );
  TestValidator.equals(
    "Project code matches",
    createdProject.code,
    projectCreateBody.code,
  );
  TestValidator.equals(
    "Project name matches",
    createdProject.name,
    projectCreateBody.name,
  );
  TestValidator.equals(
    "Project description matches",
    createdProject.description ?? null,
    projectCreateBody.description ?? null,
  );

  // 5. Developer user login again (refresh authentication)
  const developerLoginBody = {
    email: developerEmail,
    password: developerPlainPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });

  // 6. Developer user fetches project details
  const projectDetail: ITaskManagementProject =
    await api.functional.taskManagement.developer.projects.at(connection, {
      projectId: createdProject.id,
    });
  typia.assert(projectDetail);

  TestValidator.equals(
    "Fetched project ID matches",
    projectDetail.id,
    createdProject.id,
  );
  TestValidator.equals(
    "Fetched project owner ID matches",
    projectDetail.owner_id,
    createdProject.owner_id,
  );
  TestValidator.equals(
    "Fetched project code matches",
    projectDetail.code,
    createdProject.code,
  );
  TestValidator.equals(
    "Fetched project name matches",
    projectDetail.name,
    createdProject.name,
  );
  TestValidator.equals(
    "Fetched project description matches",
    projectDetail.description ?? null,
    createdProject.description ?? null,
  );

  // 7. Error scenario: attempt to fetch project detail without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should fail without authentication", async () => {
    await api.functional.taskManagement.developer.projects.at(unauthConn, {
      projectId: createdProject.id,
    });
  });
}
