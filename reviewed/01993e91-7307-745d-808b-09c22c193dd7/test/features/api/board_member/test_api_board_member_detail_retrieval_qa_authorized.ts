import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Validates retrieval of detailed information for a QA board member.
 *
 * This test function conducts a comprehensive multi-role workflow:
 *
 * 1. Registers and logs in a QA user to obtain authentication tokens.
 * 2. Registers and logs in a Designer user for administrative board
 *    operations.
 * 3. Simulates creation of a project board by generating a valid UUID.
 * 4. Simulates addition of the QA user as a member to the board using user and
 *    board IDs.
 * 5. Retrieves detailed board member information via the designer API
 *    endpoint.
 * 6. Validates the retrieved data for correctness including UUID format and
 *    timestamps.
 *
 * This test ensures the correct association and retrieval of QA members in
 * board contexts, guaranteeing role-based authorization and data
 * integrity.
 *
 * Note: Board creation and membership addition are simulated due to lack of
 * corresponding APIs.
 */
export async function test_api_board_member_detail_retrieval_qa_authorized(
  connection: api.IConnection,
) {
  // 1. Register a QA user
  const qaUser = await api.functional.auth.qa.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies ITaskManagementQa.ICreate,
  });
  typia.assert(qaUser);

  // 2. QA user login to refresh tokens and set auth header
  const qaLogin = await api.functional.auth.qa.login(connection, {
    body: {
      email: qaUser.email,
      password: qaUser.password_hash,
    } satisfies ITaskManagementQa.ILogin,
  });
  typia.assert(qaLogin);

  // 3. Register a Designer user
  const designerUser = await api.functional.auth.designer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies ITaskManagementDesigner.ICreate,
  });
  typia.assert(designerUser);

  // 4. Designer user login
  const designerLogin = await api.functional.auth.designer.login(connection, {
    body: {
      email: designerUser.email,
      password: designerUser.password_hash,
    } satisfies ITaskManagementDesigner.ILogin,
  });
  typia.assert(designerLogin);

  // 5. Simulate board creation by generating a UUID (no actual API provided)
  const boardId = typia.random<string & tags.Format<"uuid">>();

  // 6. Using QA user ID as member ID
  const memberId = qaUser.id;

  // 7. Retrieve board member details with designer role authorization
  const memberDetail =
    await api.functional.taskManagement.designer.boards.members.at(connection, {
      boardId: boardId,
      memberId: memberId,
    });
  typia.assert(memberDetail);

  // 8. Validate returned board member properties
  TestValidator.equals(
    "Board ID matches the requested boardId",
    memberDetail.board_id,
    boardId,
  );
  TestValidator.equals(
    "Member user ID matches the QA user ID",
    memberDetail.user_id,
    memberId,
  );
  TestValidator.predicate(
    "created_at is a valid ISO 8601 date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(memberDetail.created_at),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(memberDetail.updated_at),
  );
  TestValidator.predicate(
    "deleted_at is either undefined, null, or a valid ISO 8601 date-time string",
    memberDetail.deleted_at === null ||
      memberDetail.deleted_at === undefined ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(
        memberDetail.deleted_at ?? "",
      ),
  );
}
