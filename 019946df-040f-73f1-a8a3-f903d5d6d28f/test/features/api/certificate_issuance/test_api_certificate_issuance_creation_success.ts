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
 * This test creates a certificate issuance record by a system
 * administrator.
 *
 * It first registers and logs in as systemAdmin and organizationAdmin
 * users, since those multiple actors are required by the test scenario.
 *
 * Then, it creates a corporate learner and a certification within the
 * tenant context under organizationAdmin
 *
 * After these dependencies are created, the test switches to systemAdmin
 * user and creates the certificate issuance record linking the learner and
 * certification, setting issue date, status and optionally expiration date
 * and business status.
 *
 * Finally, the test validates the created certificate issuance record
 * properties including IDs, timestamps, and status fields.
 */
export async function test_api_certificate_issuance_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register systemAdmin account
  const systemAdminEmail = `${RandomGenerator.alphaNumeric(8)}@enterprise.com`;
  const systemAdminCreateBody = {
    email: systemAdminEmail,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminCreateBody,
  });
  typia.assert(systemAdmin);

  // Step 2: Login as systemAdmin
  const systemAdminLoginBody = {
    email: systemAdminEmail,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminAuthorized = await api.functional.auth.systemAdmin.login(
    connection,
    { body: systemAdminLoginBody },
  );
  typia.assert(systemAdminAuthorized);

  // Step 3: Register organizationAdmin account
  const organizationAdminEmail = `${RandomGenerator.alphaNumeric(8)}@enterprise.com`;
  const organizationAdminCreateBody = {
    tenant_id: systemAdminAuthorized.tenant_id,
    email: organizationAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const organizationAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: organizationAdminCreateBody },
  );
  typia.assert(organizationAdmin);

  // Step 4: Login as organizationAdmin
  const organizationAdminLoginBody = {
    email: organizationAdminEmail,
    password: organizationAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const organizationAdminAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: organizationAdminLoginBody,
    });
  typia.assert(organizationAdminAuthorized);

  // Step 5: Create corporate learner as organizationAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: organizationAdminLoginBody,
  });

  const corporateLearnerCreateBody = {
    tenant_id: organizationAdminAuthorized.tenant_id,
    email: `${RandomGenerator.alphaNumeric(8)}@learner.com`,
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;
  const corporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      { body: corporateLearnerCreateBody },
    );
  typia.assert(corporateLearner);

  // Step 6: Create certification as organizationAdmin
  const certificationCreateBody = {
    tenant_id: organizationAdminAuthorized.tenant_id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;
  const certification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      { body: certificationCreateBody },
    );
  typia.assert(certification);

  // Step 7: Switch back to systemAdmin to create certificate issuance
  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });

  // Prepare data for new certificate issuance
  const issueDate: string = new Date().toISOString();
  const expirationDate: string | null = new Date(
    Date.now() + 31536000000,
  ).toISOString(); // 1 year later
  const createCertificateIssuanceBody = {
    learner_id: corporateLearner.id,
    certification_id: certification.id,
    issue_date: issueDate,
    expiration_date: expirationDate,
    status: "valid",
    business_status: "active",
  } satisfies IEnterpriseLmsCertificateIssuance.ICreate;

  const certificateIssuance =
    await api.functional.enterpriseLms.systemAdmin.certificateIssuances.create(
      connection,
      { body: createCertificateIssuanceBody },
    );
  typia.assert(certificateIssuance);

  // Step 8: Validate certificate issuance properties
  TestValidator.equals(
    "certificateIssuance.learner_id",
    certificateIssuance.learner_id,
    corporateLearner.id,
  );
  TestValidator.equals(
    "certificateIssuance.certification_id",
    certificateIssuance.certification_id,
    certification.id,
  );
  TestValidator.equals(
    "certificateIssuance.status",
    certificateIssuance.status,
    "valid",
  );
  TestValidator.equals(
    "certificateIssuance.business_status",
    certificateIssuance.business_status,
    "active",
  );
  TestValidator.equals(
    "certificateIssuance.issue_date",
    certificateIssuance.issue_date,
    issueDate,
  );
  TestValidator.equals(
    "certificateIssuance.expiration_date",
    certificateIssuance.expiration_date,
    expirationDate,
  );
  TestValidator.predicate(
    "certificateIssuance.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      certificateIssuance.id,
    ),
  );
  TestValidator.predicate(
    "certificateIssuance.created_at is ISO 8601 datetime",
    !isNaN(Date.parse(certificateIssuance.created_at)),
  );
  TestValidator.predicate(
    "certificateIssuance.updated_at is ISO 8601 datetime",
    !isNaN(Date.parse(certificateIssuance.updated_at)),
  );
}
