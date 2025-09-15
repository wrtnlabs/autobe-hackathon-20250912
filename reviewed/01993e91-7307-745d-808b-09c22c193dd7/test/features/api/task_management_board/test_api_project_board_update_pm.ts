import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";

export async function test_api_project_board_update_pm(
  connection: api.IConnection,
) {
  // 1. PM User registration and authentication
  const pmEmail: string = typia.random<string & tags.Format<"email">>();
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: "TestPassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Create a new project with the PM user as owner
  const projectCode = RandomGenerator.alphaNumeric(8);
  const projectName = RandomGenerator.name(3);
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmUser.id,
        code: projectCode,
        name: projectName,
        description: "E2E test project for board update",
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  TestValidator.equals(
    "project owner_id matches pm user id",
    project.owner_id,
    pmUser.id,
  );
  TestValidator.equals("project code matches input", project.code, projectCode);
  TestValidator.equals("project name matches input", project.name, projectName);

  // 3. Create a board under the created project
  const boardCode = RandomGenerator.alphaNumeric(8);
  const boardName = RandomGenerator.name(2);
  const boardCreateBody = {
    project_id: project.id,
    owner_id: pmUser.id,
    code: boardCode,
    name: boardName,
    description: "Initial description",
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  TestValidator.equals(
    "board project_id matches project id",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "board owner_id matches pm user id",
    board.owner_id,
    pmUser.id,
  );
  TestValidator.equals("board code matches input", board.code, boardCode);
  TestValidator.equals("board name matches input", board.name, boardName);

  // 4. Update the board information
  const updatedName = RandomGenerator.name(4);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const boardUpdateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies ITaskManagementBoard.IUpdate;

  const updatedBoard: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.update(connection, {
      projectId: project.id,
      boardId: board.id,
      body: boardUpdateBody,
    });
  typia.assert(updatedBoard);

  TestValidator.equals(
    "updated board id remains same",
    updatedBoard.id,
    board.id,
  );
  TestValidator.equals(
    "updated board project_id remains same",
    updatedBoard.project_id,
    project.id,
  );
  TestValidator.equals(
    "updated board owner_id remains same",
    updatedBoard.owner_id,
    pmUser.id,
  );
  TestValidator.equals(
    "updated board name matches update",
    updatedBoard.name,
    updatedName,
  );
  TestValidator.equals(
    "updated board description matches update",
    updatedBoard.description,
    updatedDescription,
  );
}
