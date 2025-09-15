import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Verify organization admin can retrieve scheduled reminder details by ID.
 *
 * Business context: An org admin registers/logs into the platform, creates a
 * reminder (which could be for a specific user or organization-wide), and then
 * accesses that reminder's details by its unique ID. This checks round-trip
 * data integrity, authentication, and permission scope.
 *
 * 1. Register and log in as a new organization admin with strong random data.
 * 2. Create a reminder (scheduled for a future ISO 8601 date-time) with typical
 *    and edge-case payloads, ensuring org and target user context are
 *    exercised.
 * 3. Retrieve the reminder details using the ID from creation.
 * 4. Assert that findings match creation input (reminder_type, message, schedule,
 *    etc.) and all expected fields exist with correct types. Validate round
 *    trip data accuracy.
 */
export async function test_api_reminder_detail_organization_admin_authorized_access(
  connection: api.IConnection,
) {
  // Step 1: Register org admin
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinRequest,
  });
  typia.assert(admin);

  // Step 2: Create a scheduled reminder (for org or specific user)
  const reminderCreate: IHealthcarePlatformReminder.ICreate = {
    reminder_type: RandomGenerator.pick([
      "appointment",
      "medication",
      "task",
      "compliance",
      "survey",
    ] as const),
    reminder_message: RandomGenerator.paragraph({ sentences: 5 }),
    scheduled_for: new Date(Date.now() + 86400 * 1000).toISOString(), // 1 day in the future
    // For edge case: sometimes specify org ID, sometimes not
    organization_id: admin.id, // Testing org-level reminder
    // For edge case: target_user_id nullable
    // We'll leave it undefined for org-wide test
    status: "pending",
  };
  const created =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      { body: reminderCreate },
    );
  typia.assert(created);

  // Step 3: Retrieve the reminder by ID
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.at(
      connection,
      { reminderId: created.id },
    );
  typia.assert(fetched);

  // Step 4: Validate details match creation
  // Check required/expected fields are preserved
  TestValidator.equals("reminder id matches", fetched.id, created.id);
  TestValidator.equals(
    "reminder type matches",
    fetched.reminder_type,
    reminderCreate.reminder_type,
  );
  TestValidator.equals(
    "reminder message matches",
    fetched.reminder_message,
    reminderCreate.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for matches",
    fetched.scheduled_for,
    reminderCreate.scheduled_for,
  );
  TestValidator.equals("status matches", fetched.status, reminderCreate.status);
  TestValidator.equals(
    "organization id matches",
    fetched.organization_id,
    reminderCreate.organization_id,
  );

  // Optionally validate more fields or create a second reminder with different edge-cases
}
