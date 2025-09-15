import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";

/**
 * Test retrieving detailed event analytics record by eventAnalyticsId for an
 * admin user.
 *
 * The test proceeds with:
 *
 * 1. Creating an admin user and authenticating via /auth/admin/join.
 * 2. Retrieving event analytics details using a randomly generated
 *    eventAnalyticsId.
 * 3. Validating response data complies fully with the
 *    IEventRegistrationEventAnalytics schema.
 *
 * This test confirms that only authenticated admin users can access event
 * analytics details. No error or unauthorized retrieval tests are included as
 * scenario constraints specify.
 */
export async function test_api_event_analytics_detail_retrieval_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin user account
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(30),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 2. Retrieve event analytics detail with a valid eventAnalyticsId
  const sampleEventAnalyticsId = typia.random<string & tags.Format<"uuid">>();
  const eventAnalytics: IEventRegistrationEventAnalytics =
    await api.functional.eventRegistration.admin.eventAnalytics.at(connection, {
      eventAnalyticsId: sampleEventAnalyticsId,
    });
  typia.assert(eventAnalytics);
}
