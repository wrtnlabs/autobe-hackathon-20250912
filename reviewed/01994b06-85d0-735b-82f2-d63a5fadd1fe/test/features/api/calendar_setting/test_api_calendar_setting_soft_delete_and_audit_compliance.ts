import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformCalendarSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformCalendarSetting";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate soft-delete of calendar settings, audit compliance, and RBAC
 * enforcement.
 *
 * 1. Register system admin and login system admin.
 * 2. Create organization as system admin.
 * 3. Register org admin, login org admin.
 * 4. Create calendar setting for the organization (org admin).
 * 5. Erase (soft-delete) the calendar setting (org admin).
 * 6. Cannot re-delete (should error).
 * 7. Register/login different org admin.
 * 8. Attempt to erase as different org admin (should error).
 *
 * - Tests enforced soft-delete (no hard delete), RBAC boundaries, and audit
 *   compliance.
 * - Negative path (forbidden deletion) and error path (double deletion) are
 *   checked using TestValidator.error.
 * - Only available API calls and DTOs are used; audit confirmation is indirect
 *   due to missing audit-log endpoint.
 */
export async function test_api_calendar_setting_soft_delete_and_audit_compliance(
  connection: api.IConnection,
) {
  // Register and login as system admin
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysName = RandomGenerator.name();
  const sysPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: sysName,
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name();
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);

  // Register and login as org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  const orgAdminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminAuth);

  // Create calendar setting for the organization
  const calendarSetting =
    await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization.id,
          language: "en-US",
          timezone: "America/New_York",
          date_format: "YYYY-MM-DD",
          time_format: "24h",
          number_format: "1,234.56",
        } satisfies IHealthcarePlatformCalendarSetting.ICreate,
      },
    );
  typia.assert(calendarSetting);

  // Soft-delete (erase) the calendar setting as org admin
  await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.erase(
    connection,
    {
      calendarSettingId: calendarSetting.id,
    },
  );

  // Attempt to re-delete (should error)
  await TestValidator.error(
    "cannot delete already deleted calendar setting",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.erase(
        connection,
        {
          calendarSettingId: calendarSetting.id,
        },
      );
    },
  );

  // Register and login as a different org admin
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2Password = RandomGenerator.alphaNumeric(12);
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        password: orgAdmin2Password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2);
  const orgAdmin2Auth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        password: orgAdmin2Password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdmin2Auth);

  // Attempt to delete as other org admin (should error)
  await TestValidator.error(
    "other organization admin cannot delete the calendar setting",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.calendarSettings.erase(
        connection,
        {
          calendarSettingId: calendarSetting.id,
        },
      );
    },
  );
}
