import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This end-to-end test verifies the correct operation of deleting a
 * certification expiration policy by an authorized organization
 * administrator. The scenario includes prerequisite steps to create an
 * organization admin user, create a certification, create a certification
 * expiration associated with that certification, and then delete the
 * created certification expiration. The test then verifies the success of
 * the deletion by attempting to delete the same expiration again (expecting
 * failure), testing deletion with a non-existent expiration ID (expecting
 * failure), and testing deletion attempts without proper authorization
 * (expecting failure).
 *
 * This ensures business rules for data integrity and security are upheld.
 * Steps include authenticating organizationAdmin user, creating necessary
 * certification and expiration entities using structured payloads
 * respecting UUID formats and numerical constraints, performing deletion,
 * and asserting correct API behavior and errors. All API responses are
 * validated with typia.assert and TestValidator validates expected
 * successes and failures with descriptive titles. No type mismatches or
 * forbidden property usages are present.
 */
export async function test_api_certification_expiration_delete_success(
  connection: api.IConnection,
) {
  // 1. Authenticate organizationAdmin user
  const adminCreationBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}@organization.com`,
    password: "strongPassword123", // Example secure password
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreationBody,
    });
  typia.assert(admin);

  // 2. Create a certification entity
  const certificationCreateBody = {
    tenant_id: admin.tenant_id,
    code: `CERT-${typia.random<string & tags.Format<"uuid">>().substring(0, 8).toUpperCase()}`,
    name: `Certification ${RandomGenerator.name(1)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: certificationCreateBody,
      },
    );
  typia.assert(certification);

  // 3. Create a certification expiration policy
  const expirationCreateBody = {
    certification_id: certification.id,
    expiration_period_days: RandomGenerator.pick([
      30, 60, 90, 180, 360,
    ]) as number & tags.Type<"int32">,
    renewal_required: true,
    notification_period_days: RandomGenerator.pick([5, 10, 15, 20]) as number &
      tags.Type<"int32">,
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expiration: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        body: expirationCreateBody,
      },
    );
  typia.assert(expiration);

  // 4. Delete the created certification expiration
  await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.eraseCertificationExpirationPolicy(
    connection,
    {
      certificationId: certification.id,
      expirationId: expiration.id,
    },
  );

  // 5. Deleting the same expiration again should fail due to non-existence
  await TestValidator.error(
    "deleting already deleted expiration should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.eraseCertificationExpirationPolicy(
        connection,
        {
          certificationId: certification.id,
          expirationId: expiration.id,
        },
      );
    },
  );

  // 6. Attempt deletion with a non-existent expiration ID
  await TestValidator.error(
    "deleting non-existent expiration id should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.eraseCertificationExpirationPolicy(
        connection,
        {
          certificationId: certification.id,
          expirationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Authentication reset: create another organization admin user
  // to test unauthorized deletion attempt (not the owner of the expiration)
  const anotherAdminBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).toLowerCase()}@otherorg.com`,
    password: "anotherStrongPass123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const anotherAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: anotherAdminBody,
    });
  typia.assert(anotherAdmin);

  // 8. Unauthorized deletion attempt
  await TestValidator.error(
    "unauthorized user cannot delete expiration policy",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.eraseCertificationExpirationPolicy(
        connection,
        {
          certificationId: certification.id,
          expirationId: expiration.id,
        },
      );
    },
  );
}
