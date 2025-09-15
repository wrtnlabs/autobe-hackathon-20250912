import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate project search access and results for Developer by TPM owner ID.
 *
 * Business flow:
 *
 * 1. Register and authenticate a TPM user.
 * 2. Create three distinct projects owned by that TPM user.
 * 3. Register and authenticate a Developer user.
 * 4. Developer user performs a project search filtered by the TPM owner_id
 *    with pagination.
 * 5. Validate that all returned projects belong to the TPM owner.
 * 6. Validate pagination metadata correctness including current page, limit,
 *    total records, and pages.
 * 7. Validate that returned project summaries have correct fields (id, code,
 *    name, created_at, updated_at).
 */
export async function test_api_project_search_with_valid_owner_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate TPM user
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 2. Create multiple projects with TPM as owner
  const numberOfProjects = 3;
  const createdProjects: ITaskManagementProject[] = [];
  for (let i = 0; i < numberOfProjects; i++) {
    const projectCode = `proj-${RandomGenerator.alphaNumeric(6)}`;
    const projectName = RandomGenerator.name(2);
    const projectDescription =
      i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 4 }) : null;

    const project: ITaskManagementProject =
      await api.functional.taskManagement.tpm.projects.create(connection, {
        body: {
          owner_id: tpmUser.id,
          code: projectCode,
          name: projectName,
          description: projectDescription,
        } satisfies ITaskManagementProject.ICreate,
      });
    typia.assert(project);
    createdProjects.push(project);
  }

  // 3. Register and authenticate Developer user
  const developerUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developerUser);

  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerUser.email,
      password: developerUser.password_hash, // Assuming password_hash is plain password for testing
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 4. Developer searches projects filtered by owner_id with pagination
  const requestBody = {
    owner_id: tpmUser.id,
    page: 1,
    limit: 2,
  } satisfies ITaskManagementProject.IRequest;

  const projectPage: IPageITaskManagementProject.ISummary =
    await api.functional.taskManagement.developer.projects.index(connection, {
      body: requestBody,
    });
  typia.assert(projectPage);

  // 5. Validate all projects have matching owner_id
  for (const projectSummary of projectPage.data) {
    TestValidator.equals(
      `project owner_id should match ${tpmUser.id}`,
      projectSummary.id
        ? createdProjects.find((p) => p.id === projectSummary.id)?.owner_id
        : undefined,
      tpmUser.id,
    );
  }

  // 6. Validate pagination metadata correctness
  TestValidator.equals(
    "pagination current page should be 1",
    projectPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    projectPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records should be >= number of created projects",
    projectPage.pagination.records >= createdProjects.length,
  );
  const expectedPages = Math.ceil(
    projectPage.pagination.records / projectPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages count should be ceiling of records/limit",
    projectPage.pagination.pages,
    expectedPages,
  );

  // 7. Validate returned project summaries have correct fields
  for (const projectSummary of projectPage.data) {
    TestValidator.predicate(
      `project ${projectSummary.id} id is string and length > 0`,
      typeof projectSummary.id === "string" && projectSummary.id.length > 0,
    );

    TestValidator.predicate(
      `project ${projectSummary.id} code is string and length > 0`,
      typeof projectSummary.code === "string" && projectSummary.code.length > 0,
    );

    TestValidator.predicate(
      `project ${projectSummary.id} name is string and length > 0`,
      typeof projectSummary.name === "string" && projectSummary.name.length > 0,
    );

    TestValidator.predicate(
      `project ${projectSummary.id} created_at has valid ISO string`,
      typeof projectSummary.created_at === "string" &&
        !isNaN(Date.parse(projectSummary.created_at)),
    );

    TestValidator.predicate(
      `project ${projectSummary.id} updated_at has valid ISO string`,
      typeof projectSummary.updated_at === "string" &&
        !isNaN(Date.parse(projectSummary.updated_at)),
    );
  }
}
