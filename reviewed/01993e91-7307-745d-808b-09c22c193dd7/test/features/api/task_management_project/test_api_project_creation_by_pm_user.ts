import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";

export async function test_api_project_creation_by_pm_user(
  connection: api.IConnection,
) {
  // 1. Register PM user via /auth/pm/join
  const pmUserEmail = typia.random<string & tags.Format<"email">>();
  const pmUserPassword = "Password-1234";
  const pmUserName = RandomGenerator.name(2);

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmUserEmail,
        password: pmUserPassword,
        name: pmUserName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Prepare project creation data
  // Use owner_id referencing PM user id
  const projectCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const projectName = RandomGenerator.name(3);
  const projectDescription = RandomGenerator.paragraph({ sentences: 5 });

  const projectCreateBody = {
    owner_id: pmUser.id,
    code: projectCode,
    name: projectName,
    description: projectDescription,
  } satisfies ITaskManagementProject.ICreate;

  // 3. Create the project
  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(createdProject);

  // 4. Validate returned project fields
  TestValidator.equals(
    "project owner_id matches PM user id",
    createdProject.owner_id,
    pmUser.id,
  );
  TestValidator.equals(
    "project code matches input code",
    createdProject.code,
    projectCreateBody.code,
  );
  TestValidator.equals(
    "project name matches input name",
    createdProject.name,
    projectCreateBody.name,
  );

  // Description is optional and nullable
  if (
    projectCreateBody.description === null ||
    projectCreateBody.description === undefined
  ) {
    TestValidator.equals(
      "project description is null or undefined",
      createdProject.description,
      null,
    );
  } else {
    TestValidator.equals(
      "project description matches input description",
      createdProject.description,
      projectCreateBody.description,
    );
  }

  // Verify timestamps are valid ISO date-time strings
  typia.assert<string & tags.Format<"date-time">>(createdProject.created_at);
  typia.assert<string & tags.Format<"date-time">>(createdProject.updated_at);
  // deleted_at is optional and nullable
  if (
    createdProject.deleted_at !== null &&
    createdProject.deleted_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(createdProject.deleted_at);
  }
}
