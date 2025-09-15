import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test validates the retrieval of detailed information of a
 * specific board member in a board management system by an authenticated PMO
 * role user. The workflow includes:
 *
 * 1. Registering a PMO user (join) and authenticating via login,
 * 2. Registering a Project Manager (PM) user and authenticating (to assign as
 *    project owner),
 * 3. Creating a new project by the PM user to provide a context container,
 * 4. Creating a board within the project using a TPM user,
 * 5. Assigning the PMO user as a member to the created board (to confirm
 *    authorization),
 * 6. Retrieving the detailed board member information via GET
 *    /taskManagement/pmo/boards/{boardId}/members/{memberId} endpoint,
 *    verifying that the data is correctly returned and valid per schema,
 * 7. Testing negative scenarios of unauthorized access by switching to other roles
 *    (TPM, PM) and ensuring access is denied,
 * 8. Testing retrieval attempts with invalid or non-existent board or member IDs,
 *    verifying proper error handling. Each API call is awaited and response
 *    type-asserted for type safety, random realistic data is generated using
 *    typia and RandomGenerator, and TestValidator ensures expected conditions
 *    and failures. This test reliably asserts PMO role capabilities to access
 *    board member details and guards against unauthorized or invalid requests,
 *    enforcing business and security rules in the system.
 */
export async function test_api_board_member_detail_retrieval_pmo_role(
  connection: api.IConnection,
) {
  // 1. PMO user: join and login
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A1b2c3d4!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoUserLoggedIn: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, { body: pmoLoginBody });
  typia.assert(pmoUserLoggedIn);

  TestValidator.equals(
    "PMO user ID consistency",
    pmoUser.id,
    pmoUserLoggedIn.id,
  );

  // 2. PM user: join and login (who will create the project)
  const pmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A1b2c3d4!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody });
  typia.assert(pmUser);

  const pmLoginBody = {
    email: pmJoinBody.email,
    password: pmJoinBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmUserLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmUserLoggedIn);

  TestValidator.equals("PM user ID consistency", pmUser.id, pmUserLoggedIn.id);

  // 3. PM user creates a project
  const projectCreateBody = {
    owner_id: pmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals(
    "Project owner ID matches PM user ID",
    project.owner_id,
    pmUser.id,
  );

  // 4. TPM user: join and login (to create board)
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "A1b2c3d4!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLoggedIn: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(tpmUserLoggedIn);

  TestValidator.equals(
    "TPM user ID consistency",
    tpmUser.id,
    tpmUserLoggedIn.id,
  );

  // 5. TPM user creates a board within the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);
  TestValidator.equals(
    "Board project ID matches project ID",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "Board owner ID matches TPM user ID",
    board.owner_id,
    tpmUser.id,
  );

  // 6. PMO user is assigned as a member of the board
  const nowIso = new Date().toISOString();
  const boardMemberCreateBody = {
    board_id: board.id,
    user_id: pmoUser.id,
    created_at: nowIso,
    updated_at: nowIso,
  } satisfies ITaskManagementBoardMember.ICreate;
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.pmo.boards.members.create(connection, {
      boardId: board.id,
      body: boardMemberCreateBody,
    });
  typia.assert(boardMember);
  TestValidator.equals(
    "Board member board ID matches board ID",
    boardMember.board_id,
    board.id,
  );
  TestValidator.equals(
    "Board member user ID matches PMO user ID",
    boardMember.user_id,
    pmoUser.id,
  );

  // 7. Retrieve board member detail using PMO role
  // Already authenticated as PMO user from step 1
  const retrievedBoardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.pmo.boards.members.at(connection, {
      boardId: board.id,
      memberId: boardMember.id,
    });
  typia.assert(retrievedBoardMember);
  TestValidator.equals(
    "Retrieved member is the assigned member",
    retrievedBoardMember.id,
    boardMember.id,
  );
  TestValidator.equals(
    "Retrieved member belongs to correct board",
    retrievedBoardMember.board_id,
    board.id,
  );
  TestValidator.equals(
    "Retrieved member user matches PMO user ID",
    retrievedBoardMember.user_id,
    pmoUser.id,
  );

  // 8. Negative tests
  // 8.1: Unauthorized access - currently authenticated as PMO user.
  // Switch to TPM user - should be unauthorized to access PMO board member info
  await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  await TestValidator.error(
    "TPM role should not access PMO board member detail",
    async () => {
      await api.functional.taskManagement.pmo.boards.members.at(connection, {
        boardId: board.id,
        memberId: boardMember.id,
      });
    },
  );

  // Switch to PM user - should be unauthorized as well
  await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  await TestValidator.error(
    "PM role should not access PMO board member detail",
    async () => {
      await api.functional.taskManagement.pmo.boards.members.at(connection, {
        boardId: board.id,
        memberId: boardMember.id,
      });
    },
  );

  // 8.2: Invalid boardId and memberId
  await api.functional.auth.pmo.login(connection, { body: pmoLoginBody }); // Switch back to PMO user

  await TestValidator.error("Non-existent board ID returns error", async () => {
    await api.functional.taskManagement.pmo.boards.members.at(connection, {
      boardId: typia.random<string & tags.Format<"uuid">>(),
      memberId: boardMember.id,
    });
  });

  await TestValidator.error(
    "Non-existent member ID returns error",
    async () => {
      await api.functional.taskManagement.pmo.boards.members.at(connection, {
        boardId: board.id,
        memberId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
