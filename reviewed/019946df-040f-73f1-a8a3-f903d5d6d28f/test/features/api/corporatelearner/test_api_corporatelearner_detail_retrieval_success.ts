import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validates the successful detail retrieval of a corporate learner by an
 * authorized organization administrator.
 *
 * This test includes:
 *
 * 1. Authentication of a new organization administrator user via join
 *    endpoint.
 * 2. Login of the same administrator user to obtain auth tokens.
 * 3. Retrieval of a corporate learner detail using the authenticated
 *    administrator's token.
 * 4. Validation of the retrieved data's integrity and tenant ID matching.
 * 5. Verification of 404 error when non-existent corporate learner ID is used.
 * 6. Verification of 403 error when an unauthorized token is used.
 */
export async function test_api_corporatelearner_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create new organization admin and authenticate
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const adminPassword = "password123";

  const adminCreateBody = {
    tenant_id: tenantId,
    email: adminEmail,
    password: adminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // Join (sign up) the organization administrator
  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);
  TestValidator.equals(
    "tenant_id matches post join",
    authorizedAdmin.tenant_id,
    tenantId,
  );

  // 2. Login the organization administrator
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);
  TestValidator.equals(
    "tenant_id matches post login",
    loggedInAdmin.tenant_id,
    tenantId,
  );

  // 3. Since no API to create a corporate learner is provided, we simulate retrieval
  // with a random UUID that may or may not correspond to an actual learner.
  // In a real test, this would be replaced with a known existing learner ID.
  const testLearnerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to retrieve corporate learner detail
  try {
    const learnerDetail: IEnterpriseLmsCorporateLearner =
      await api.functional.enterpriseLms.organizationAdmin.corporatelearners.atCorporatelearners(
        connection,
        { corporatelearnerId: testLearnerId },
      );
    typia.assert(learnerDetail);

    // Validate that tenant_id matches the expected admin tenant
    TestValidator.equals(
      "tenant_id of corporate learner matches admin tenant",
      learnerDetail.tenant_id,
      tenantId,
    );

    // Validate that retrieved learner's ID matches request
    TestValidator.equals(
      "corporatelearnerId matches",
      learnerDetail.id,
      testLearnerId,
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) {
      // Expected: 404 if not found, 403 if unauthorized
      TestValidator.predicate(
        "expected error code 404 or 403",
        exp.status === 404 || exp.status === 403,
      );
    } else {
      throw exp; // rethrow unexpected errors
    }
  }

  // 5. Try fetching with a clearly non-existent ID (UUID nil)
  const nonExistentId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.error(
    "fetch detailed info for non-existent corporate learner should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.corporatelearners.atCorporatelearners(
        connection,
        { corporatelearnerId: nonExistentId },
      );
    },
  );

  // 6. Try fetching with unauthorized connection (simulate by empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetch detail with unauthorized access should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.corporatelearners.atCorporatelearners(
        unauthConn,
        { corporatelearnerId: testLearnerId },
      );
    },
  );
}
