import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * End-to-end test that validates the successful update of a certification
 * expiration policy within the Enterprise LMS for an organization administrator
 * user.
 *
 * The test performs the following steps:
 *
 * 1. Authenticates an organization admin user with the needed permissions.
 * 2. Creates a new certification entity under the tenant.
 * 3. Creates a certification expiration policy linked to the created
 *    certification.
 * 4. Updates the expiration policy with new valid periods and requirements.
 * 5. Validates that the updated entity reflects the new values correctly.
 *
 * This test ensures authorization, tenant scoping, and data integrity are
 * respected. It does not cover negative paths such as unauthorized access or
 * invalid input tests. Each API response is validated with typia.assert(), and
 * business logic is verified with TestValidator.
 */
export async function test_api_certification_expiration_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: adminEmail,
        password: "Test1234Password!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Create a certification entity
  const certificationCreate = {
    tenant_id: tenantId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      { body: certificationCreate },
    );
  typia.assert(certification);
  TestValidator.equals(
    "certification tenant ids equal",
    certification.tenant_id,
    tenantId,
  );

  // 3. Create an expiration policy linked to the certification
  const expirationCreate = {
    certification_id: certification.id,
    expiration_period_days: typia.random<number & tags.Type<"int32">>(),
    renewal_required: RandomGenerator.pick([true, false] as const),
    notification_period_days: typia.random<number & tags.Type<"int32">>(),
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expiration: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        body: expirationCreate,
      },
    );
  typia.assert(expiration);
  TestValidator.equals(
    "expiration certificationId match",
    expiration.certification_id,
    certification.id,
  );

  // 4. Update the certification expiration policy with new valid values
  const updatedExpirationPeriod = expiration.expiration_period_days + 30;
  const updatedRenewalRequired = !expiration.renewal_required;
  const updatedNotificationPeriod = expiration.notification_period_days + 10;

  const expirationUpdate = {
    expiration_period_days: updatedExpirationPeriod,
    renewal_required: updatedRenewalRequired,
    notification_period_days: updatedNotificationPeriod,
  } satisfies IEnterpriseLmsCertificationExpiration.IUpdate;

  const updatedExpiration: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.updateCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        expirationId: expiration.id,
        body: expirationUpdate,
      },
    );
  typia.assert(updatedExpiration);

  // 5. Validate the update response and ensure values are correct
  TestValidator.equals(
    "expiration period days updated",
    updatedExpiration.expiration_period_days,
    updatedExpirationPeriod,
  );
  TestValidator.equals(
    "renewal required updated",
    updatedExpiration.renewal_required,
    updatedRenewalRequired,
  );
  TestValidator.equals(
    "notification period days updated",
    updatedExpiration.notification_period_days,
    updatedNotificationPeriod,
  );
  TestValidator.equals(
    "expiration id unchanged",
    updatedExpiration.id,
    expiration.id,
  );
  TestValidator.equals(
    "certification id unchanged",
    updatedExpiration.certification_id,
    certification.id,
  );
}
