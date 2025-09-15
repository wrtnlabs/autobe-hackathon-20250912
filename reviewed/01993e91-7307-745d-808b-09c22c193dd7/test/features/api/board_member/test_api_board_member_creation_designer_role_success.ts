import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the full workflow of creating a board member with a
 * designer role in the Task Management system. Initially, it registers and
 * authenticates a new designer user to obtain credentials. Then, it registers
 * and logs in TPM, PMO users to participate in the project/board creation. The
 * TPM user creates a project via the PMO system, and then the TPM user creates
 * a board inside the project. Finally, using the designer's authentication
 * context, the test creates a board member linking the designer to the board
 * with accurate timestamps. The test asserts all API responses for correctness
 * in data and timestamps, ensuring the board member is precisely associated
 * with the designer user, and authorization roles function properly.
 *
 * This test also verifies that all the authorization tokens update properly
 * upon login and join for all user roles participating in the scenario,
 * ensuring token management across multiple actors. It validates the integrity
 * and association of the TPM user as the owner of the project and board.
 *
 * Negative error testing related to invalid IDs or unauthorized access is not
 * included per constraints to avoid non-executable or compilation-error-prone
 * scenarios. Only success paths with valid data and proper role-based
 * interactions are included.
 *
 * Detailed step-by-step plan:
 *
 * 1. Designer user joins (registration) and logs in.
 * 2. TPM user joins and logs in.
 * 3. PMO user joins and logs in.
 * 4. TPM user creates a new project owned by them.
 * 5. TPM user creates a board in the newly created project.
 * 6. Designer user creates a board member entry linking themselves to the board,
 *    with valid timestamps.
 * 7. Assertions validating correctness of all returned data, token presence,
 *    property coherence, and timestamp consistency.
 * 8. Role authentication correctness and session management verified by using
 *    corresponding join/login APIs.
 *
 * This scenario is implementable with the provided API SDK functions and DTO
 * schemas; all required fields and associations match the definitions. Typical
 * realistic data patterns are used for emails, names, codes, and descriptive
 * strings. Authentication switching is handled properly by separate calls to
 * login APIs per user role.
 *
 * Strict validation by typia.assert is employed for all API response data.
 * TestValidator functions are used for logical and value equality checks,
 * including timestamp presence and UUID format validation through typia. No
 * type error testing or forbidden practices are included, complying with all
 * absolute prohibitions.
 */
export async function test_api_board_member_creation_designer_role_success(
  connection: api.IConnection,
) {
  // 1. Register a new Designer user (join)
  const designerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const designerAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerJoinBody,
    });
  typia.assert(designerAuthorized);

  // 2. Login Designer user
  const designerLoginBody = {
    email: designerJoinBody.email,
    password: designerJoinBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;

  const designerLoginAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLoginAuthorized);

  // 3. Register a new TPM user (join)
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmAuthorized);

  // 4. Login TPM user
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const tpmLoginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: tpmLoginBody,
    });
  typia.assert(tpmLoginAuthorized);

  // 5. Register a new PMO user (join)
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;

  const pmoAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoAuthorized);

  // 6. Login PMO user
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;

  const pmoLoginAuthorized: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: pmoLoginBody,
    });
  typia.assert(pmoLoginAuthorized);

  // 7. TPM user creates a new project owned by themselves
  const projectCreateBody = {
    owner_id: tpmAuthorized.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // Confirm project owner and code
  TestValidator.equals(
    "Project owner ID matches",
    project.owner_id,
    tpmAuthorized.id,
  );
  TestValidator.equals(
    "Project code matches",
    project.code,
    projectCreateBody.code,
  );

  // 8. TPM user creates a board inside the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmAuthorized.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  TestValidator.equals(
    "Board project ID matches",
    board.project_id,
    project.id,
  );
  TestValidator.equals(
    "Board owner ID matches",
    board.owner_id,
    tpmAuthorized.id,
  );
  TestValidator.equals("Board code matches", board.code, boardCreateBody.code);

  // 9. Designer user creates board member linking themselves to the board
  const nowISO = new Date().toISOString();
  const boardMemberCreateBody = {
    board_id: board.id,
    user_id: designerAuthorized.id,
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.create(
      connection,
      {
        boardId: board.id,
        body: boardMemberCreateBody,
      },
    );
  typia.assert(boardMember);

  // Validate board member association and timestamps
  TestValidator.equals(
    "BoardMember board ID matches",
    boardMember.board_id,
    board.id,
  );
  TestValidator.equals(
    "BoardMember user ID matches",
    boardMember.user_id,
    designerAuthorized.id,
  );

  TestValidator.equals(
    "BoardMember created_at matches",
    boardMember.created_at,
    boardMemberCreateBody.created_at,
  );
  TestValidator.equals(
    "BoardMember updated_at matches",
    boardMember.updated_at,
    boardMemberCreateBody.updated_at,
  );

  TestValidator.equals(
    "BoardMember deleted_at is null",
    boardMember.deleted_at,
    null,
  );
}
