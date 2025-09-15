import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the project detail retrieval feature in a Task
 * Management System:
 *
 * 1. Create and join a PM user via /auth/pm/join (role: Project Manager)
 * 2. Create and join a TPM user via /auth/tpm/join (role: Technical Project
 *    Manager)
 * 3. The TPM user creates a project at /taskManagement/tpm/projects
 * 4. The PM user logs in via /auth/pm/login
 * 5. The PM user retrieves project details using GET
 *    /taskManagement/pm/projects/{projectId}
 *
 * The test checks valid response structures, authorization enforcement,
 * timestamps, and multi-role authentication. It confirms only authorized PM
 * can retrieve accurate project info.
 */
export async function test_api_project_detail_retrieval_with_full_dependency(
  connection: api.IConnection,
) {
  // 1. Create and join PM user
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@pm.test`,
        password: "StrongPassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // Validation of PM user token and fields
  TestValidator.predicate(
    "PM user has valid id",
    typeof pmUser.id === "string" && pmUser.id.length > 0,
  );
  TestValidator.predicate(
    "PM user has token with access and refresh",
    !!pmUser.token.access && !!pmUser.token.refresh,
  );

  // 2. Create and join TPM user as project owner
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmUser.email,
      password: "StrongPassword123!",
    } satisfies ITaskManagementPm.ILogin,
  });

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@tpm.test`,
        password: "StrongPassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // Validation of TPM user token and fields
  TestValidator.predicate(
    "TPM user has valid id",
    typeof tpmUser.id === "string" && tpmUser.id.length > 0,
  );
  TestValidator.predicate(
    "TPM user has token with access and refresh",
    !!tpmUser.token.access && !!tpmUser.token.refresh,
  );

  // 3. TPM user logs in
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmUser.email,
      password: "StrongPassword123!",
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 4. TPM user creates a project
  const projectCreateData = {
    owner_id: tpmUser.id satisfies string as string & tags.Format<"uuid">,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateData,
    });
  typia.assert(project);

  // Validation of project fields
  TestValidator.equals(
    "Project owner_id matches TPM user id",
    project.owner_id,
    tpmUser.id,
  );
  TestValidator.predicate(
    "Project has valid UUID id",
    typeof project.id === "string" && project.id.length > 0,
  );
  TestValidator.equals(
    "Project code matches",
    project.code,
    projectCreateData.code,
  );
  TestValidator.equals(
    "Project name matches",
    project.name,
    projectCreateData.name,
  );
  TestValidator.equals(
    "Project description matches",
    project.description ?? null,
    projectCreateData.description ?? null,
  );

  // 5. Switch to PM user login
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmUser.email,
      password: "StrongPassword123!",
    } satisfies ITaskManagementPm.ILogin,
  });

  // 6. PM user tries to get project details
  const projectDetails: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.at(connection, {
      projectId: project.id,
    });
  typia.assert(projectDetails);

  // Validate project details match
  TestValidator.equals(
    "Project details id match",
    projectDetails.id,
    project.id,
  );
  TestValidator.equals(
    "Project details owner_id match",
    projectDetails.owner_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "Project details code match",
    projectDetails.code,
    project.code,
  );
  TestValidator.equals(
    "Project details name match",
    projectDetails.name,
    project.name,
  );
  TestValidator.equals(
    "Project details description match",
    projectDetails.description ?? null,
    project.description ?? null,
  );

  // Validate timestamps presence
  TestValidator.predicate(
    "Created at is valid ISO string",
    typeof projectDetails.created_at === "string" &&
      projectDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "Updated at is valid ISO string",
    typeof projectDetails.updated_at === "string" &&
      projectDetails.updated_at.length > 0,
  );

  // 7. Negative Case: Unauthorized PM user cannot access without login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized access denied", async () => {
    await api.functional.taskManagement.pm.projects.at(unauthConnection, {
      projectId: project.id,
    });
  });

  // 8. Negative Case: Invalid projectId format
  await TestValidator.error("Invalid projectId format", async () => {
    await api.functional.taskManagement.pm.projects.at(connection, {
      projectId: "invalid-uuid-format",
    });
  });

  // 9. Negative Case: Non-existent projectId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Non-existent projectId returns not found",
    async () => {
      await api.functional.taskManagement.pm.projects.at(connection, {
        projectId: nonExistentId,
      });
    },
  );
}
