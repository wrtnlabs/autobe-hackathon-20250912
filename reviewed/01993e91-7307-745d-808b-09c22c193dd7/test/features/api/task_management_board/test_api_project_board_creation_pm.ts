import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";

/**
 * This E2E test verifies the workflow for a Project Manager (PM) to create a
 * board within a project. It tests the following sequence:
 *
 * 1. PM user registration and authentication.
 * 2. Project creation by the PM user.
 * 3. Board creation inside the created project.
 *
 * At each step, the test asserts that the returned data matches the expected
 * DTO schema and validates key business constraints such as ownership and
 * unique codes within the project.
 */
export async function test_api_project_board_creation_pm(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new PM user
  const pmUserEmail = `pmuser_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const pmUserPassword = "Password123!"; // secure but reproducible password for testing
  const pmUserCreate = {
    email: pmUserEmail,
    password: pmUserPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  // Join PM user
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmUserCreate,
    });
  typia.assert(pmUser);

  TestValidator.equals(
    "PM user email verification",
    pmUser.email,
    pmUserCreate.email,
  );

  // Step 2: Create a new project with the PM user as owner
  const projectCode = `PRJ_${RandomGenerator.alphaNumeric(6)}`;
  const projectName = `Project ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`;
  const projectDescription = null; // Explicitly null as optional

  const projectCreate = {
    owner_id: pmUser.id,
    code: projectCode,
    name: projectName,
    description: projectDescription,
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreate,
    });
  typia.assert(project);

  TestValidator.equals(
    "Project owner id matches PM user id",
    project.owner_id,
    pmUser.id,
  );
  TestValidator.equals("Project code matches input", project.code, projectCode);
  TestValidator.equals("Project name matches input", project.name, projectName);
  if (projectDescription === null) {
    TestValidator.equals(
      "Project description is null",
      project.description,
      null,
    );
  }

  // Step 3: Create a board inside the created project
  const boardCode = `BRD_${RandomGenerator.alphaNumeric(6)}`;
  const boardName = `Board ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`;
  const boardDescription = null; // optional description explicitly null

  const boardCreate = {
    project_id: project.id,
    owner_id: pmUser.id, // the PM user is the owner
    code: boardCode,
    name: boardName,
    description: boardDescription,
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreate,
    });
  typia.assert(board);

  TestValidator.equals(
    "Board's project_id matches project id",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "Board's owner_id matches PM user id",
    board.owner_id,
    pmUser.id,
  );
  TestValidator.equals("Board code matches input", board.code, boardCode);
  TestValidator.equals("Board name matches input", board.name, boardName);
  if (boardDescription === null) {
    TestValidator.equals("Board description is null", board.description, null);
  }
}
