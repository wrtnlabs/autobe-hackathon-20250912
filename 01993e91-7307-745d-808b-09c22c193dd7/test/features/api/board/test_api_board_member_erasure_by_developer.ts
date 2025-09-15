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

/**
 * This end-to-end test verifies the complete flow of a developer user
 * registering, authenticating, creating a project, creating a board, adding
 * themselves as a board member, and then deleting that membership.
 *
 * The test covers:
 *
 * - Developer registration and login
 * - Project creation with ownership validation
 * - Board creation within the project
 * - Adding the developer as a member of the board
 * - Deleting the developer's membership from the board
 * - Verifying proper deletion semantics
 * - Testing error scenarios such as deleting non-existent or unauthorized
 *   memberships
 *
 * The test uses typia.assert to validate all response types and
 * TestValidator for business logic validation.
 *
 * All timestamps are ISO strings generated at test runtime.
 *
 * Authorization tokens are automatically managed by the SDK.
 */
export async function test_api_board_member_erasure_by_developer(
  connection: api.IConnection,
) {
  // Step 1: Generate a plain password used both for registration and login
  const plainPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Developer user registration
  const developerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: plainPassword, // Simulating password hash as plain password for test
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreate,
    });
  typia.assert(developer);

  // Step 3: Developer user login
  const developerLogin = {
    email: developer.email,
    password: plainPassword, // Use the same plain password for login
  } satisfies ITaskManagementDeveloper.ILogin;
  const developerLoginResp: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLogin,
    });
  typia.assert(developerLoginResp);

  // Step 4: Create a new project owned by the developer
  const projectCreate = {
    owner_id: developerLoginResp.id,
    code: `PRJ-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreate,
    });
  typia.assert(project);
  TestValidator.equals(
    "project owner matches developer",
    project.owner_id,
    developerLoginResp.id,
  );

  // Step 5: Create a new board within the project
  const boardCreate = {
    project_id: project.id,
    owner_id: developerLoginResp.id,
    code: `BRD-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreate,
    });
  typia.assert(board);
  TestValidator.equals(
    "board project ID matches project",
    board.project_id,
    project.id,
  );

  // Step 6: Add the developer as a member of the board
  const nowISOString = new Date().toISOString();
  const memberCreate = {
    board_id: board.id,
    user_id: developerLoginResp.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;
  const member: ITaskManagementBoardMember =
    await api.functional.taskManagement.developer.boards.members.create(
      connection,
      {
        boardId: board.id,
        body: memberCreate,
      },
    );
  typia.assert(member);
  TestValidator.equals(
    "member board ID matches board",
    member.board_id,
    board.id,
  );
  TestValidator.equals(
    "member user ID matches developer",
    member.user_id,
    developerLoginResp.id,
  );

  // Step 7: Delete the board member association
  await api.functional.taskManagement.developer.boards.members.erase(
    connection,
    {
      boardId: board.id,
      memberId: member.id,
    },
  );

  // Step 8: Test error handling when deleting the same member again (should error)
  await TestValidator.error(
    "deleting non-existent member should fail",
    async () => {
      await api.functional.taskManagement.developer.boards.members.erase(
        connection,
        {
          boardId: board.id,
          memberId: member.id,
        },
      );
    },
  );

  // Step 9: Test error handling for invalid boardId and memberId (invalid UUIDs)
  await TestValidator.error(
    "deleting with invalid UUIDs should fail",
    async () => {
      await api.functional.taskManagement.developer.boards.members.erase(
        connection,
        {
          boardId: "00000000-0000-0000-0000-000000000000",
          memberId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
