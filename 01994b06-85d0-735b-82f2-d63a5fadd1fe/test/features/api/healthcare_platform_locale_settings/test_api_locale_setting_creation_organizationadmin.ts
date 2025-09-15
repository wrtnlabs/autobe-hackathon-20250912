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
 * Validates creation of locale settings by organization admin.
 *
 * 1. System admin creates an organization.
 * 2. Organization admin joins and logs in.
 * 3. Organization admin creates locale settings for own org (success).
 * 4. Organization admin tries to create setting for another org (should fail).
 * 5. Try to create duplicate setting for same org (should fail).
 * 6. Try as non-admins (should fail).
 */
export async function test_api_locale_setting_creation_organizationadmin(
  connection: api.IConnection,
) {
  // Step 1: System admin registers
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "Password1234!",
    },
  });
  typia.assert(sysAdmin);

  // Step 2: System admin creates org A and org B
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(orgA);

  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(orgB);

  // Step 3: Create org-admin user for orgA
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Password1234!",
      },
    },
  );
  typia.assert(orgAdmin);

  // Step 4: Org admin login (session refresh for safety)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Password1234!",
    },
  });

  // Step 5: Organization admin successfully creates locale settings for orgA
  const localeCreateBody = {
    healthcare_platform_organization_id: orgA.id,
    healthcare_platform_department_id: null,
    language: "en-US",
    timezone: "Asia/Seoul",
    date_format: "YYYY-MM-DD",
    time_format: "24h",
    number_format: "#,##0.00",
  } satisfies IHealthcarePlatformLocaleSettings.ICreate;

  const locale =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: localeCreateBody,
      },
    );
  typia.assert(locale);
  TestValidator.equals(
    "locale org linkage",
    locale.healthcare_platform_organization_id,
    orgA.id,
  );
  TestValidator.equals(
    "locale language",
    locale.language,
    localeCreateBody.language,
  );

  // Step 6: Org admin tries to create for orgB (should fail, permission error)
  await TestValidator.error(
    "org admin should not create settings for different org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
        connection,
        {
          body: {
            ...localeCreateBody,
            healthcare_platform_organization_id: orgB.id,
          },
        },
      );
    },
  );

  // Step 7: Try to create duplicate locale settings (should fail constraint)
  await TestValidator.error("duplicate locale settings", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: localeCreateBody,
      },
    );
  });

  // Step 8: Switch to system admin & try as system admin (should fail permission)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "Password1234!",
    },
  });
  await TestValidator.error(
    "system admin cannot use orgAdmin endpoint",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
        connection,
        {
          body: localeCreateBody,
        },
      );
    },
  );

  // Step 9: Try as unauthenticated (should fail)
  const unauth = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create locale settings",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
        unauth,
        {
          body: localeCreateBody,
        },
      );
    },
  );
}
