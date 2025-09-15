import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_certifications_creation_with_tenant_context(
  connection: api.IConnection,
) {
  // 1. Organization Admin user sign up
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const passwordPlain = "validPassword123";

  const adminCreateData = {
    tenant_id: tenantId,
    email: `admin.${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: passwordPlain,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(organizationAdminAuthorized);
  TestValidator.equals(
    "tenant_id matches in admin join",
    organizationAdminAuthorized.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "email matches in admin join",
    organizationAdminAuthorized.email,
    adminCreateData.email,
  );

  // 2. Organization Admin user login
  const loginData = {
    email: adminCreateData.email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const organizationAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginData,
    });
  typia.assert(organizationAdminLoggedIn);
  TestValidator.equals(
    "tenant_id matches in admin login",
    organizationAdminLoggedIn.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "email matches in admin login",
    organizationAdminLoggedIn.email,
    adminCreateData.email,
  );

  // 3. Create Certification within tenant context by authenticated admin
  const certificationCreateData = {
    tenant_id: tenantId,
    code: `CERT-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: certificationCreateData,
      },
    );
  typia.assert(certification);

  // 4. Validate returned certification matches input data logically
  TestValidator.equals(
    "tenant_id matches",
    certification.tenant_id,
    certificationCreateData.tenant_id,
  );

  TestValidator.equals(
    "code matches",
    certification.code,
    certificationCreateData.code,
  );
  TestValidator.equals(
    "name matches",
    certification.name,
    certificationCreateData.name,
  );
  TestValidator.equals(
    "status matches",
    certification.status,
    certificationCreateData.status,
  );

  // Validate ID has correct UUID format
  typia.assert<string & tags.Format<"uuid">>(certification.id);

  // Timestamps validation is covered by typia.assert
}
