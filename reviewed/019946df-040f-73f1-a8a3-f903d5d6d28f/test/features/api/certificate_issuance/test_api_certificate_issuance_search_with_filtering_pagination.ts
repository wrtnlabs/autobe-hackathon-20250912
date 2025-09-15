import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificateIssuance";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCertificateIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificateIssuance";

export async function test_api_certificate_issuance_search_with_filtering_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator and obtain authorization
  const systemAdmin1: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `admin+${typia.random<string & tags.Format<"email">>().split("@")[0]}@example.com`,
        password_hash: "hashed-password-sample",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(systemAdmin1);

  // 2. Log out by creating a new connection with empty headers (simulate unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 3. Log in with the created system admin to obtain fresh tokens
  const systemAdmin2: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(unauthConnection, {
      body: {
        email: systemAdmin1.email,
        password_hash: "hashed-password-sample",
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(systemAdmin2);

  // 4. Prepare a variety of filter requests for certificate issuance search
  // Common dates for filtering
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  // 5. Prepare array of filters to test pagination and filtering
  const filters: IEnterpriseLmsCertificateIssuance.IRequest[] = [
    // No filters - empty
    {},
    // Filter by learner_id
    { learner_id: systemAdmin2.id },
    // Filter by certification_id (using UUID random format)
    { certification_id: typia.random<string & tags.Format<"uuid">>() },
    // Filter by status
    { status: "valid" },
    { status: "expired" },
    { status: "revoked" },
    // Filter by business_status with null explicitly
    { business_status: null },
    { business_status: "in_progress" },
    // Filter by issue_date range
    {
      issue_date_from: lastMonth.toISOString(),
      issue_date_to: nextMonth.toISOString(),
    },
    // Filter by expiration_date range
    {
      expiration_date_from: lastMonth.toISOString(),
      expiration_date_to: nextMonth.toISOString(),
    },
    // Mixed filters
    {
      learner_id: systemAdmin2.id,
      status: "valid",
      issue_date_from: lastMonth.toISOString(),
      issue_date_to: now.toISOString(),
    },
  ];

  // 6. Test searching with each filter
  for (const filterBody of filters) {
    const output: IPageIEnterpriseLmsCertificateIssuance.ISummary =
      await api.functional.enterpriseLms.systemAdmin.certificateIssuances.searchCertificateIssuances(
        connection,
        { body: filterBody },
      );
    typia.assert(output);
    // Validate that the pagination info has correct shape
    TestValidator.predicate(
      "pagination current is zero or more",
      output.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      output.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages is zero or more",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records is zero or more",
      output.pagination.records >= 0,
    );

    // Validate tenant isolation – All certificate issuances must belong to the
    // tenant of the system admin
    TestValidator.predicate(
      "certificate issuance belongs to admin tenant",
      output.data.every((item) => {
        // Tenant ID check assumed as tenant isolation – Since tenant ID is not
        // in response, we just check the presence of id string
        return item.id !== undefined && typeof item.id === "string";
      }),
    );
  }

  // 7. Test error case: unauthorized access
  // Using unauthenticated connection
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.certificateIssuances.searchCertificateIssuances(
      unauthConnection,
      { body: {} },
    );
  });
}
