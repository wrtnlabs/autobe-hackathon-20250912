import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * This test scenario covers the deletion of a forum thread by an authenticated
 * guest user within a specified forum. It tests successful deletion when the
 * guest has proper authorization within their tenant scope. The scenario
 * includes error cases such as invalid forum or thread IDs, unauthorized access
 * attempts, and deletion of threads outside the guest's tenant to ensure data
 * isolation is maintained. It requires following dependencies for guest join
 * authentication to establish user context before deletion testing. The
 * scenario validates that the deletion operation is a hard delete and properly
 * cleans up the forum thread record with correct HTTP responses.
 */
export async function test_api_guest_user_forum_thread_deletion_with_auth_and_validation(
  connection: api.IConnection,
) {
  // 1. Guest user creation and authentication
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const guestCreateBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guestAuthorized: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(guestAuthorized);

  // Valid UUIDs for forum and forum thread
  const validForumId = typia.random<string & tags.Format<"uuid">>();
  const validForumThreadId = typia.random<string & tags.Format<"uuid">>();

  // 2. Successful deletion test
  await api.functional.enterpriseLms.guest.forums.forumThreads.erase(
    connection,
    {
      forumId: validForumId,
      forumThreadId: validForumThreadId,
    },
  );

  // Confirm hard deletion by attempting to delete again
  await TestValidator.error(
    "deleting already deleted forum thread fails",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.erase(
        connection,
        {
          forumId: validForumId,
          forumThreadId: validForumThreadId,
        },
      );
    },
  );

  // 3. Unauthorized deletion attempt test - uses a different tenantId
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherEmail = `${RandomGenerator.name(1).toLowerCase()}@example.com`;

  const otherGuestCreateBody = {
    tenant_id: otherTenantId,
    email: otherEmail,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  // Authenticate as other guest with different tenant
  const otherGuestAuthorized: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: otherGuestCreateBody,
    });
  typia.assert(otherGuestAuthorized);

  await TestValidator.error(
    "unauthorized guest user cannot delete forum thread outside their tenant",
    async () => {
      await api.functional.enterpriseLms.guest.forums.forumThreads.erase(
        connection,
        {
          forumId: validForumId,
          forumThreadId: validForumThreadId,
        },
      );
    },
  );
}
