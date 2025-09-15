import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test full member creation workflow with TPM user authentication and access
 * control.
 *
 * 1. Register a new TPM user via /auth/tpm/join and verify authorized TPM user
 *    data with tokens.
 * 2. Login as the TPM user via /auth/tpm/login and verify tokens.
 * 3. Create a new board - simulated by generating a UUID, as no creation API
 *    provided.
 * 4. Add this user as a new member to the board via
 *    /taskManagement/tpm/boards/{boardId}/members POST endpoint.
 * 5. Validate that the member is correctly associated with board and user with
 *    proper timestamps.
 * 6. Validate failure on duplicate members (adding same user twice) using
 *    TestValidator.error.
 * 7. Validate unauthorized user cannot add members by trying create on a
 *    connection without login.
 * 8. Validate adding member to non-existent board (random UUID) fails.
 * 9. Validate adding member with invalid user_id format fails.
 */
export async function test_api_board_member_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new TPM user
  const tpmUserEmail = typia.random<string & tags.Format<"email">>();
  const tpmUserPassword = "P@ssw0rd1234";
  const tpmUserName = RandomGenerator.name(2);

  const joinBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
    name: tpmUserName,
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Login as the TPM user
  const loginBody = {
    email: tpmUserEmail,
    password: tpmUserPassword,
  } satisfies ITaskManagementTpm.ILogin;

  const loggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // We have valid authorized TPM user with tokens
  // 3. Simulate a new board creation by generating a valid UUID for an existing board
  const simulatedBoardId = typia.random<string & tags.Format<"uuid">>();

  // 4. Add the logged-in user as a new member to the board
  const nowISOString: string & tags.Format<"date-time"> =
    new Date().toISOString();
  // Construct create member body
  const createMemberBody = {
    board_id: simulatedBoardId,
    user_id: authorizedUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    // deleted_at omitted as optional and not set here
  } satisfies ITaskManagementBoardMember.ICreate;

  const member: ITaskManagementBoardMember =
    await api.functional.taskManagement.tpm.boards.members.create(connection, {
      boardId: simulatedBoardId,
      body: createMemberBody,
    });
  typia.assert(member);

  // Assert returned member properties
  TestValidator.equals(
    "member's board_id matches",
    member.board_id,
    simulatedBoardId,
  );
  TestValidator.equals(
    "member's user_id matches",
    member.user_id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "member created_at is valid ISO date",
    !isNaN(Date.parse(member.created_at)),
  );
  TestValidator.predicate(
    "member updated_at is valid ISO date",
    !isNaN(Date.parse(member.updated_at)),
  );

  // 6. Validate failure on duplicate member addition
  await TestValidator.error(
    "adding duplicate member to same board should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.create(
        connection,
        {
          boardId: simulatedBoardId,
          body: createMemberBody,
        },
      );
    },
  );

  // 7. Validate unauthorized add member attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized user cannot add member", async () => {
    await api.functional.taskManagement.tpm.boards.members.create(
      unauthConnection,
      {
        boardId: simulatedBoardId,
        body: {
          ...createMemberBody,
          // user_id replace with another random UUID to test unauthorized add
          user_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // 8. Validate adding member to non-existent board (random UUID)
  const randomBoardId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "cannot add member to non-existent board",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.create(
        connection,
        {
          boardId: randomBoardId,
          body: {
            ...createMemberBody,
            board_id: randomBoardId,
            user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 9. Validate adding member with invalid user_id format
  await TestValidator.error(
    "adding member with invalid user_id should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.create(
        connection,
        {
          boardId: simulatedBoardId,
          body: {
            ...createMemberBody,
            user_id: "invalid-uuid-format",
          },
        },
      );
    },
  );
}
