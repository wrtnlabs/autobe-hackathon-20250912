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

export async function test_api_certification_deletion_with_expirations(
  connection: api.IConnection,
) {
  // 1. SystemAdmin join
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = "SysAdminPass123!";
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password_hash: sysAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin login
  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysAdminEmail,
        password_hash: sysAdminPassword,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(systemAdminLogin);

  // 3. Create tenant by systemAdmin
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: `Tenant for ${RandomGenerator.name(1)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 4. OrganizationAdmin join with actual tenant_id
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdminPass123!";
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant.id,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 5. OrganizationAdmin login
  const organizationAdminLogin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(organizationAdminLogin);

  // 6. Create certification by OrganizationAdmin
  const certificationBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(5),
    name: `Certification ${RandomGenerator.name(1)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      { body: certificationBody },
    );
  typia.assert(certification);

  // 7. Create certification expiration policy linked to the certification
  const expirationBody = {
    certification_id: certification.id,
    expiration_period_days: 365,
    renewal_required: true,
    notification_period_days: 30,
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        body: expirationBody,
      },
    );
  typia.assert(expiration);

  // 8. Delete the certification
  await api.functional.enterpriseLms.organizationAdmin.certifications.erase(
    connection,
    { certificationId: certification.id },
  );

  // 9. Attempt to delete the same certification again and expect error
  await TestValidator.error(
    "error when deleting already deleted certification",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.erase(
        connection,
        { certificationId: certification.id },
      );
    },
  );

  // 10. Attempt to delete a non-existent certification - random UUID
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error when deleting non-existent certification",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.erase(
        connection,
        { certificationId: randomUUID },
      );
    },
  );
}
