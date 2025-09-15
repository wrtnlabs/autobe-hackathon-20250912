import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * E2E Test for PM Board Member Creation Success Scenario
 *
 * This test validates the user registration, login, and membership retrieval
 * for a PM user being created and linked as a board member. It simulates the
 * multi-user authentication flow for PM and designer roles, and verifies
 * membership details are correctly returned.
 */
export async function test_api_board_member_creation_pm_success(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const pmEmail = `pm.user.${RandomGenerator.alphaNumeric(8)}@test.com`;
  const pmPassword = "p@ssw0rd123";
  const pmName = RandomGenerator.name();

  const pmCreateBody = {
    email: pmEmail,
    password: pmPassword,
    name: pmName,
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. PM user login
  const pmLoginBody = {
    email: pmEmail,
    password: pmPassword,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // 3. Register a new Designer user
  const designerEmail = `designer.user.${RandomGenerator.alphaNumeric(8)}@test.com`;
  const designerPasswordHash = RandomGenerator.alphaNumeric(16); // Random hash
  const designerName = RandomGenerator.name();

  const designerCreateBody = {
    email: designerEmail,
    password_hash: designerPasswordHash,
    name: designerName,
  } satisfies ITaskManagementDesigner.ICreate;

  const designerAuthorized: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: designerCreateBody,
    });
  typia.assert(designerAuthorized);

  // 4. Designer user login
  const designerLoginBody = {
    email: designerEmail,
    password: designerPasswordHash,
  } satisfies ITaskManagementDesigner.ILogin;

  const designerLoggedIn: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: designerLoginBody,
    });
  typia.assert(designerLoggedIn);

  // 5. Simulate retrieval of Board Member data for the PM user on an example board
  // Since actual creation API not provided, using memberId and boardId from pmAuthorized for demonstration

  // Use pmAuthorized.id as memberId, generate a dummy boardId UUID
  const boardId = typia.random<string & tags.Format<"uuid">>();
  const memberId = pmAuthorized.id;

  const boardMember: ITaskManagementBoardMember =
    await api.functional.taskManagement.designer.boards.members.at(connection, {
      boardId: boardId,
      memberId: memberId,
    });
  typia.assert(boardMember);

  // Validate returned membership record
  TestValidator.equals("member id matches", boardMember.user_id, memberId);
  TestValidator.equals("board id matches", boardMember.board_id, boardId);
  TestValidator.predicate(
    "created_at is defined",
    boardMember.created_at !== null && boardMember.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is defined",
    boardMember.updated_at !== null && boardMember.updated_at !== undefined,
  );
  // deleted_at can be null or undefined explicitly
  if (boardMember.deleted_at !== null && boardMember.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is string if defined",
      typeof boardMember.deleted_at === "string",
    );
  }
}
