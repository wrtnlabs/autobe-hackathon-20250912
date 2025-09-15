import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";

/**
 * End-to-End test to validate board deletion by a PM user within the task
 * management system.
 *
 * This test covers the full lifecycle from user registration and
 * authentication, project creation, board creation under the project, to
 * deletion of the board. It validates both the successful deletion workflow and
 * error conditions including unauthorized access and invalid IDs.
 *
 * Steps:
 *
 * 1. Create PM user and login
 * 2. Create project under PM
 * 3. Create board under project
 * 4. Delete the board
 * 5. Verify deletion error on same board
 * 6. Verify unauthorized deletion errors
 * 7. Verify invalid ID deletion errors
 *
 * Assertions include API call success, response correctness, and error
 * throwing.
 */
export async function test_api_delete_project_board_pm_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "1234";
  const pmName = RandomGenerator.name();

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
        name: pmName,
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmAuthorized);

  // 2. Login PM user to establish authentication
  const pmLogin: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: {
        email: pmEmail,
        password: pmPassword,
      } satisfies ITaskManagementPm.ILogin,
    });
  typia.assert(pmLogin);

  // 3. Create a project under logged-in PM user
  const projectCode = RandomGenerator.alphaNumeric(8);
  const projectName = RandomGenerator.name();

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmLogin.id,
        code: projectCode,
        name: projectName,
        description: null,
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Create a board inside the created project
  const boardCode = RandomGenerator.alphaNumeric(6);
  const boardName = RandomGenerator.name();
  const boardDescription: string | null = null;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: pmLogin.id,
        code: boardCode,
        name: boardName,
        description: boardDescription,
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. Delete the created board
  await api.functional.taskManagement.pm.projects.boards.erase(connection, {
    projectId: project.id,
    boardId: board.id,
  });

  // 6. Verify deletion by trying to delete again, expecting an error
  await TestValidator.error(
    "Deleting already deleted board should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.erase(connection, {
        projectId: project.id,
        boardId: board.id,
      });
    },
  );

  // 7. Verify unauthorized deletion fails:
  // Create a new connection without authentication (unauthenticated user)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized board deletion should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.erase(
        unauthConnection,
        {
          projectId: project.id,
          boardId: board.id,
        },
      );
    },
  );

  // 8. Verify deletion with invalid projectId or boardId fails
  const invalidUuid1 = typia.random<string & tags.Format<"uuid">>();
  const invalidUuid2 = typia.random<string & tags.Format<"uuid">>();

  // Invalid projectId
  await TestValidator.error(
    "Deleting board with invalid projectId should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.erase(connection, {
        projectId: invalidUuid1,
        boardId: board.id,
      });
    },
  );

  // Invalid boardId
  await TestValidator.error(
    "Deleting board with invalid boardId should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.boards.erase(connection, {
        projectId: project.id,
        boardId: invalidUuid2,
      });
    },
  );
}
