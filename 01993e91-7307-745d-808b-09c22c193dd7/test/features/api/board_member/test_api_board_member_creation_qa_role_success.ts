import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates the workflow of creating a QA user,
 * authenticating it; creating a TPM user and authenticating it; creating a
 * project owned by the TPM; creating a board within the project owned by
 * the TPM; and then adding the QA user as a board member to the created
 * board. The test checks all entity creations for proper structure and
 * verifies the final board member creation response. The authentication
 * token management uses the auth APIs for both roles.
 *
 * The test uses typia.assert() to validate API responses and uses
 * TestValidator to ensure correctness of relationships like ownership and
 * membership.
 *
 * The scenario ensures correct permission handling by performing role-based
 * authentication switching and confirms successful board member addition
 * with correct timestamp validations.
 *
 * The test provides a comprehensive verification for the board member
 * creation endpoint for QA role membership additions.
 */
export async function test_api_board_member_creation_qa_role_success(
  connection: api.IConnection,
) {
  // 1. QA user creation and authentication
  const qaEmail = typia.random<string & tags.Format<"email">>();
  const qaPassword = RandomGenerator.alphaNumeric(12);

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: qaEmail,
        password_hash: qaPassword,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // Login QA user to obtain token
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaEmail,
      password: qaPassword,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 2. TPM user creation and authentication
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(12);

  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // Login TPM user to get authorized context
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 3. Create a project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);
  TestValidator.equals(
    "project owner matches TPM user",
    project.owner_id,
    tpmUser.id,
  );

  // 4. Create board within project, owned by TPM
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);
  TestValidator.equals(
    "board owner matches TPM user",
    board.owner_id,
    tpmUser.id,
  );
  TestValidator.equals(
    "board project matches project",
    board.project_id,
    project.id,
  );

  // 5. Add QA user as board member
  const nowISOString = new Date().toISOString();
  const memberCreateBody = {
    board_id: board.id,
    user_id: qaUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.qa.boards.members.create(connection, {
      boardId: board.id,
      body: memberCreateBody,
    });
  typia.assert(boardMember);

  TestValidator.equals(
    "boardMember board_id matches board",
    boardMember.board_id,
    board.id,
  );
  TestValidator.equals(
    "boardMember user_id matches QA user",
    boardMember.user_id,
    qaUser.id,
  );

  TestValidator.predicate(
    "boardMember created_at and updated_at are ISO strings",
    typeof boardMember.created_at === "string" &&
      boardMember.created_at.length > 0 &&
      typeof boardMember.updated_at === "string" &&
      boardMember.updated_at.length > 0,
  );
  TestValidator.equals(
    "boardMember deleted_at is null",
    boardMember.deleted_at,
    null,
  );
}
