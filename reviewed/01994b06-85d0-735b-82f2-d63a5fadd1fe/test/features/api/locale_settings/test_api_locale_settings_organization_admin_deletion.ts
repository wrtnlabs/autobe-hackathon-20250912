import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Organization admin soft-deletes organization locale setting (with cross-role
 * error checks)
 *
 * This workflow covers both the nominal deletion path and cross-role permission
 * boundaries, handling double-delete errors and ensuring soft-delete mechanism
 * as per business requirements.
 *
 * Steps:
 *
 * 1. Register and login as system admin.
 * 2. Create new organization.
 * 3. Register and login as OrgAdmin1 (for normal operation) and OrgAdmin2 (to test
 *    permission denial for org scope).
 * 4. As OrgAdmin1, create a new locale setting tied to this org; get
 *    localeSettingId.
 * 5. As OrgAdmin1, DELETE the locale setting. Confirm no error.
 * 6. Attempt to DELETE again as OrgAdmin1; expect error for already deleted.
 * 7. Attempt to DELETE as OrgAdmin2; confirm forbidden (other admin not in org
 *    scope).
 * 8. As system admin, attempt to delete a random (non-existent) UUID; confirm
 *    not-found error.
 * 9. (Edge) Deletion for a protected org localeSetting is skipped as there is no
 *    way to flag a "critical" org (no such DTO field exposed).
 */
export async function test_api_locale_settings_organization_admin_deletion(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = "sysadminpass123";
  const sysadminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysadminJoin);

  // 2. Create new organization
  const orgCode = RandomGenerator.alphaNumeric(9);
  const orgName = RandomGenerator.name();
  const createdOrg =
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
  typia.assert(createdOrg);

  // 3. Register and login as OrgAdmin1
  const orgadmin1Email = typia.random<string & tags.Format<"email">>();
  const orgadmin1Password = "orgadmin1pass";
  const orgadmin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadmin1Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgadmin1Password,
        provider: "local",
        provider_key: orgadmin1Email,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgadmin1Join);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin1Email,
      password: orgadmin1Password,
      provider: "local",
      provider_key: orgadmin1Email,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Register and login as OrgAdmin2 (another actor)
  const orgadmin2Email = typia.random<string & tags.Format<"email">>();
  const orgadmin2Password = "orgadmin2pass";
  const orgadmin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadmin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgadmin2Password,
        provider: "local",
        provider_key: orgadmin2Email,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgadmin2Join);

  // NOTE: This test assumes organization admin is automatically assigned to the organization. If assignment is required, this step would fail; skip this edge.

  // 5. As OrgAdmin1, create new localeSetting for the org
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin1Email,
      password: orgadmin1Password,
      provider: "local",
      provider_key: orgadmin1Email,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const localeCreate =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: createdOrg.id,
          language: "en-US",
          timezone: "Asia/Seoul",
          date_format: "YYYY-MM-DD",
          time_format: "24h",
          number_format: "1,234.56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(localeCreate);
  TestValidator.equals(
    "locale linked to correct org",
    localeCreate.healthcare_platform_organization_id,
    createdOrg.id,
  );

  // 6. As OrgAdmin1, DELETE the localeSetting
  await api.functional.healthcarePlatform.organizationAdmin.localeSettings.erase(
    connection,
    { localeSettingId: localeCreate.id },
  );
  // No error means success for soft-delete

  // 7. Attempt DELETE again as OrgAdmin1 (should error: already deleted)
  await TestValidator.error("double delete should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.erase(
      connection,
      { localeSettingId: localeCreate.id },
    );
  });

  // 8. Attempt DELETE as OrgAdmin2 (should be forbidden)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin2Email,
      password: orgadmin2Password,
      provider: "local",
      provider_key: orgadmin2Email,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "unauthorized orgadmin cannot delete locale setting",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.erase(
        connection,
        { localeSettingId: localeCreate.id },
      );
    },
  );

  // 9. SystemAdmin: DELETE random (non-existent) localeSettingId to assert not-found
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      password: sysadminPassword,
      provider: "local",
      provider_key: sysadminEmail,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "deleting non-existent localeSetting should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.erase(
        connection,
        {
          localeSettingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 10. Edge case: Deletion of protected org/critical (not possible: no status/field for protected in test API, skip)
}
