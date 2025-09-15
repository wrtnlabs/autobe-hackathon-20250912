import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for system admin lab integration detail access, including
 * privilege enforcement:
 *
 * 1. Register a unique system admin using random business email and valid
 *    provider values.
 * 2. Login as system admin with same email, provider, provider_key, and
 *    password if local.
 * 3. Register a unique organization admin (random business email, password,
 *    name).
 * 4. Login as organization admin.
 * 5. Org admin creates a new lab integration supplying all required fields
 *    (org id from admin, random vendor, connection_uri, supported format,
 *    status).
 * 6. Switch to system admin account (login again if necessary).
 * 7. System admin performs GET
 *    /healthcarePlatform/systemAdmin/labIntegrations/{labIntegrationId}
 *    using the id from created integration.
 * 8. Assert returned integration object matches expected org id and other
 *    fields.
 * 9. Attempt same GET as (a) unauthenticated (empty headers) and (b) as org
 *    admin role; expect both to throw.
 * 10. (Audit log check is skipped; no public API for it.)
 */
export async function test_api_lab_integration_detail_retrieval_by_systemadmin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail =
    RandomGenerator.name(1).replace(/ /g, "_") + "@business.com";
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminPass123",
    },
  });
  typia.assert(sysAdminJoin);

  // 2. Login as system admin (to assert login-sets context)
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "sysadminPass123",
      },
    },
  );
  typia.assert(sysAdminLogin);

  // 3. Register org admin
  const orgAdminEmail = RandomGenerator.name(1).replace(/ /g, "_") + "@org.com";
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "orgAdminPwd!",
      },
    },
  );
  typia.assert(orgAdminJoin);

  // 4. Login as org admin
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "orgAdminPwd!",
      },
    },
  );
  typia.assert(orgAdminLogin);

  // 5. Create lab integration as org admin
  const integrationCreateBody = {
    healthcare_platform_organization_id: orgAdminJoin.id,
    lab_vendor_code: RandomGenerator.alphaNumeric(6),
    connection_uri:
      "https://lab-" + RandomGenerator.alphaNumeric(8) + ".vendor/api",
    supported_message_format: RandomGenerator.pick([
      "HL7 V2",
      "FHIR R4",
      "C-CDA",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "disabled"] as const),
  } satisfies IHealthcarePlatformLabIntegration.ICreate;
  const createdIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      { body: integrationCreateBody },
    );
  typia.assert(createdIntegration);

  // 6. System admin authenticates again (should not be needed, but to clarify context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysadminPass123",
    },
  });

  // 7. System admin retrieves integration detail by id
  const got =
    await api.functional.healthcarePlatform.systemAdmin.labIntegrations.at(
      connection,
      {
        labIntegrationId: createdIntegration.id,
      },
    );
  typia.assert(got);
  TestValidator.equals("integration id matches", got.id, createdIntegration.id);
  TestValidator.equals(
    "org id matches",
    got.healthcare_platform_organization_id,
    createdIntegration.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "vendor code matches",
    got.lab_vendor_code,
    createdIntegration.lab_vendor_code,
  );
  TestValidator.equals(
    "connection uri matches",
    got.connection_uri,
    createdIntegration.connection_uri,
  );
  TestValidator.equals(
    "message format",
    got.supported_message_format,
    createdIntegration.supported_message_format,
  );
  TestValidator.equals("status", got.status, createdIntegration.status);

  // 8. Attempt GET as unauthenticated (empty headers), should error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin cannot GET integration detail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.labIntegrations.at(
        unauthConn,
        { labIntegrationId: createdIntegration.id },
      );
    },
  );

  // 9. Attempt GET as organization admin (should error, wrong role)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "orgAdminPwd!",
    },
  });
  await TestValidator.error(
    "organization admin cannot GET integration as system admin endpoint",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.labIntegrations.at(
        connection,
        { labIntegrationId: createdIntegration.id },
      );
    },
  );
}
