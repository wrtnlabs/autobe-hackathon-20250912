import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertification";

/**
 * This E2E test validates the retrieval of detailed certification
 * expiration policy information via the authorized organization admin role
 * in the enterprise LMS system.
 *
 * The test proceeds as follows:
 *
 * 1. Organization admin user registration and authentication by calling the
 *    join API with required tenant_id, email, password, first_name, and
 *    last_name. Validates successful authorization.
 * 2. Search for existing certifications via the certified search API endpoint
 *    with an empty search filter.
 * 3. Select an existing certification from the search results or if none
 *    exists, throw a meaningful error.
 * 4. Create a new certification expiration policy associated with the selected
 *    certification, specifying expiration period days, renewal flag, and
 *    notification period days.
 * 5. Retrieve detailed certification expiration policy using the
 *    certificationId and expirationId.
 * 6. Validate that all returned details match the created expiration policy
 *    values exactly.
 * 7. Test unauthorized access by attempting to retrieve the expiration detail
 *    without authorization and expect an HTTP error.
 * 8. Test error handling by retrieving expiration details with non-existent
 *    certificationId and expirationId, and verify HTTP error is thrown.
 *
 * All responses are asserted using typia.assert to ensure type correctness.
 * All API calls use awaited syntax. All TestValidator assertions include
 * descriptive titles. No manual header manipulation; token handling is
 * automatic via SDK.
 */
export async function test_api_certification_expiration_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Organization admin joins and authenticates
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password: "SecurePa$$123",
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Search existing certifications
  const searchRequest = {
    code: null,
    name: null,
    status: null,
    search: null,
    page: 1,
    limit: 10,
    orderBy: null,
  } satisfies IEnterpriseLmsCertification.IRequest;

  const searchResult: IPageIEnterpriseLmsCertification.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.certifications.searchCertifications(
      connection,
      { body: searchRequest },
    );
  typia.assert(searchResult);

  // 3. Select a certification
  TestValidator.predicate(
    "Search result has at least one certification",
    0 < searchResult.data.length,
  );

  const certification: IEnterpriseLmsCertification.ISummary =
    searchResult.data[0];

  // 4. Create certification expiration policy
  const createExpirationBody = {
    certification_id: certification.id,
    expiration_period_days: RandomGenerator.pick([30, 60, 90, 180, 365]),
    renewal_required: RandomGenerator.pick([true, false]),
    notification_period_days: RandomGenerator.pick([1, 7, 14, 30]),
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expirationPolicy: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      {
        certificationId: certification.id,
        body: createExpirationBody,
      },
    );
  typia.assert(expirationPolicy);

  // 5. Fetch detailed expiration information
  const expirationDetail: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.at(
      connection,
      {
        certificationId: certification.id,
        expirationId: expirationPolicy.id,
      },
    );
  typia.assert(expirationDetail);

  // 6. Validate returned details
  TestValidator.equals(
    "Expiration detail certification_id matches",
    expirationDetail.certification_id,
    createExpirationBody.certification_id,
  );
  TestValidator.equals(
    "Expiration detail expiration_period_days matches",
    expirationDetail.expiration_period_days,
    createExpirationBody.expiration_period_days,
  );
  TestValidator.equals(
    "Expiration detail renewal_required matches",
    expirationDetail.renewal_required,
    createExpirationBody.renewal_required,
  );
  TestValidator.equals(
    "Expiration detail notification_period_days matches",
    expirationDetail.notification_period_days,
    createExpirationBody.notification_period_days,
  );

  // 7. Unauthorized access should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized access raises HttpError",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.at(
        unauthenticatedConnection,
        {
          certificationId: certification.id,
          expirationId: expirationPolicy.id,
        },
      );
    },
  );

  // 8. Fetching non-existent IDs raises HttpError
  await TestValidator.error(
    "Fetching non-existent expiration detail raises HttpError",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.at(
        connection,
        {
          certificationId: typia.random<string & tags.Format<"uuid">>(),
          expirationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
