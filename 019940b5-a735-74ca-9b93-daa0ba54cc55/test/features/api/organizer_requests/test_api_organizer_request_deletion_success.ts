import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationOrganizerRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationOrganizerRequest";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test successful deletion of an event organizer request by an admin user.
 *
 * This scenario performs a multi-role workflow in the event registration
 * system:
 *
 * 1. Creates and authenticates an admin user.
 * 2. Creates and authenticates a regular user.
 * 3. Submits an organizer request by the regular user.
 * 4. Deletes the organizer request by the admin user.
 * 5. Validates the deletion is effective by ensuring no further retrieval is
 *    possible.
 *
 * It ensures API and DTO usage respects exact schema properties and values.
 */
export async function test_api_organizer_request_deletion_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePassword123";

  const adminCreate = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: "Admin User",
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminCreate);

  // The token is automatically set in connection.headers.Authorization by SDK

  // 2. Regular user creation and authentication
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = "userPassword123";

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  const regularUserCreate =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: "Regular User",
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUserCreate);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 3. Regular user submits an organizer request
  const organizerRequest =
    await api.functional.eventRegistration.regularUser.organizerRequests.createOrganizerRequest(
      connection,
      {
        body: {
          user_id: regularUserCreate.id,
          status: "pending",
          reason: "I want to organize events.",
          admin_comment: null,
        } satisfies IEventRegistrationOrganizerRequest.ICreate,
      },
    );
  typia.assert(organizerRequest);

  // 4. Switch to admin context for deletion
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 5. Admin deletes the organizer request
  await api.functional.eventRegistration.admin.organizerRequests.eraseOrganizerRequest(
    connection,
    {
      organizerRequestId: organizerRequest.id,
    },
  );

  // 6. Validate deletion by attempting to delete again should fail (optional - not shown here)
  // Since retrieval API is not provided in given material, we test deletion failure
  await TestValidator.error(
    "should fail to delete non-existent organizer request",
    async () => {
      await api.functional.eventRegistration.admin.organizerRequests.eraseOrganizerRequest(
        connection,
        {
          organizerRequestId: organizerRequest.id,
        },
      );
    },
  );
}
