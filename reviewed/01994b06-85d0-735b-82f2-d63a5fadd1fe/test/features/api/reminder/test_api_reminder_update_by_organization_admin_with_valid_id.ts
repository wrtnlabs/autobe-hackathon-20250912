import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate that an Organization Admin can update an existing healthcare
 * platform reminder with permissible field changes.
 *
 * This E2E test verifies business logic where an authenticated organization
 * admin with proper credentials can:
 *
 * 1. Successfully create a new organization admin account (join)
 * 2. Log in as the created organization admin
 * 3. Create a new reminder as that admin (capturing a valid reminderId)
 * 4. Update the existing reminder (PUT) using its ID, changing permissible
 *    fields such as delivery time (scheduled_for), message, and status
 * 5. Verify that the update operation returns the updated reminder object
 *    reflecting the new values, and that fields not updated remain
 *    unchanged.
 *
 * Test covers field updates that do not violate business rules and that the
 * operation succeeds with a valid, authenticated admin and real resource.
 * Response is checked both for type validity (using typia) and precise
 * change application (business-level equality on updated fields, no change
 * on others).
 */
export async function test_api_reminder_update_by_organization_admin_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Join as an organization admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "12345678test!",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Login as that admin (to enforce fresh session/token)
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const tokenResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginInput },
  );
  typia.assert(tokenResult);

  // 3. Create a new reminder via organization admin POST endpoint
  const reminderInput = {
    reminder_type: RandomGenerator.paragraph({ sentences: 2 }),
    reminder_message: RandomGenerator.paragraph({ sentences: 5 }),
    scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    status: "pending",
  } satisfies IHealthcarePlatformReminder.ICreate;
  const createdReminder =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.create(
      connection,
      { body: reminderInput },
    );
  typia.assert(createdReminder);

  // 4. Update the reminder (change permissible fields)
  const updateInput = {
    scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    reminder_message: RandomGenerator.paragraph({ sentences: 3 }),
    status: "sent",
  } satisfies IHealthcarePlatformReminder.IUpdate;
  const updatedReminder =
    await api.functional.healthcarePlatform.organizationAdmin.reminders.update(
      connection,
      { reminderId: createdReminder.id, body: updateInput },
    );
  typia.assert(updatedReminder);

  // 5. Verify only the changed fields were updated, and others remain the same
  TestValidator.equals(
    "reminder id remains the same",
    updatedReminder.id,
    createdReminder.id,
  );
  TestValidator.notEquals(
    "scheduled_for updated",
    updatedReminder.scheduled_for,
    createdReminder.scheduled_for,
  );
  TestValidator.notEquals(
    "reminder_message updated",
    updatedReminder.reminder_message,
    createdReminder.reminder_message,
  );
  TestValidator.notEquals(
    "status updated",
    updatedReminder.status,
    createdReminder.status,
  );
  // unchanged fields remain the same
  TestValidator.equals(
    "reminder_type unchanged",
    updatedReminder.reminder_type,
    createdReminder.reminder_type,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedReminder.created_at,
    createdReminder.created_at,
  );
  TestValidator.equals(
    "target_user_id unchanged",
    updatedReminder.target_user_id,
    createdReminder.target_user_id,
  );
  TestValidator.equals(
    "organization_id unchanged",
    updatedReminder.organization_id,
    createdReminder.organization_id,
  );
}
