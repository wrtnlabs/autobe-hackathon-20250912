import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificateIssuance";

/**
 * Test the deletion success of certificate issuance resource by organization
 * admin.
 *
 * There are several steps:
 *
 * - Organization admin joins and authenticates
 * - Search for existing certificate issuance owned by the tenant
 * - Create certificate issuance if none found
 * - Delete the certificate issuance
 * - Confirm deletion by expecting no issuance in subsequent search
 * - Check unauthorized user cannot delete it
 */
export async function test_api_organization_admin_certificate_issuance_deletion_success(
  connection: api.IConnection,
) {
  // 1. Organization admin sign up
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const adminCreate = {
    tenant_id: tenantId,
    email: `admin-${RandomGenerator.alphaNumeric(8)}@enterprise.com`,
    password: "TestPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Search for certificate issuance records
  const searchRequest = {} satisfies IEnterpriseLmsCertificateIssuance.IRequest;

  const searchResult: IPageIEnterpriseLmsCertificateIssuance.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.searchCertificateIssuances(
      connection,
      { body: searchRequest },
    );
  typia.assert(searchResult);

  // Pick an issuance to delete or null
  let issuance: IEnterpriseLmsCertificateIssuance | null = null;
  if (searchResult.data.length > 0) {
    issuance = searchResult.data[0] as IEnterpriseLmsCertificateIssuance;
  }

  // 3. Create issuance if none exists
  if (!issuance) {
    const issuanceCreate = {
      learner_id: typia.random<string & tags.Format<"uuid">>(),
      certification_id: typia.random<string & tags.Format<"uuid">>(),
      issue_date: new Date().toISOString(),
      expiration_date: null,
      status: "valid" as const,
      business_status: null,
    } satisfies IEnterpriseLmsCertificateIssuance.ICreate;

    issuance =
      await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.create(
        connection,
        { body: issuanceCreate },
      );
    typia.assert(issuance);
  }

  // 4. Delete the issuance
  await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.erase(
    connection,
    { id: issuance.id },
  );

  // 5. Confirm deletion by searching and ensure issuance is gone
  const postDeleteSearch: IPageIEnterpriseLmsCertificateIssuance.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.searchCertificateIssuances(
      connection,
      { body: searchRequest },
    );
  typia.assert(postDeleteSearch);

  TestValidator.predicate(
    "deleted issuance should not be present",
    !postDeleteSearch.data.some((item) => item.id === issuance!.id),
  );

  // 6. Unauthorized deletion attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot delete issuance",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certificateIssuances.erase(
        unauthConnection,
        { id: issuance!.id },
      );
    },
  );
}
