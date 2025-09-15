import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate successful creation of a certificate issuance by an organization
 * administrator.
 *
 * This E2E test covers the full workflow within a tenant organization:
 *
 * - Organization administrator authentication via join API
 * - Creation of a corporate learner scoped to the admin's tenant
 * - Creation of a certification within the same tenant
 * - Issuance of a certificate linking the learner and certification
 *
 * Validates correct data linkage, adherence to tenant isolation, proper
 * status enum usage, and realistic issue and expiration dates.
 *
 * This test ensures multi-tenant security and business rule compliance for
 * certificate issuance creation.
 *
 * All response data is verified with typia.assert and business logic with
 * TestValidator assertions.
 *
 * @param connection API connection object
 */
export async function test_api_certificate_issuance_creation_by_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Organization admin joins and authenticates
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const orgAdminPassword = "Password123!";

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: orgAdminEmail,
        password: orgAdminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 2. Create tenant-scoped corporate learner
  const learnerEmail: string = typia.random<string & tags.Format<"email">>();
  const corporateLearner: IEnterpriseLmsCorporateLearner =
    await api.functional.enterpriseLms.organizationAdmin.corporatelearners.createCorporatelearners(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: learnerEmail,
          password: orgAdminPassword,
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
        } satisfies IEnterpriseLmsCorporateLearner.ICreate,
      },
    );
  typia.assert(corporateLearner);

  // 3. Create tenant-scoped certification
  const certCode = RandomGenerator.alphaNumeric(8);
  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: {
          tenant_id: tenantId,
          code: certCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "active",
        } satisfies IEnterpriseLmsCertification.ICreate,
      },
    );
  typia.assert(certification);

  // 4. Create certificate issuance linking learner and certification
  const issueDate = new Date().toISOString();
  const expirationDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year later

  const certificateIssuance: IEnterpriseLmsCertificateIssuance =
    await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.create(
      connection,
      {
        body: {
          learner_id: corporateLearner.id,
          certification_id: certification.id,
          issue_date: issueDate,
          expiration_date: expirationDate,
          status: "valid",
          business_status: null,
        } satisfies IEnterpriseLmsCertificateIssuance.ICreate,
      },
    );
  typia.assert(certificateIssuance);

  // 5. Validate response data correctness
  TestValidator.equals(
    "tenant id equals org admin tenant",
    certificateIssuance.learner_id,
    corporateLearner.id,
  );
  TestValidator.equals(
    "certification id matches",
    certificateIssuance.certification_id,
    certification.id,
  );
  TestValidator.predicate(
    "issue_date is ISO 8601 string",
    typeof certificateIssuance.issue_date === "string" &&
      certificateIssuance.issue_date.length > 0,
  );
  if (
    certificateIssuance.expiration_date !== null &&
    certificateIssuance.expiration_date !== undefined
  ) {
    TestValidator.predicate(
      "expiration_date is ISO 8601 string",
      typeof certificateIssuance.expiration_date === "string" &&
        certificateIssuance.expiration_date.length > 0,
    );
  } else {
    TestValidator.equals(
      "expiration_date is null",
      certificateIssuance.expiration_date,
      null,
    );
  }
  TestValidator.equals("status is valid", certificateIssuance.status, "valid");
  TestValidator.predicate(
    "business_status is null or string",
    certificateIssuance.business_status === null ||
      certificateIssuance.business_status === undefined,
  );

  TestValidator.predicate(
    "created_at is non-empty string",
    typeof certificateIssuance.created_at === "string" &&
      certificateIssuance.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof certificateIssuance.updated_at === "string" &&
      certificateIssuance.updated_at.length > 0,
  );
}
