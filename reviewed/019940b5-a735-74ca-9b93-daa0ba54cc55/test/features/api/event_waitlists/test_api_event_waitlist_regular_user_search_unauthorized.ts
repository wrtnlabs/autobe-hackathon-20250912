import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";

/**
 * Validate unauthorized access restrictions for event waitlist search.
 *
 * This test attempts to invoke the PATCH
 * /eventRegistration/regularUser/eventWaitlists endpoint without any
 * authentication to verify the access control mechanisms are enforced. The
 * expected outcome is that the API call fails due to missing authentication
 * tokens or insufficient credentials.
 *
 * Before the main test, a user join operation is performed to establish a
 * valid regular user account and authentication context, which serves as a
 * prerequisite but is not used for authorization in the main test.
 *
 * Steps:
 *
 * 1. Call the dependency function to create a valid regular user account and
 *    receive authentication tokens.
 * 2. Create an unauthenticated connection by clearing headers.
 * 3. Attempt to call the event waitlist search endpoint with unauthenticated
 *    connection.
 * 4. Validate that an authorization error is thrown.
 */
export async function test_api_event_waitlist_regular_user_search_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create a valid regular user by joining. Authentication handled automatically.
  const user = await api.functional.auth.regularUser.join.joinRegularUser(
    connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@example.com",
        password_hash: RandomGenerator.alphaNumeric(20),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to call the event waitlist search endpoint without authentication
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.eventRegistration.regularUser.eventWaitlists.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 10,
          event_id: null,
          regular_user_id: null,
        } satisfies IEventRegistrationEventWaitlist.IRequest,
      },
    );
  });
}
