import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function validates the detailed retrieval of a board member by
 * a developer user. It verifies successful data retrieval, role-based
 * access control, and input validation.
 *
 * Steps:
 *
 * 1. Register and authenticate a developer user.
 * 2. Register and authenticate a PM user.
 * 3. PM user creates a project.
 * 4. Developer user creates a board under the project.
 * 5. Developer user assigns themselves as a member of the board.
 * 6. Developer user retrieves member details to confirm accuracy.
 * 7. Other role users attempt access to the board member details and are
 *    denied.
 * 8. Retrieval with invalid or non-existent IDs is checked for error
 *    responses.
 */
export async function test_api_board_member_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Developer user joins (register) and login
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "P@ssw0rd!";
  const developerJoinBody = {
    email: developerEmail,
    password_hash: developerPassword,
    name: RandomGenerator.name(),
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.ICreate;
  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(developer);

  // logout developer to reset connection auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Login developer again to set authorization header
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies ITaskManagementDeveloper.ILogin;
  const loggedInDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(unauthenticatedConnection, {
      body: developerLoginBody,
    });
  typia.assert(loggedInDeveloper);

  // 2. PM user joins and login
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmPassword = "PmP@ssw0rd123";
  const pmJoinBody = {
    email: pmEmail,
    password: pmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pm: ITaskManagementPm.IAuthorized = await api.functional.auth.pm.join(
    unauthenticatedConnection,
    {
      body: pmJoinBody,
    },
  );
  typia.assert(pm);

  // Login PM user to set auth headers
  const pmLoginBody = {
    email: pmEmail,
    password: pmPassword,
  } satisfies ITaskManagementPm.ILogin;
  await api.functional.auth.pm.login(unauthenticatedConnection, {
    body: pmLoginBody,
  });

  // 3. PM creates a project
  const projectCreateBody = {
    owner_id: pm.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(
      unauthenticatedConnection,
      {
        body: projectCreateBody,
      },
    );
  typia.assert(project);

  // 4. Developer user creates a board under the project
  // Switch connection auth to developer
  await api.functional.auth.developer.login(unauthenticatedConnection, {
    body: developerLoginBody,
  });
  const boardCreateBody = {
    project_id: project.id,
    owner_id: developer.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(
      unauthenticatedConnection,
      {
        projectId: project.id,
        body: boardCreateBody,
      },
    );
  typia.assert(board);

  // 5. Developer user adds self as board member
  const now = new Date().toISOString();
  const memberCreateBody = {
    board_id: board.id,
    user_id: developer.id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.developer.boards.members.create(
      unauthenticatedConnection,
      {
        boardId: board.id,
        body: memberCreateBody,
      },
    );
  typia.assert(boardMember);

  // 6. Developer user retrieves board member details
  const boardMemberDetails: ITaskManagementBoardMember =
    await api.functional.taskManagement.developer.boards.members.at(
      unauthenticatedConnection,
      {
        boardId: board.id,
        memberId: boardMember.id,
      },
    );
  typia.assert(boardMemberDetails);
  TestValidator.equals(
    "Member ID matches",
    boardMember.id,
    boardMemberDetails.id,
  );
  TestValidator.equals(
    "Board ID matches",
    board.id,
    boardMemberDetails.board_id,
  );
  TestValidator.equals(
    "User ID matches",
    developer.id,
    boardMemberDetails.user_id,
  );

  // 7. Other roles try to access board member details (expect error)
  // TPM user joins and logs in
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "TpmP@ssw0rd987";
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpm: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(unauthenticatedConnection, {
      body: tpmJoinBody,
    });
  typia.assert(tpm);

  const tpmLoginBody = {
    email: tpmEmail,
    password: tpmPassword,
  } satisfies ITaskManagementTpm.ILogin;
  await api.functional.auth.tpm.login(unauthenticatedConnection, {
    body: tpmLoginBody,
  });

  // TPM tries to get board member details, expect error
  await TestValidator.error(
    "TPM role cannot access developer board member details",
    async () => {
      await api.functional.taskManagement.developer.boards.members.at(
        unauthenticatedConnection,
        {
          boardId: board.id,
          memberId: boardMember.id,
        },
      );
    },
  );

  // PM tries to get board member details, expect error
  await api.functional.auth.pm.login(unauthenticatedConnection, {
    body: pmLoginBody,
  });
  await TestValidator.error(
    "PM role cannot access developer board member details",
    async () => {
      await api.functional.taskManagement.developer.boards.members.at(
        unauthenticatedConnection,
        {
          boardId: board.id,
          memberId: boardMember.id,
        },
      );
    },
  );

  // 8. Test retrieval of non-existent member ID
  await TestValidator.error(
    "Retrieval fails for non-existent member ID",
    async () => {
      await api.functional.taskManagement.developer.boards.members.at(
        unauthenticatedConnection,
        {
          boardId: board.id,
          memberId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Test retrieval of non-existent board ID
  await TestValidator.error(
    "Retrieval fails for non-existent board ID",
    async () => {
      await api.functional.taskManagement.developer.boards.members.at(
        unauthenticatedConnection,
        {
          boardId: typia.random<string & tags.Format<"uuid">>(),
          memberId: boardMember.id,
        },
      );
    },
  );
}
