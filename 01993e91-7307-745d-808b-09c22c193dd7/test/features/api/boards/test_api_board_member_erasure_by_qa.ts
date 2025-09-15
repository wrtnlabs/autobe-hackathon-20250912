import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_board_member_erasure_by_qa(
  connection: api.IConnection,
) {
  // 1. Create a QA user account
  const qaJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser = await api.functional.auth.qa.join(connection, {
    body: qaJoinBody,
  });
  typia.assert(qaUser);

  // 2. QA user login
  const qaLoginBody = {
    email: qaJoinBody.email,
    password: qaJoinBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const qaUserLogged = await api.functional.auth.qa.login(connection, {
    body: qaLoginBody,
  });
  typia.assert(qaUserLogged);

  // 3. Create a TPM user account to own project and board
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 4. TPM user login
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmUserLogged = await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  typia.assert(tpmUserLogged);

  // 5. Create a project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUserLogged.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectCreateBody,
    },
  );
  typia.assert(project);

  // 6. Create board under project owned by TPM user
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUserLogged.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 7. Add QA user as member of the board
  const nowISOString = new Date().toISOString();
  const memberCreateBody = {
    board_id: board.id,
    user_id: qaUserLogged.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.ICreate;

  const member = await api.functional.taskManagement.qa.boards.members.create(
    connection,
    {
      boardId: board.id,
      body: memberCreateBody,
    },
  );
  typia.assert(member);

  // 8. Switch authentication context to QA user
  await api.functional.auth.qa.login(connection, { body: qaLoginBody });

  // 9. Delete the board member relationship by QA user
  await api.functional.taskManagement.qa.boards.members.erase(connection, {
    boardId: board.id,
    memberId: member.id,
  });

  // 10. Try to delete again to confirm deletion returns error
  await TestValidator.error(
    "delete already deleted or non-existent membership should error",
    async () => {
      await api.functional.taskManagement.qa.boards.members.erase(connection, {
        boardId: board.id,
        memberId: member.id,
      });
    },
  );
}
