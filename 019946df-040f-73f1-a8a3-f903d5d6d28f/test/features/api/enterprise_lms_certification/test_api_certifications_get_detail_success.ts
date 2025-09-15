import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate retrieving detailed certification information for an authorized
 * organization admin.
 *
 * This test covers the full sequence:
 *
 * 1. Register an organization administrator with tenant ID and user details.
 * 2. Login as the organization admin to obtain authentication tokens.
 * 3. Create a certification record under the same tenant organization.
 * 4. Retrieve detailed certification info via certification ID.
 * 5. Confirm that retrieved data precisely matches the created certification,
 *    including id, tenant_id, code, name, status, description, timestamps,
 *    and deleted_at.
 *
 * All required fields and formats are respected as per DTO definitions.
 * Authentication tokens are automatically handled by the SDK.
 */
export async function test_api_certifications_get_detail_success(
  connection: api.IConnection,
) {
  // Tenant ID shared by organization admin and certification
  const tenantId = typia.random<string & tags.Format<"uuid">>();

  // Organization administrator creation payload
  const orgAdminCreateBody = {
    tenant_id: tenantId,
    email: `orgadmin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // 1. Register organization admin
  const orgAdminAuthorized = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminCreateBody,
    },
  );
  typia.assert(orgAdminAuthorized);

  // 2. Login organization admin
  const orgAdminLoginBody = {
    email: orgAdminCreateBody.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdminAuthorizedLogin =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminAuthorizedLogin);

  // 3. Create certification record
  const certCreateBody = {
    tenant_id: tenantId,
    code: `CERT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: `Certification ${RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 })}`,
    status: "active",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IEnterpriseLmsCertification.ICreate;

  const createdCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: certCreateBody,
      },
    );
  typia.assert(createdCertification);

  TestValidator.equals(
    "Certification tenant_id matches organization admin tenant_id",
    createdCertification.tenant_id,
    tenantId,
  );

  TestValidator.equals(
    "Certification status is active",
    createdCertification.status,
    "active",
  );

  // 4. Retrieve certification details
  const retrievedCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.atCertification(
      connection,
      {
        certificationId: createdCertification.id,
      },
    );
  typia.assert(retrievedCertification);

  // 5. Validate retrieved data matches created certification
  TestValidator.equals(
    "Retrieved certification ID matches created",
    retrievedCertification.id,
    createdCertification.id,
  );
  TestValidator.equals(
    "Retrieved certification tenant ID matches created",
    retrievedCertification.tenant_id,
    createdCertification.tenant_id,
  );
  TestValidator.equals(
    "Retrieved certification code matches created",
    retrievedCertification.code,
    createdCertification.code,
  );
  TestValidator.equals(
    "Retrieved certification name matches created",
    retrievedCertification.name,
    createdCertification.name,
  );
  TestValidator.equals(
    "Retrieved certification description matches created",
    retrievedCertification.description ?? null,
    createdCertification.description ?? null,
  );
  TestValidator.equals(
    "Retrieved certification status matches created",
    retrievedCertification.status,
    createdCertification.status,
  );
  TestValidator.equals(
    "Retrieved certification deleted_at matches created",
    retrievedCertification.deleted_at ?? null,
    createdCertification.deleted_at ?? null,
  );
}
