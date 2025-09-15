import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLocaleSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLocaleSettings";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin's locale settings retrieval and access control.
 *
 * Test Outline:
 *
 * 1. Register org admin for orgA (and set context)
 * 2. Register org admin for orgB (and set context)
 * 3. As orgA admin, create an org-level locale setting for orgA
 * 4. As orgA admin, create a department-level locale setting under orgA
 * 5. As orgB admin, create an org-level locale setting for orgB
 * 6. As orgA admin, attempt to retrieve: a) own org-level locale setting (should
 *    succeed) b) own department-level locale setting (should succeed) c) orgB's
 *    locale setting (should fail/forbidden or not-found)
 * 7. As orgB admin, attempt to retrieve orgA's locale setting (should
 *    fail/forbidden)
 * 8. Attempt to retrieve a non-existent setting ID (should error)
 * 9. Attempt to fetch as unauthenticated user (should error)
 */
export async function test_api_locale_setting_organizationadmin_retrieve(
  connection: api.IConnection,
) {
  // 1. Register orgA admin
  const orgA_admin_email = typia.random<string & tags.Format<"email">>();
  const orgA_admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgA_admin_email,
        full_name: RandomGenerator.name(),
        password: "password123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgA_admin);
  const orgA_org_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Register orgB admin
  const orgB_admin_email = typia.random<string & tags.Format<"email">>();
  const orgB_admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgB_admin_email,
        full_name: RandomGenerator.name(),
        password: "password123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgB_admin);
  const orgB_org_id = typia.random<string & tags.Format<"uuid">>();

  // Always use orgA admin for orgA settings
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgA_admin_email,
      full_name: RandomGenerator.name(),
      password: "password123",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });

  // 3. orgA admin creates org-level locale
  const orgA_locale: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgA_org_id,
          language: "en-US",
          timezone: "Asia/Seoul",
          date_format: "YYYY-MM-DD",
          time_format: "24h",
          number_format: "1,234.56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(orgA_locale);

  // 4. orgA admin creates dept-level locale
  const orgA_dept_id = typia.random<string & tags.Format<"uuid">>();
  const orgA_dept_locale: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgA_org_id,
          healthcare_platform_department_id: orgA_dept_id,
          language: "ko-KR",
          timezone: "Asia/Seoul",
          date_format: "YYYY.MM.DD",
          time_format: "12h",
          number_format: "1.234,56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(orgA_dept_locale);

  // 5. orgB admin creates org-level locale
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgB_admin_email,
      full_name: RandomGenerator.name(),
      password: "password123",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });

  const orgB_locale: IHealthcarePlatformLocaleSettings =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgB_org_id,
          language: "fr-FR",
          timezone: "Europe/Paris",
          date_format: "DD/MM/YYYY",
          time_format: "24h",
          number_format: "1 234,56",
        } satisfies IHealthcarePlatformLocaleSettings.ICreate,
      },
    );
  typia.assert(orgB_locale);

  // 6. orgA admin retrieves own org-level locale
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgA_admin_email,
      full_name: RandomGenerator.name(),
      password: "password123",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });

  const fetched_orgA_locale =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
      connection,
      {
        localeSettingId: orgA_locale.id,
      },
    );
  typia.assert(fetched_orgA_locale);
  TestValidator.equals(
    "org admin can retrieve own org locale",
    fetched_orgA_locale,
    orgA_locale,
  );

  // 6b. orgA admin retrieves dept-level
  const fetched_orgA_dept_locale =
    await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
      connection,
      {
        localeSettingId: orgA_dept_locale.id,
      },
    );
  typia.assert(fetched_orgA_dept_locale);
  TestValidator.equals(
    "org admin can retrieve own dept locale",
    fetched_orgA_dept_locale,
    orgA_dept_locale,
  );

  // 6c. orgA admin attempts to access orgB's setting (should fail)
  await TestValidator.error(
    "org admin cannot fetch other org locale",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
        connection,
        {
          localeSettingId: orgB_locale.id,
        },
      );
    },
  );

  // 7. Switch to orgB admin and try to fetch orgA's setting
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgB_admin_email,
      full_name: RandomGenerator.name(),
      password: "password123",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await TestValidator.error(
    "cannot fetch locale setting outside own org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
        connection,
        {
          localeSettingId: orgA_locale.id,
        },
      );
    },
  );

  // 8. Not-found (random nonexistent UUID)
  const notFoundId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "404 not found for nonexistent localeSettingId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
        connection,
        {
          localeSettingId: notFoundId,
        },
      );
    },
  );

  // 9. Unauthenticated request
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch locale settings",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.localeSettings.at(
        unauthConn,
        {
          localeSettingId: orgA_locale.id,
        },
      );
    },
  );
}
