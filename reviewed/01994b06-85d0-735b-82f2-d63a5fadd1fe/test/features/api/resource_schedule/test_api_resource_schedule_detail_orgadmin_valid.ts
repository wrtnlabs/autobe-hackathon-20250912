import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";

/**
 * Organization admin retrieves their own resource schedule and cannot access
 * another org's schedule.
 *
 * 1. Register and login as organization admin (orgAdminA)
 * 2. Create a resourceSchedule for orgAdminA's organization
 * 3. GET /resourceSchedules/{resourceScheduleId} as adminA: expect details to
 *    match creation
 * 4. Register/login as a second organization admin (orgAdminB - separate
 *    organization)
 * 5. Attempt to GET orgAdminA's schedule as orgAdminB - expect error
 *    (forbidden/not found)
 */
export async function test_api_resource_schedule_detail_orgadmin_valid(
  connection: api.IConnection,
) {
  // 1. Register and login as orgAdminA
  const adminA_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminA_join);
  const adminA_orgId = adminA_join.id;
  const organizationId = typia.assert<string & tags.Format<"uuid">>(
    adminA_orgId,
  );

  // 2. Create resource schedule for orgAdminA
  const resourceCreate = {
    healthcare_platform_organization_id: organizationId,
    resource_type: RandomGenerator.pick([
      "provider",
      "equipment",
      "room",
    ] as const),
    resource_id: typia.random<string & tags.Format<"uuid">>(),
    available_start_time: "09:00",
    available_end_time: "18:00",
    recurrence_pattern: null,
    exception_dates: null,
  } satisfies IHealthcarePlatformResourceSchedule.ICreate;
  const resourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: resourceCreate,
      },
    );
  typia.assert(resourceSchedule);
  const scheduleId = typia.assert<string & tags.Format<"uuid">>(
    resourceSchedule.id,
  );

  // 3. GET as orgAdminA: should succeed and match
  const fetchedSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.at(
      connection,
      {
        resourceScheduleId: scheduleId,
      },
    );
  typia.assert(fetchedSchedule);
  TestValidator.equals(
    "fetched schedule matches created",
    fetchedSchedule,
    resourceSchedule,
  );

  // 4. Register/login as second org admin (orgAdminB - must be another org)
  const adminB_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminB_join);

  // 5. Attempt GET as orgAdminB: should fail with forbidden/not found
  await TestValidator.error(
    "other org admin cannot access this schedule",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.at(
        connection,
        {
          resourceScheduleId: scheduleId,
        },
      );
    },
  );
}
