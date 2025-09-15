import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_board_member_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate developer user
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "strongPassword123";
  const developerUser = await api.functional.auth.developer.join(connection, {
    body: {
      email: developerEmail,
      password_hash: developerPassword,
      name: RandomGenerator.name(),
      deleted_at: null,
    } satisfies ITaskManagementDeveloper.ICreate,
  });
  typia.assert(developerUser);

  // 2. Create and authenticate TPM user
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "strongPassword123";
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(tpmUser);

  // 3. Create project owned by TPM user
  const projectCode = RandomGenerator.alphaNumeric(8);
  const projectName = RandomGenerator.name(3);
  const projectDescription = RandomGenerator.paragraph({ sentences: 5 });
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: {
        owner_id: tpmUser.id,
        code: projectCode,
        name: projectName,
        description: projectDescription,
      } satisfies ITaskManagementProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals(
    "project owner id matches tpm user",
    project.owner_id,
    tpmUser.id,
  );

  // 4. Create board within project
  const boardCode = RandomGenerator.alphaNumeric(6);
  const boardName = RandomGenerator.name(3);
  const boardDescription = RandomGenerator.paragraph({ sentences: 5 });
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmUser.id,
        code: boardCode,
        name: boardName,
        description: boardDescription,
      } satisfies ITaskManagementBoard.ICreate,
    },
  );
  typia.assert(board);
  TestValidator.equals(
    "board project id matches project id",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "board owner id matches tpm user id",
    board.owner_id,
    tpmUser.id,
  );

  // 5. Add developer user as board member
  const nowISOString = new Date().toISOString();
  const boardMember =
    await api.functional.taskManagement.developer.boards.members.create(
      connection,
      {
        boardId: board.id,
        body: {
          board_id: board.id,
          user_id: developerUser.id,
          created_at: nowISOString,
          updated_at: nowISOString,
          deleted_at: null,
        } satisfies ITaskManagementBoardMember.ICreate,
      },
    );
  typia.assert(boardMember);
  TestValidator.equals(
    "board member user id matches developer id",
    boardMember.user_id,
    developerUser.id,
  );

  // 6. Update board member's information - will update the updated_at and optionally delete_at to null
  const updateTimestamp = new Date(new Date().getTime() + 1000).toISOString();
  const updatedBoardMember =
    await api.functional.taskManagement.developer.boards.members.update(
      connection,
      {
        boardId: board.id,
        memberId: boardMember.id,
        body: {
          updated_at: updateTimestamp,
          deleted_at: null,
        } satisfies ITaskManagementBoardMember.IUpdate,
      },
    );
  typia.assert(updatedBoardMember);
  TestValidator.equals(
    "updated board member id matches",
    updatedBoardMember.id,
    boardMember.id,
  );
  TestValidator.equals(
    "updated board id matches",
    updatedBoardMember.board_id,
    board.id,
  );
  TestValidator.equals(
    "updated user id matches",
    updatedBoardMember.user_id,
    developerUser.id,
  );
  TestValidator.equals(
    "updated updated_at matches",
    updatedBoardMember.updated_at,
    updateTimestamp,
  );
  TestValidator.equals(
    "deleted_at is null",
    updatedBoardMember.deleted_at,
    null,
  );
}
