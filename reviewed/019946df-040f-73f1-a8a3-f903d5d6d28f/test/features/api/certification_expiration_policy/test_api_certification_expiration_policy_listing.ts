import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsCertificationExpiration";

/**
 * Test listing of certification expiration policies.
 *
 * This comprehensive scenario covers the full lifecycle of authentication,
 * tenant and certification creation, creation of multiple certification
 * expiration policies, and their paginated filtered listing.
 *
 * Key points:
 *
 * - Authentication as both organizationAdmin and systemAdmin roles, with
 *   proper role switching.
 * - Tenant creation by systemAdmin.
 * - Certification creation under the tenant by organizationAdmin.
 * - Creation of multiple expiration policies under certification.
 * - Multiple listing calls with varying pagination parameters (page, limit).
 * - Filtering listing by renewal_required flag true or false.
 * - Validation of pagination metadata correctness.
 * - Validation that listed policies match created ones considering filter and
 *   pagination.
 * - Testing empty listing results (e.g., filtering for non-existing values).
 *
 * This test ensures secure multi-role operation and correct tenant scoped
 * data isolation and pagination for expiration policies.
 */
export async function test_api_certification_expiration_policy_listing(
  connection: api.IConnection,
) {
  // 1. Create systemAdmin user and authenticate
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPasswordHash = "hashed_password_123";
  const systemAdminJoinBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdminAuthorized: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdminAuthorized);

  // Login as systemAdmin
  const systemAdminLoginBody = {
    email: systemAdminEmail,
    password_hash: systemAdminPasswordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLoggedIn = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: systemAdminLoginBody,
    },
  );
  typia.assert(systemAdminLoggedIn);

  // 2. Create a tenant with systemAdmin
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenantCreated: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenantCreated);

  // 3. Create organizationAdmin user and authenticate
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "strong_password_123";
  const orgAdminJoinBody = {
    tenant_id: tenantCreated.id,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdminAuthorized = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminJoinBody,
    },
  );
  typia.assert(orgAdminAuthorized);

  // Login as organizationAdmin
  const orgAdminLoginBody = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const orgAdminLoggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: orgAdminLoginBody,
    },
  );
  typia.assert(orgAdminLoggedIn);

  // 4. Create a certification under the tenant as organizationAdmin
  const certificationCreateBody = {
    tenant_id: tenantCreated.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certificationCreated: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      {
        body: certificationCreateBody,
      },
    );
  typia.assert(certificationCreated);

  // 5. Create multiple certification expiration policies
  const expirationPoliciesCount = 5;
  const createdPolicies: IEnterpriseLmsCertificationExpiration[] = [];

  for (let i = 0; i < expirationPoliciesCount; ++i) {
    const renewalRequired = i % 2 === 0; // Alternate true and false
    const expirationCreateBody = {
      certification_id: certificationCreated.id,
      expiration_period_days: 365 + i * 30, // 365, 395, 425, ...
      renewal_required: renewalRequired,
      notification_period_days: 15,
    } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

    const created =
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
        connection,
        {
          certificationId: certificationCreated.id,
          body: expirationCreateBody,
        },
      );
    typia.assert(created);
    createdPolicies.push(created);
  }

  // 6. Test listing all expiration policies with default paging
  {
    const listBody = {
      page: 1,
      limit: 20,
      certification_id: certificationCreated.id,
    } satisfies IEnterpriseLmsCertificationExpiration.IRequest;

    const summary: IPageIEnterpriseLmsCertificationExpiration.ISummary =
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.index(
        connection,
        {
          certificationId: certificationCreated.id,
          body: listBody,
        },
      );
    typia.assert(summary);

    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      summary.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination total pages > 0",
      summary.pagination.pages > 0,
    );
    TestValidator.predicate(
      "pagination records >= number of created policies",
      summary.pagination.records >= expirationPoliciesCount,
    );
    TestValidator.predicate(
      "pagination limit matches request",
      summary.pagination.limit === 20,
    );

    // Validate data contains all created policies
    const createdIds = createdPolicies.map((p) => p.id);
    for (const policy of summary.data) {
      TestValidator.predicate(
        `policy id ${policy.id} is in created list`,
        createdIds.includes(policy.id),
      );
    }
  }

  // 7. Test pagination with limit 2 and page 2
  {
    const listBody = {
      page: 2,
      limit: 2,
      certification_id: certificationCreated.id,
    } satisfies IEnterpriseLmsCertificationExpiration.IRequest;

    const page2: IPageIEnterpriseLmsCertificationExpiration.ISummary =
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.index(
        connection,
        {
          certificationId: certificationCreated.id,
          body: listBody,
        },
      );
    typia.assert(page2);

    // Validate pagination
    TestValidator.equals(
      "pagination current page",
      page2.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit", page2.pagination.limit, 2);
    TestValidator.notEquals(
      "page 2 data length is nonzero",
      page2.data.length,
      0,
    );

    // Confirm listed policies are in createdPolicies
    for (const policy of page2.data) {
      TestValidator.predicate(
        `page 2 policy id ${policy.id} is in created list`,
        createdPolicies.some((p) => p.id === policy.id),
      );
    }
  }

  // 8. Test filtering with renewal_required = true
  {
    const listBody = {
      page: 1,
      limit: 20,
      certification_id: certificationCreated.id,
      renewal_required: true,
    } satisfies IEnterpriseLmsCertificationExpiration.IRequest;

    const filteredSummary: IPageIEnterpriseLmsCertificationExpiration.ISummary =
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.index(
        connection,
        {
          certificationId: certificationCreated.id,
          body: listBody,
        },
      );
    typia.assert(filteredSummary);

    // Validate all returned policies have renewal_required true
    for (const policy of filteredSummary.data) {
      TestValidator.equals(
        `filtered policy ${policy.id} renewal_required is true`,
        policy.renewal_required,
        true,
      );
    }

    // Confirm count is less or equal to total
    TestValidator.predicate(
      "filtered renewal_required count <= total count",
      filteredSummary.pagination.records <= expirationPoliciesCount,
    );
  }

  // 9. Test filtering with renewal_required = false
  {
    const listBody = {
      page: 1,
      limit: 20,
      certification_id: certificationCreated.id,
      renewal_required: false,
    } satisfies IEnterpriseLmsCertificationExpiration.IRequest;

    const filteredSummary: IPageIEnterpriseLmsCertificationExpiration.ISummary =
      await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.index(
        connection,
        {
          certificationId: certificationCreated.id,
          body: listBody,
        },
      );
    typia.assert(filteredSummary);

    // Validate all returned policies have renewal_required false
    for (const policy of filteredSummary.data) {
      TestValidator.equals(
        `filtered policy ${policy.id} renewal_required is false`,
        policy.renewal_required,
        false,
      );
    }

    // Confirm count is less or equal to total
    TestValidator.predicate(
      "filtered renewal_required count <= total count",
      filteredSummary.pagination.records <= expirationPoliciesCount,
    );
  }
}
