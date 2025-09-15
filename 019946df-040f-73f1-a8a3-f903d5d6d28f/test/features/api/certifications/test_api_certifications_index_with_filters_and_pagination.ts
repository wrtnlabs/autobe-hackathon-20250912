import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertification";

export async function test_api_certifications_index_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join department manager user
  const createBody = {
    email: `testuser${RandomGenerator.alphaNumeric(6)}@department.com`,
    password: "SecurePass123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;
  const joined: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: createBody,
    });
  typia.assert(joined);
  typia.assert<string & tags.Format<"uuid">>(joined.tenant_id);

  // 2. Login department manager user
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;
  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Use tenantId from login response
  const tenantId = loggedIn.tenant_id;

  // Helper to perform searchCertifications calls with varied filters
  async function searchCerts(
    body: IEnterpriseLmsCertification.IRequest,
  ): Promise<IPageIEnterpriseLmsCertification.ISummary> {
    const result =
      await api.functional.enterpriseLms.departmentManager.certifications.searchCertifications(
        connection,
        { body },
      );
    typia.assert(result);
    return result;
  }

  // 3. Search with active status, sorted by name ascending, page 1, limit 5
  const req1 = {
    status: "active",
    orderBy: "name asc",
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsCertification.IRequest;
  const resp1 = await searchCerts(req1);

  // Validate pagination info
  TestValidator.predicate("page > 0", resp1.pagination.current === 1);
  TestValidator.predicate("limit > 0", resp1.pagination.limit > 0);
  TestValidator.predicate("pages >= 0", resp1.pagination.pages >= 0);
  TestValidator.predicate("records >= 0", resp1.pagination.records >= 0);
  TestValidator.predicate("limit <= 5", resp1.data.length <= 5);

  // Validate each certification matches status
  for (const cert of resp1.data) {
    TestValidator.equals("status is active", cert.status, "active");
    TestValidator.predicate(
      "id is present",
      typeof cert.id === "string" && cert.id.length === 36,
    );
    TestValidator.predicate("code is string", typeof cert.code === "string");
  }

  // 4. Edge case: empty filters (all certifications for tenant)
  const req2 = {} satisfies IEnterpriseLmsCertification.IRequest;
  const resp2 = await searchCerts(req2);
  TestValidator.predicate(
    "pagination current > 0",
    resp2.pagination.current > 0,
  );

  // 5. Edge case: zero page number
  const req3 = {
    page: 0,
    limit: 5,
  } satisfies IEnterpriseLmsCertification.IRequest;
  await TestValidator.error(
    "page 0 should cause error",
    async () => await searchCerts(req3),
  );

  // 6. Edge case: filter that matches no certs
  const req4 = {
    code: "NON_EXISTENT_CODE_123456",
  } satisfies IEnterpriseLmsCertification.IRequest;
  const resp4 = await searchCerts(req4);
  TestValidator.equals("no data returned", resp4.data.length, 0);

  // 7. Unauthenticated request error
  // Create a fresh connection with empty headers to simulate unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.enterpriseLms.departmentManager.certifications.searchCertifications(
      unauthConn,
      {
        body: {} satisfies IEnterpriseLmsCertification.IRequest,
      },
    );
  });
}
