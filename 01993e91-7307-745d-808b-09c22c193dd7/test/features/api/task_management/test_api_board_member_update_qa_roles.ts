import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

export async function test_api_board_member_update_qa_roles(
  connection: api.IConnection,
) {
  // 1. Register a QA user
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate hashed password
  const name = RandomGenerator.name();
  const createBody = {
    email,
    password_hash: passwordHash,
    name,
  } satisfies ITaskManagementQa.ICreate;
  const qaUser = await api.functional.auth.qa.join(connection, {
    body: createBody,
  });
  typia.assert(qaUser);

  // 2. Login as the QA user to authenticate and set authorization token
  const loginBody = {
    email,
    password: passwordHash,
  } satisfies ITaskManagementQa.ILogin;
  const loginUser = await api.functional.auth.qa.login(connection, {
    body: loginBody,
  });
  typia.assert(loginUser);

  // 3. Prepare realistic board member update data
  const updateBody = {
    board_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies ITaskManagementBoardMember.IUpdate;

  // 4. Call the update endpoint with valid boardId and memberId
  const updatedMember =
    await api.functional.taskManagement.qa.boards.members.update(connection, {
      boardId: updateBody.board_id,
      memberId: typia.random<string & tags.Format<"uuid">>(),
      body: updateBody,
    });
  typia.assert(updatedMember);

  // 5. Validate the updated member
  TestValidator.equals(
    "updated board_id",
    updatedMember.board_id,
    updateBody.board_id,
  );
  TestValidator.equals(
    "updated user_id",
    updatedMember.user_id,
    updateBody.user_id,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(updatedMember.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(updatedMember.updated_at)),
  );
  TestValidator.equals("deleted_at is null", updatedMember.deleted_at, null);
}
