import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test scenario that validates the successful retrieval of a specific
 * certificate issuance record by an authorized system administrator.
 *
 * This comprehensive test covers the following steps:
 *
 * 1. Create and authenticate a system administrator using systemAdmin join
 *    API.
 * 2. Create and authenticate an organization administrator using
 *    organizationAdmin join API.
 * 3. Create a tenant-specific corporate learner with the organization
 *    administrator.
 * 4. Create a certification record under the same tenant using the
 *    organization administrator.
 * 5. Switch back to system administrator authentication context.
 * 6. Create a certificate issuance record linking the previously created
 *    learner and certification.
 * 7. Attempt to fetch the certificate issuance record by its ID and verify all
 *    properties match the created record exactly.
 * 8. Attempt to fetch a non-existent certificate issuance ID and confirm the
 *    API returns a 404 error.
 *
 * This test thoroughly verifies authorization, multi-role switching, data
 * creation integrity, and error handling ensuring compliance with business
 * rules around certificate issuance management.
 *
 * Steps are commented throughout for clarity and verification.
 */
export async function test_api_certificate_issuance_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a system administrator
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@sysadmin.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // Step 2: Register and authenticate an organization administrator
  const orgAdminCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    email: RandomGenerator.alphaNumeric(8) + "@orgadmin.com",
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // Step 3: Authenticate as organization administrator
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCreateBody.email,
      password: orgAdminCreateBody.password,
    } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
  });

  // Step 4: Create a corporate learner with organization admin
  const corporateLearnerCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    email: RandomGenerator.alphaNumeric(8) + "@learner.com",
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corporateLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: corporateLearnerCreateBody,
      },
    );
  typia.assert(corporateLearner);

  // Step 5: Create a certification with organization admin
  const certificationCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  // Step 6: Authenticate as system administrator again
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminCreateBody.email,
      password_hash: systemAdminCreateBody.password_hash,
    } satisfies IEnterpriseLmsSystemAdmin.ILogin,
  });

  // Step 7: Create a certificate issuance record with system admin
  const issueDateISOString = new Date().toISOString();
  const expirationDateISOString = new Date(
    Date.now() + 31536000000,
  ).toISOString(); // +1 year
  const certificateIssuanceCreateBody = {
    learner_id: corporateLearner.id,
    certification_id: certification.id,
    issue_date: issueDateISOString,
    expiration_date: expirationDateISOString,
    status: "valid",
    business_status: null,
  } satisfies IEnterpriseLmsCertificateIssuance.ICreate;
  const certificateIssuance: IEnterpriseLmsCertificateIssuance =
    await api.functional.enterpriseLms.systemAdmin.certificateIssuances.create(
      connection,
      {
        body: certificateIssuanceCreateBody,
      },
    );
  typia.assert(certificateIssuance);

  // Step 8: Retrieve the certificate issuance by ID and verify
  const retrieved: IEnterpriseLmsCertificateIssuance =
    await api.functional.enterpriseLms.systemAdmin.certificateIssuances.at(
      connection,
      { id: certificateIssuance.id },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "certificate issuance id matches",
    certificateIssuance.id,
    retrieved.id,
  );
  TestValidator.equals(
    "learner id matches",
    certificateIssuance.learner_id,
    retrieved.learner_id,
  );
  TestValidator.equals(
    "certification id matches",
    certificateIssuance.certification_id,
    retrieved.certification_id,
  );
  TestValidator.equals(
    "issue date matches",
    certificateIssuance.issue_date,
    retrieved.issue_date,
  );
  TestValidator.equals(
    "expiration date matches",
    certificateIssuance.expiration_date,
    retrieved.expiration_date,
  );
  TestValidator.equals(
    "status matches",
    certificateIssuance.status,
    retrieved.status,
  );
  TestValidator.equals(
    "business status matches",
    certificateIssuance.business_status,
    retrieved.business_status,
  );
  TestValidator.equals(
    "created at matches",
    certificateIssuance.created_at,
    retrieved.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    certificateIssuance.updated_at,
    retrieved.updated_at,
  );

  // Step 9: Attempt to retrieve non-existent certificate issuance ID and expect 404 error
  await TestValidator.error(
    "retrieving non-existent certificate issuance should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.certificateIssuances.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
