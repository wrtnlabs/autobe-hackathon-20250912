import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates the lifecycle of deleting a board member with TPM roles
 * authorization. It ensures that a TPM user can successfully delete a member
 * from a board, and that invalid scenarios such as unauthorized access and
 * deletion of non-existent members are handled with appropriate errors.
 *
 * The test flow is as follows:
 *
 * 1. TPM user registration via /auth/tpm/join
 * 2. TPM user login via /auth/tpm/login to establish authentication token
 * 3. Deletion of board member using valid boardId and memberId
 * 4. Validation of successful deletion (no response body expected)
 * 5. Negative tests for unauthorized access and non-existent member deletion
 */
export async function test_api_board_member_deletion_tpm_roles(
  connection: api.IConnection,
) {
  // 1. TPM user registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!", // Using a realistic password value
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. TPM user login to establish a fresh authentication context
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginAuthorized: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // Simulate board and member UUIDs for testing
  const validBoardId = typia.random<string & tags.Format<"uuid">>();
  const validMemberId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete an existing board member with valid UUIDs
  await api.functional.taskManagement.tpm.boards.members.erase(connection, {
    boardId: validBoardId,
    memberId: validMemberId,
  });

  // Since response is void, success means no exception thrown

  // 4. Negative tests start

  // 4.1 Attempt to delete a non-existent board member (expect error)
  // Using random UUIDs different from valid ones
  const nonExistentBoardId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent board member should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.erase(connection, {
        boardId: nonExistentBoardId,
        memberId: nonExistentMemberId,
      });
    },
  );

  // 4.2 Attempt to delete without authentication (simulate unauthorized by
  // creating unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deleting without authentication should fail",
    async () => {
      await api.functional.taskManagement.tpm.boards.members.erase(
        unauthenticatedConnection,
        {
          boardId: validBoardId,
          memberId: validMemberId,
        },
      );
    },
  );
}
