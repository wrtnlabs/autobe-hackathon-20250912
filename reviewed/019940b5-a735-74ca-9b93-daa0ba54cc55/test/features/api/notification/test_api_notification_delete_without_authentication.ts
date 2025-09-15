import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test deletion attempt of a notification for a regular user without
 * authentication.
 *
 * This test performs a regular user join operation to establish a user
 * account and authentication context, then attempts to delete a
 * notification without any authentication (i.e., using a connection without
 * authorization headers).
 *
 * Expected behavior: The delete operation should fail due to missing
 * authentication, and an appropriate authorization error should be thrown.
 */
export async function test_api_notification_delete_without_authentication(
  connection: api.IConnection,
) {
  // 1. Perform regular user join for prerequisite authentication setup
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const user = await api.functional.auth.regularUser.join.joinRegularUser(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(user);

  // 2. Use an unauthenticated connection to attempt notification deletion
  // Create a new connection with empty headers, no auth token
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random notificationId
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete notification and expect an authorization error
  await TestValidator.error(
    "delete notification without authentication should throw error",
    async () => {
      await api.functional.eventRegistration.regularUser.notifications.erase(
        unauthConn,
        {
          notificationId,
        },
      );
    },
  );
}
