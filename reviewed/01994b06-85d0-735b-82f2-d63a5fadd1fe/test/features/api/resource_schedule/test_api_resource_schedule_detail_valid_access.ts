import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system administrator can successfully retrieve the
 * details of a resource schedule given a valid authentication context and a
 * resourceScheduleId.
 *
 * Preconditions:
 *
 * 1. Register and login as a system administrator (with a business email,
 *    'local' as provider, and valid password).
 * 2. Create an organization (necessary context for a resource schedule).
 * 3. (Cannot create actual resource schedule - simulate by using a random UUID
 *    as resourceScheduleId).
 *
 * Test Steps:
 *
 * 1. Register system administrator with random business email and password
 *    ('local' provider).
 * 2. Create organization with random code, name, and status.
 * 3. Generate a random resourceScheduleId (tagged as UUID).
 * 4. Call GET
 *    /healthcarePlatform/systemAdmin/resourceSchedules/{resourceScheduleId}.
 * 5. Assert that output structure matches IHealthcarePlatformResourceSchedule.
 * 6. Assert that output.id matches the resourceScheduleId used in the call.
 */
export async function test_api_resource_schedule_detail_valid_access(
  connection: api.IConnection,
) {
  // 1. Register and login as system administrator
  const adminEmail = `${RandomGenerator.alphabets(8)}@enterprise-corp.com`;
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(3),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // 3. Simulate a valid resourceScheduleId
  const resourceScheduleId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve resource schedule detail
  const output =
    await api.functional.healthcarePlatform.systemAdmin.resourceSchedules.at(
      connection,
      {
        resourceScheduleId,
      },
    );
  typia.assert(output);

  // 5. Core assertions
  TestValidator.equals(
    "resourceScheduleId matches response.id",
    output.id,
    resourceScheduleId,
  );
  // Check that org id field is present and is string with UUID tag (should exist if backend links schedule to org)
  typia.assert<string & tags.Format<"uuid">>(
    output.healthcare_platform_organization_id,
  );
}
