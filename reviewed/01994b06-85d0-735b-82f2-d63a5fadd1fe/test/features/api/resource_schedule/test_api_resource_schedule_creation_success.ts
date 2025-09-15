import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";

/**
 * Validate successful creation of a resource schedule by an organization admin.
 *
 * This scenario tests:
 *
 * 1. Registering (and authenticating) a new organization admin
 * 2. Creating a resource schedule for a plausible resource (resource_id is
 *    generated since resource entity APIs are not provided)
 * 3. Verifying the API response, ensuring that the resource schedule is returned
 *    with correct organization ID, viewable times, and recurrence/exception
 *    properties as requested
 * 4. Asserting that all system-controlled metadata (ID, created_at, updated_at)
 *    are present and valid
 *
 * Note: Negative cases (missing/invalid fields, unauthorized role, etc.) are to
 * be handled in other tests.
 */
export async function test_api_resource_schedule_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new organization admin
  const join: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(join);

  // 2. Prepare a plausible resource ID (since resource creation function is unavailable)
  const resourceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare creation body for resource schedule
  const createBody = {
    healthcare_platform_organization_id: join.id,
    resource_type: RandomGenerator.pick([
      "room",
      "provider",
      "equipment",
    ] as const),
    resource_id: resourceId,
    available_start_time: "09:00",
    available_end_time: "18:00",
    recurrence_pattern: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", // iCal standard; optional
    exception_dates: '["2025-08-15","2025-08-16"]', // Optional JSON string
  } satisfies IHealthcarePlatformResourceSchedule.ICreate;

  // 4. Create resource schedule as admin
  const schedule: IHealthcarePlatformResourceSchedule =
    await api.functional.healthcarePlatform.organizationAdmin.resourceSchedules.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(schedule);

  // 5. Verify all critical response fields
  TestValidator.equals(
    "organization ID matches",
    schedule.healthcare_platform_organization_id,
    createBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "resource ID matches",
    schedule.resource_id,
    createBody.resource_id,
  );
  TestValidator.equals(
    "resource type matches",
    schedule.resource_type,
    createBody.resource_type,
  );
  TestValidator.equals(
    "available start time matches",
    schedule.available_start_time,
    createBody.available_start_time,
  );
  TestValidator.equals(
    "available end time matches",
    schedule.available_end_time,
    createBody.available_end_time,
  );
  TestValidator.equals(
    "recurrence pattern matches",
    schedule.recurrence_pattern,
    createBody.recurrence_pattern,
  );
  TestValidator.equals(
    "exception dates matches",
    schedule.exception_dates,
    createBody.exception_dates,
  );
  TestValidator.predicate(
    "schedule ID is valid UUID",
    typeof schedule.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        schedule.id,
      ),
  );
  TestValidator.predicate(
    "created_at is a valid ISO8601 string",
    typeof schedule.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(schedule.created_at),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO8601 string",
    typeof schedule.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(schedule.updated_at),
  );
  TestValidator.equals(
    "deleted_at must be null or undefined",
    schedule.deleted_at,
    null,
  );
}
