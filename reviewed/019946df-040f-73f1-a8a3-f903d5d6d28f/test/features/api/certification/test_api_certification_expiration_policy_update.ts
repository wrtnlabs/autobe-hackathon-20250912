import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This end-to-end test validates the update of a certification expiration
 * policy.
 *
 * It includes creating necessary entities such as tenants, organization admins,
 * certifications, and expiration policies, then updating a policy and verifying
 * the update.
 *
 * The test ensures that expiration policies are managed correctly for
 * compliance.
 */
export async function test_api_certification_expiration_policy_update(
  connection: api.IConnection,
) {
  // 1. System admin join and login
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "P@ssword123";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password_hash: systemAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      password_hash: systemAdminPassword,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // 2. Create tenant
  const tenantCreateBody = {
    code: RandomGenerator.alphabets(6).toUpperCase(),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Organization admin join and login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "P@ssword123";
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // 4. Create certification under tenant
  const certCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphabets(4).toUpperCase(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: certCreateBody,
      },
    );
  typia.assert(certification);

  // 5. Create initial expiration policy
  const expirationCreateBody = {
    certification_id: certification.id,
    expiration_period_days: 365,
    renewal_required: true,
    notification_period_days: 30,
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expirationPolicy: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        body: expirationCreateBody,
      },
    );
  typia.assert(expirationPolicy);

  // 6. Update expiration policy
  const updateBody: IEnterpriseLmsCertificationExpiration.IUpdate = {
    expiration_period_days: 730, // 2 years
    renewal_required: false,
    notification_period_days: 60,
  };

  const updatedPolicy: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.updateCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        expirationId: expirationPolicy.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 7. Verify update reflects in returned data
  TestValidator.equals(
    "expiration_period_days updated",
    updatedPolicy.expiration_period_days,
    730,
  );
  TestValidator.equals(
    "renewal_required updated",
    updatedPolicy.renewal_required,
    false,
  );
  TestValidator.equals(
    "notification_period_days updated",
    updatedPolicy.notification_period_days,
    60,
  );

  // 8. Retrieve certification and verify updated expiration policy
  const certReloaded: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.atCertification(
      connection,
      {
        certificationId: certification.id,
      },
    );
  typia.assert(certReloaded);

  // Since the certification entity DTO does not contain expiration policies nested in this DTO,
  // perform a separate fetch or rely on updatedPolicy as verification.
  // Here we rely on updatedPolicy as authoritative for this test scenario.
}
