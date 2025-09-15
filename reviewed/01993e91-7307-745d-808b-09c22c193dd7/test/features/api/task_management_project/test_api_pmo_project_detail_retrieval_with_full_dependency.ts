import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_pmo_project_detail_retrieval_with_full_dependency(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. TPM user registration
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 3. TPM user login to authenticate for project creation
  const tpmLoginBody = {
    email: tpmUser.email,
    password: tpmJoinBody.password, // use same plaintext password
  } satisfies ITaskManagementTpm.ILogin;

  const tpmAuth: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmAuth);

  // 4. Create new project by TPM
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. PMO user login to authenticate for project detail retrieval
  const pmoLoginBody = {
    email: pmoUser.email,
    password: pmoJoinBody.password, // same plaintext password
  } satisfies ITaskManagementPmo.ILogin;

  const pmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoAuth);

  // 6. PMO retrieves detailed project info by projectId
  const projectDetail: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.at(connection, {
      projectId: project.id,
    });
  typia.assert(projectDetail);

  // Validation of data consistency
  TestValidator.equals("project id should match", projectDetail.id, project.id);
  TestValidator.equals(
    "project owner id should match",
    projectDetail.owner_id,
    project.owner_id,
  );
  TestValidator.equals(
    "project code should match",
    projectDetail.code,
    project.code,
  );
  TestValidator.equals(
    "project name should match",
    projectDetail.name,
    project.name,
  );
  TestValidator.equals(
    "project description should match",
    projectDetail.description,
    project.description,
  );

  // Additional data presence checks
  TestValidator.predicate(
    "project created_at is ISO date-time string",
    typeof projectDetail.created_at === "string" &&
      projectDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "project updated_at is ISO date-time string",
    typeof projectDetail.updated_at === "string" &&
      projectDetail.updated_at.length > 0,
  );
}
