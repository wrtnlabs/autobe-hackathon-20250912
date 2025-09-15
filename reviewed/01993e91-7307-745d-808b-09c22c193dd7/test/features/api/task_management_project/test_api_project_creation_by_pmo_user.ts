import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";

/**
 * This test validates the creation of a new project by a PMO user.
 *
 * The PMO user is first registered and authenticated to obtain
 * authorization. The test then creates a project using the authenticated
 * PMO user's id as owner_id.
 *
 * It confirms that the project data returned matches the input data,
 * including the owner id, project code, and name. It verifies that
 * timestamps created_at and updated_at conform to ISO 8601 date-time
 * format. Also checks that deleted_at is null or undefined as expected for
 * new projects.
 *
 * Steps:
 *
 * 1. Register and authenticate a PMO user via POST /auth/pmo/join.
 * 2. Prepare a valid project creation request body with owner_id as PMO user's
 *    id.
 * 3. Create a new project with POST /taskManagement/pmo/projects.
 * 4. Assert the response properties match expectations and validate
 *    timestamps.
 *
 * This scenario ensures PMO role users can create projects with proper auth
 * and data integrity.
 */
export async function test_api_project_creation_by_pmo_user(
  connection: api.IConnection,
) {
  // 1. Register PMO user
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. Prepare project creation data
  const projectBody = {
    owner_id: pmoUser.id,
    code: RandomGenerator.alphabets(6).toUpperCase(),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;

  // 3. Create project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 4. Validate project properties
  TestValidator.equals(
    "owner_id equals PMO user id",
    project.owner_id,
    pmoUser.id,
  );
  TestValidator.equals(
    "code matches project code",
    project.code,
    projectBody.code,
  );
  TestValidator.equals(
    "name matches project name",
    project.name,
    projectBody.name,
  );
  TestValidator.equals("description is null", project.description, null);

  // 5. Validate timestamps are ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof project.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        project.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof project.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        project.updated_at,
      ),
  );

  // 6. deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    project.deleted_at === null || project.deleted_at === undefined,
  );
}
