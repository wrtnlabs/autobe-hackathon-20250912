import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * Test for detailed retrieval of a board member's information for an
 * authorized Designer user.
 *
 * This test covers the lifecycle from Designer user account creation and
 * authentication, to fetching detailed membership data associated with a
 * board under Designer authorization.
 *
 * The test mocks project/board creation and member addition due to missing
 * API but authenticates a Designer user and then attempts to get their
 * membership info.
 *
 * Key validations include membership object presence, proper UUID formats,
 * timestamps for creation and updates, and correct linkage to the board and
 * user. Ensures that the authorization tokens from join and login steps
 * enable successful board member data retrieval.
 */
export async function test_api_board_member_detail_retrieval_designer_authorized(
  connection: api.IConnection,
) {
  // Step 1: Define known password for test
  const plainPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Register a new Designer user with known password as hash (for test, use same string)
  const designerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: plainPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const authorizedDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreateBody,
    });
  typia.assert(authorizedDesigner);

  // Step 3: Login as the same Designer user with the plain password
  const designerLoginBody = {
    email: designerCreateBody.email,
    password: plainPassword,
  } satisfies ITaskManagementDesigner.ILogin;

  const loggedInDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(loggedInDesigner);

  // Step 4: Since project and board creation APIs are not provided, mock boardId and memberId using UUID
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = authorizedDesigner.id; // Use authorized Designer's id as memberId

  // Step 5: Retrieve board member details
  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.at(connection, {
      boardId: boardId,
      memberId: memberId,
    });
  typia.assert(boardMember);

  // Step 6: Validate the board member details
  // Validate IDs are UUID strings
  TestValidator.predicate(
    "board member ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      boardMember.id,
    ),
  );

  TestValidator.equals("board ID matches", boardMember.board_id, boardId);
  TestValidator.equals("member user ID matches", boardMember.user_id, memberId);

  // Validate timestamps are defined and valid ISO date times
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof boardMember.created_at === "string" &&
      !isNaN(Date.parse(boardMember.created_at)),
  );

  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof boardMember.updated_at === "string" &&
      !isNaN(Date.parse(boardMember.updated_at)),
  );

  // deleted_at can be null or undefined, if present should be valid ISO date string
  if (boardMember.deleted_at !== null && boardMember.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date string or null",
      typeof boardMember.deleted_at === "string" &&
        !isNaN(Date.parse(boardMember.deleted_at)),
    );
  }
}
