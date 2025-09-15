import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoardMember";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_board_members_paginated_filtered_retrieval_tpm_context(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a TPM user
  const tpmJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPass!123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: tpmJoinBody });
  typia.assert(tpmUser);

  // 2. Login as the TPM user (to switch context and refresh auth tokens)
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: tpmLoginBody });
  typia.assert(loginUser);

  // 3. Create a project owned by this TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a board within the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardCreateBody,
    });
  typia.assert(board);

  // 5. Create multiple TPM users and add them as members to the board
  const memberCount = 15;
  const tpmUsers: ITaskManagementTpm.IAuthorized[] = [];

  // Helper to create and login TPM users privately
  for (let i = 0; i < memberCount; i++) {
    const joinBody = {
      email: RandomGenerator.alphaNumeric(10) + `_${i}@example.com`,
      password: "StrongPass!123",
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.IJoin;

    // Join
    const user = await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
    typia.assert(user);
    tpmUsers.push(user);

    // Login each user to simulate context token update
    const loginBody = {
      email: joinBody.email,
      password: joinBody.password,
    } satisfies ITaskManagementTpm.ILogin;
    const loggedInUser = await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
    typia.assert(loggedInUser);
  }

  // Add TPM users as board members
  for (const user of tpmUsers) {
    const memberCreateBody = {
      board_id: board.id,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies ITaskManagementBoardMember.ICreate;

    const member =
      await api.functional.taskManagement.tpm.boards.members.create(
        connection,
        { boardId: board.id, body: memberCreateBody },
      );
    typia.assert(member);
  }

  // 6. Test pagination and filtering on board members list
  // First test: list first page, 5 members per page
  const requestBody1 = {
    page: 1,
    limit: 5,
    sort: "user_id asc",
    search: null,
  } satisfies ITaskManagementBoardMember.IRequest;

  const page1: IPageITaskManagementBoardMember.ISummary =
    await api.functional.taskManagement.tpm.boards.members.index(connection, {
      boardId: board.id,
      body: requestBody1,
    });
  typia.assert(page1);

  TestValidator.predicate("page1 current is 1", page1.pagination.current === 1);
  TestValidator.predicate("page1 limit is 5", page1.pagination.limit === 5);
  TestValidator.predicate("page1 data length <= limit", page1.data.length <= 5);

  // All members in page must belong to board
  for (const member of page1.data) {
    TestValidator.equals(
      "member's board_id matches board id",
      member.board_id,
      board.id,
    );
  }

  // Second test: list second page
  const requestBody2 = {
    page: 2,
    limit: 5,
    sort: "user_id asc",
    search: null,
  } satisfies ITaskManagementBoardMember.IRequest;

  const page2: IPageITaskManagementBoardMember.ISummary =
    await api.functional.taskManagement.tpm.boards.members.index(connection, {
      boardId: board.id,
      body: requestBody2,
    });
  typia.assert(page2);

  TestValidator.predicate("page2 current is 2", page2.pagination.current === 2);
  TestValidator.predicate("page2 limit is 5", page2.pagination.limit === 5);
  TestValidator.predicate("page2 data length <= limit", page2.data.length <= 5);

  for (const member of page2.data) {
    TestValidator.equals(
      "member's board_id matches board id",
      member.board_id,
      board.id,
    );
  }

  // Third test: filter members by searching a substring of user_id (simulate search on user id)
  const searchUser = tpmUsers[5];
  // Taking partial substring from user id
  const searchKey = searchUser.id.substring(0, 8);

  const requestBody3 = {
    page: 1,
    limit: 10,
    sort: "user_id asc",
    search: searchKey,
  } satisfies ITaskManagementBoardMember.IRequest;

  const page3: IPageITaskManagementBoardMember.ISummary =
    await api.functional.taskManagement.tpm.boards.members.index(connection, {
      boardId: board.id,
      body: requestBody3,
    });
  typia.assert(page3);

  TestValidator.predicate("page3 current is 1", page3.pagination.current === 1);
  TestValidator.predicate("page3 limit is 10", page3.pagination.limit === 10);

  for (const member of page3.data) {
    TestValidator.equals(
      "member's board_id matches board id",
      member.board_id,
      board.id,
    );
    TestValidator.predicate(
      "member user_id contains search key",
      member.user_id.includes(searchKey),
    );
  }

  // 7. Error tests
  // Invalid boardId error
  await TestValidator.error("invalid boardId fails", async () => {
    await api.functional.taskManagement.tpm.boards.members.index(connection, {
      boardId: "00000000-0000-0000-0000-000000000000",
      body: {
        page: 1,
        limit: 5,
        sort: "user_id asc",
        search: null,
      } satisfies ITaskManagementBoardMember.IRequest,
    });
  });

  // Unauthorized context test: simulate by using empty headers connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.taskManagement.tpm.boards.members.index(
      unauthenticatedConn,
      {
        boardId: board.id,
        body: {
          page: 1,
          limit: 5,
          sort: "user_id asc",
          search: null,
        } satisfies ITaskManagementBoardMember.IRequest,
      },
    );
  });
}
