import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";

/**
 * Organization admin should be able to update their resource schedule, with
 * changes properly reflected and persisted. Also, permission and business
 * validation should be enforced for update scenarios.
 *
 * Steps:
 *
 * 1. Join as organization admin (create admin session)
 * 2. Create a resource schedule as this admin
 * 3. Update the resource schedule (e.g., change window, recurrence)
 * 4. Assert that response contains updated values
 * 5. Re-fetch schedule to ensure persistence (if applicable)
 * 6. Try invalid update (e.g., end time before start time) and expect error
 * 7. Register different organization admin, try to update the first schedule,
 *    expect forbidden/not found
 */
export async function test_api_resource_schedule_update_success(
  connection: api.IConnection,
) {
  // 1. Organization admin sign up
  const adminSignup: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminSignup);

  // 2. Create new resource schedule
  const resourceScheduleCreate = {
    healthcare_platform_organization_id: adminSignup.id, // The admin's own org id (assuming 1:1 mapping for demo)
    resource_type: "room",
    resource_id: typia.random<string & tags.Format<"uuid">>(),
    available_start_time: "09:00",
    available_end_time: "17:00",
    recurrence_pattern: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    exception_dates: '["2025-07-04"]',
  } satisfies IHealthcarePlatformResourceSchedule.ICreate;

  const originalSchedule: IHealthcarePlatformResourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      { body: resourceScheduleCreate },
    );
  typia.assert(originalSchedule);

  // 3. Update schedule with valid change
  const updateBody = {
    available_start_time: "08:00",
    available_end_time: "16:00",
    recurrence_pattern: "RRULE:FREQ=WEEKLY;BYDAY=TU,TH",
  } satisfies IHealthcarePlatformResourceSchedule.IUpdate;
  const updated: IHealthcarePlatformResourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.update(
      connection,
      {
        resourceScheduleId: originalSchedule.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Assert changed values
  TestValidator.equals(
    "updated start time",
    updated.available_start_time,
    updateBody.available_start_time,
  );
  TestValidator.equals(
    "updated end time",
    updated.available_end_time,
    updateBody.available_end_time,
  );
  TestValidator.equals(
    "updated recurrence",
    updated.recurrence_pattern,
    updateBody.recurrence_pattern,
  );
  // 5. (Assume update response reflects latest state, as no GET endpoint is documented)

  // 6. Negative: invalid update (end before start), expect error
  await TestValidator.error(
    "Update with end time before start must fail",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.update(
        connection,
        {
          resourceScheduleId: originalSchedule.id,
          body: {
            available_start_time: "18:00",
            available_end_time: "08:00",
          } satisfies IHealthcarePlatformResourceSchedule.IUpdate,
        },
      ),
  );

  // 7. Negative: Different admin (other org) attempts update, should fail
  // Create secondary org admin
  const secondAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(secondAdmin);
  // Switch to this admin session
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: secondAdmin.email,
      full_name: secondAdmin.full_name,
      phone: secondAdmin.phone,
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  // Try to update first admin's schedule with second admin, should be forbidden/not found
  await TestValidator.error(
    "Other org admin cannot update schedule",
    async () =>
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.update(
        connection,
        {
          resourceScheduleId: originalSchedule.id,
          body: {
            available_start_time: "10:00",
          } satisfies IHealthcarePlatformResourceSchedule.IUpdate,
        },
      ),
  );
}
