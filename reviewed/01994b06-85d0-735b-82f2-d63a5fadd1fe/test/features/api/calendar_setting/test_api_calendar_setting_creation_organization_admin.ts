import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate calendar setting creation by organization admin, including
 * success, duplicate, and RBAC scenarios.
 *
 * 1. Register new organization admin (join)
 * 2. Login with that admin
 * 3. Create new calendar setting (platform/organization/department context is
 *    nullable)
 * 4. Assert success and structure; validate fields
 * 5. Attempt duplicate creation; expect error
 * 6. Attempt calendar setting creation as unauthenticated user; expect error
 */
export async function test_api_calendar_setting_creation_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminPhone = RandomGenerator.mobile();
  const joinBody = {
    email: adminEmail,
    full_name: adminFullName,
    phone: adminPhone,
    password: adminPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "joined admin email matches input",
    admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "joined admin phone matches input",
    admin.phone,
    adminPhone,
  );

  // 2. Login as admin to set session/token
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);
  TestValidator.equals("login admin id matches join", loggedIn.id, admin.id);

  // 3. Create calendar setting
  const calendarSettingBody = {
    healthcare_platform_organization_id: null,
    healthcare_platform_department_id: null,
    language: RandomGenerator.pick([
      "en-US",
      "ko-KR",
      "es-ES",
      "fr-FR",
      "zh-CN",
      "ja-JP",
    ] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
    ] as const),
    date_format: RandomGenerator.pick([
      "YYYY-MM-DD",
      "MM/DD/YYYY",
      "DD/MM/YYYY",
    ] as const),
    time_format: RandomGenerator.pick(["24h", "12h"] as const),
    number_format: RandomGenerator.pick([
      "1,234.56",
      "1.234,56",
      "1 234,56",
    ] as const),
  } satisfies IHealthcarePlatformCalendarSetting.ICreate;
  const calendarSetting =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.create(
      connection,
      { body: calendarSettingBody },
    );
  typia.assert(calendarSetting);
  TestValidator.equals(
    "calendarSetting language matches input",
    calendarSetting.language,
    calendarSettingBody.language,
  );
  TestValidator.equals(
    "calendarSetting timezone matches input",
    calendarSetting.timezone,
    calendarSettingBody.timezone,
  );
  TestValidator.equals(
    "calendarSetting date_format matches input",
    calendarSetting.date_format,
    calendarSettingBody.date_format,
  );
  TestValidator.equals(
    "calendarSetting time_format matches input",
    calendarSetting.time_format,
    calendarSettingBody.time_format,
  );
  TestValidator.equals(
    "calendarSetting number_format matches input",
    calendarSetting.number_format,
    calendarSettingBody.number_format,
  );
  TestValidator.equals(
    "calendarSetting org_id matches input null",
    calendarSetting.healthcare_platform_organization_id,
    null,
  );
  TestValidator.equals(
    "calendarSetting dept_id matches input null",
    calendarSetting.healthcare_platform_department_id,
    null,
  );

  // 4. Attempt duplicate creation (expect error, no type error tests)
  await TestValidator.error(
    "duplicate calendar setting should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.create(
        connection,
        { body: calendarSettingBody },
      );
    },
  );

  // 5. RBAC: Unauthenticated user cannot create calendar settings
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated calendar setting creation should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.create(
        unauthConn,
        { body: calendarSettingBody },
      );
    },
  );
}
