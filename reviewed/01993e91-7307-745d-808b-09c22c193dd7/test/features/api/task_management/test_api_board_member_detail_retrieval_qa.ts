import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This end-to-end test validates reading detailed information about a
 * specific member of a QA board using the GET
 * /taskManagement/qa/boards/{boardId}/members/{memberId} API.
 *
 * The test flow includes:
 *
 * 1. Registering and authenticating a new QA user.
 * 2. Simulating a board ID as no board creation API is available.
 * 3. Using the authenticated user's ID as the memberId.
 * 4. Retrieving the board member details and validating response correctness.
 * 5. Testing unauthorized access by using an unauthenticated connection.
 *
 * This test ensures the API returns correct membership data with valid
 * timestamps, proper user association, and respects authorization
 * requirements.
 *
 * Note: Due to lack of board and membership creation APIs, the boardId is
 * randomized and membership creation is assumed for demonstration. The
 * focus is on schema compliance and core functionality validation.
 */
export async function test_api_board_member_detail_retrieval_qa(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a QA user
  const createQaUserBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password_hash: typia.random<string>(),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const authorizedQaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: createQaUserBody,
    });
  typia.assert(authorizedQaUser);

  // 2. Simulate a boardId (since board creation APIs are not provided)
  const boardId = typia.random<string & tags.Format<"uuid">>();

  // 3. Use the authenticated user's id as memberId
  const memberId = authorizedQaUser.id;

  // 4. Retrieve the board member detail
  const memberDetail: ITaskManagementBoardMember =
    await api.functional.taskManagement.qa.boards.members.at(connection, {
      boardId,
      memberId,
    });
  typia.assert(memberDetail);

  // 5. Validate response details
  TestValidator.equals(
    "member id matches authenticated user",
    memberDetail.user_id,
    memberId,
  );
  TestValidator.equals(
    "board id matches requested",
    memberDetail.board_id,
    boardId,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(memberDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(memberDetail.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    memberDetail.deleted_at,
    null,
  );

  // 6. Test unauthorized access with an unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to board member detail should fail",
    async () => {
      await api.functional.taskManagement.qa.boards.members.at(unauthConn, {
        boardId,
        memberId,
      });
    },
  );
}
