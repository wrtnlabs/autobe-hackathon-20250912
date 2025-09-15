import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test failure when requesting details of a non-existent regular user ID by
 * admin.
 *
 * Setup includes creating admin user auth context via /auth/admin/join.
 * Then call GET /eventRegistration/admin/regularUsers/{regularUserId} with
 * invalid UUID. Verify response indicates error by checking that an error
 * is thrown (e.g., not found).
 */
export async function test_api_admin_retrieve_regular_user_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Create admin user and establish admin authentication context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = "password_hash_example_123"; // mock hashed password

  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: "Admin User",
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminUser);

  // 2. Attempt to retrieve a non-existent regular user
  const invalidRegularUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "retrieving non-existent regular user should throw error",
    async () => {
      await api.functional.eventRegistration.admin.regularUsers.at(connection, {
        regularUserId: invalidRegularUserId,
      });
    },
  );
}
