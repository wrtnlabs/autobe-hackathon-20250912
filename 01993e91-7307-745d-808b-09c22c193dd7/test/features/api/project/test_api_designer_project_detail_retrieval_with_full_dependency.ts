import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates the full flow of project data retrieval for a
 * Designer user.
 *
 * The sequence includes:
 *
 * 1. Designer user registration via /auth/designer/join to create a designer
 *    user.
 * 2. TPM user registration via /auth/tpm/join as project owner.
 * 3. TPM user login to authenticate as TPM role.
 * 4. TPM user creates a new project with required properties.
 * 5. Designer user login to authenticate as Designer role.
 * 6. Designer requests project detail retrieval using GET
 *    /taskManagement/designer/projects/{projectId}.
 * 7. Validates that project details match creation data and ownership.
 * 8. Validates unauthorized access scenarios and invalid project ID error
 *    responses.
 *
 * This comprehensive scenario tests authentication, role switching, project
 * creation, authorization, and detailed data retrieval with full type
 * safety.
 */
export async function test_api_designer_project_detail_retrieval_with_full_dependency(
  connection: api.IConnection,
) {
  // 1. Designer user registration
  const designerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@designer.test.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementDesigner.ICreate;
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerJoinBody,
    });
  typia.assert(designer);

  // 2. TPM user registration
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@tpm.test.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpm);

  // 3. TPM user login
  const tpmLoginBody = {
    email: tpm.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmLogin);

  // 4. TPM user creates a project
  const projectCreateBody = {
    owner_id: tpmLogin.id,
    code: `PRJ-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Designer user login
  const designerLoginBody = {
    email: designer.email,
    password: designerJoinBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;
  const designerLogin: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLogin);

  // 6. Designer requests project detail
  const projectDetail: ITaskManagementProject =
    await api.functional.taskManagement.designer.projects.at(connection, {
      projectId: project.id,
    });
  typia.assert(projectDetail);

  // 7. Validate project details
  TestValidator.equals("project id matches", projectDetail.id, project.id);
  TestValidator.equals(
    "project owner id matches",
    projectDetail.owner_id,
    tpmLogin.id,
  );
  TestValidator.equals(
    "project code matches",
    projectDetail.code,
    projectCreateBody.code,
  );
  TestValidator.equals(
    "project name matches",
    projectDetail.name,
    projectCreateBody.name,
  );
  TestValidator.equals(
    "project description matches",
    projectDetail.description ?? null,
    projectCreateBody.description ?? null,
  );

  // 8. Test unauthorized access: attempt to get project detail without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.taskManagement.designer.projects.at(
        unauthenticatedConnection,
        { projectId: project.id },
      );
    },
  );

  // 9. Test invalid project ID (malformed UUID)
  const invalidProjectId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "access with invalid projectId should fail",
    async () => {
      await api.functional.taskManagement.designer.projects.at(connection, {
        projectId: invalidProjectId,
      });
    },
  );
}
