import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Test the update of a board member's details by an authenticated Designer
 * user.
 *
 * Workflow:
 *
 * 1. Designer signs up using /auth/designer/join
 * 2. Designer logs in using /auth/designer/login to establish authentication
 * 3. Using the auth token, the Designer updates a board member's details at
 *    /taskManagement/designer/boards/{boardId}/members/{memberId}
 * 4. Validates successful update and response integrity
 */
export async function test_api_board_member_update_designer_roles(
  connection: api.IConnection,
) {
  // Step 1: Designer user registration
  const joinBody = {
    email: `designer_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const joined: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Step 2: Designer user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies ITaskManagementDesigner.ILogin;

  const loggedIn: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Step 3: Prepare boardId and memberId (simulate valid UUIDs)
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // Prepare update payload for board member
  const updateBody = {
    updated_at: new Date().toISOString(),
    board_id: boardId,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date(Date.now() - 1000000).toISOString(),
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.IUpdate;

  // Step 4: Execute the update
  const updatedMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.update(
      connection,
      {
        boardId,
        memberId,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // Step 5: Validate response data coherence
  TestValidator.equals(
    "Updated board member board_id",
    updatedMember.board_id,
    boardId,
  );
  TestValidator.equals("Updated board member id", updatedMember.id, memberId);
  TestValidator.equals(
    "Updated board member user_id",
    updatedMember.user_id,
    updateBody.user_id,
  );
  TestValidator.predicate(
    "Updated board member updated_at is recent",
    new Date(updatedMember.updated_at) >= new Date(Date.now() - 60000),
  );
  TestValidator.equals(
    "Updated board member deleted_at is null",
    updatedMember.deleted_at,
    null,
  );
}
