import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test retrieval of a specific calendar setting detail by calendarSettingId as
 * an authenticated organization admin.
 *
 * - Registers two organization admins (adminA/orgA and adminB/orgB).
 * - Authenticates and creates a calendar setting with adminA.
 * - Fetches and validates the created calendar setting as adminA (success).
 * - Attempts to fetch with a random non-existent ID as adminA (error).
 * - Attempts to fetch adminA's calendar setting while authenticated as adminB
 *   (error).
 * - Validates correct structure, field values, RBAC enforcement, and error
 *   handling on each path.
 */
export async function test_api_calendar_setting_detail_view_organization_admin(
  connection: api.IConnection,
) {
  // Register and login as adminA (orgA)
  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: emailA,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: "SeCrEtP@ssw0rd",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminA);

  // Create calendar setting as adminA
  const calendarSettingCreate = {
    healthcare_platform_organization_id: null,
    healthcare_platform_department_id: null,
    language: "en-US",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: RandomGenerator.pick(["12h", "24h"] as const),
    number_format: RandomGenerator.pick(["1,234.56", "1.234,56"] as const),
  } satisfies IHealthcarePlatformCalendarSetting.ICreate;
  const calendarSetting =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.create(
      connection,
      { body: calendarSettingCreate },
    );
  typia.assert(calendarSetting);
  const calendarSettingId = calendarSetting.id;

  // Successful fetch by adminA (should succeed and match structure)
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.at(
      connection,
      { calendarSettingId },
    );
  typia.assert(detail);
  TestValidator.equals(
    "calendar setting id matches",
    detail.id,
    calendarSettingId,
  );
  TestValidator.equals("calendar setting matches DTO", detail, calendarSetting);

  // Non-existent id fetch by adminA (should fail)
  await TestValidator.error(
    "fetching non-existent calendarSettingId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.at(
        connection,
        { calendarSettingId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // Register and login as adminB (orgB)
  const emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: emailB,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: "AnotherP@ssw0rd",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminB);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailB,
      password: "AnotherP@ssw0rd",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Try to fetch adminA's setting as adminB (should fail due to RBAC)
  await TestValidator.error(
    "RBAC: other org admin cannot access this calendar setting",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.at(
        connection,
        { calendarSettingId },
      );
    },
  );
}
