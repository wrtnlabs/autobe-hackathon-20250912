import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";

/**
 * Tests that a valid organization admin can delete (permanently remove) a
 * resource schedule by resourceScheduleId.
 *
 * Steps:
 *
 * 1. Register and login as a new organization admin
 * 2. Create a new resource schedule as that admin
 * 3. Delete the resource schedule just created (should succeed)
 * 4. Re-attempt to delete the same schedule (should error - not found)
 * 5. Attempt to delete a random non-existent UUID (should error) Additional:
 *    Checks that resource is not accessible post-delete using deletion error
 *    codes as proxy (since GET endpoint not present in SDK)
 */
export async function test_api_resource_schedule_deletion_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register new org admin
  const email = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "SuperSecretPW123!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(orgAdmin);
  // By calling join, authentication context is set.

  // 2. Create resource schedule owned by this org
  const createInput = {
    healthcare_platform_organization_id: orgAdmin.id,
    resource_type: RandomGenerator.pick([
      "provider",
      "room",
      "equipment",
    ] as const),
    resource_id: typia.random<string & tags.Format<"uuid">>(),
    available_start_time: "2025-09-15T09:00:00+09:00", // using near-future static window
    available_end_time: "2025-09-15T17:00:00+09:00",
    recurrence_pattern: "FREQ=WEEKLY;BYDAY=MO,WE,FR", // sample iCal RRULE
    exception_dates: '["2025-09-29"]',
  } satisfies IHealthcarePlatformResourceSchedule.ICreate;
  const schedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      { body: createInput },
    );
  typia.assert(schedule);
  TestValidator.equals(
    "created orgId matches owner",
    schedule.healthcare_platform_organization_id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "created resource type matches",
    schedule.resource_type,
    createInput.resource_type,
  );

  // 3. Delete resource schedule by id
  await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.erase(
    connection,
    { resourceScheduleId: schedule.id },
  );

  // 4. Attempt repeat deletion (should error)
  await TestValidator.error(
    "repeat deletion should fail with error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.erase(
        connection,
        { resourceScheduleId: schedule.id },
      );
    },
  );

  // 5. Attempt to delete non-existent resource schedule (random UUID)
  await TestValidator.error(
    "deleting non-existent resource schedule should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.erase(
        connection,
        { resourceScheduleId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
