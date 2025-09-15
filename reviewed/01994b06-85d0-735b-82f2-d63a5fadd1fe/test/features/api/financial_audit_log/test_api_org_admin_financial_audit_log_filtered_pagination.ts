import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformFinancialAuditLog";

/**
 * E2E test for multi-tenant filtered financial audit logs by org admin.
 *
 * 1. Register and login a healthcare platform system admin
 * 2. Register and login an organization admin (orgAdmin1)
 * 3. System admin creates a new organization
 * 4. Confirm organization visibility
 * 5. As org admin, perform PATCH /organizationAdmin/financialAuditLogs: a. With
 *    correct organization_id and self user_id, checked paginated result b. With
 *    unrelated user_id or organization_id, should get empty data
 * 6. Register/login a second organization admin (orgAdmin2)
 * 7. Attempt to access audit logs of org1 as orgAdmin2 (should get empty)
 */
export async function test_api_org_admin_financial_audit_log_filtered_pagination(
  connection: api.IConnection,
) {
  // Register & login system admin
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysPassword = RandomGenerator.alphaNumeric(10);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: sysPassword,
      provider: "local",
      provider_key: sysEmail,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      password: sysPassword,
      provider: "local",
      provider_key: sysEmail,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const orgName = RandomGenerator.name();
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // Register & login organization admin (orgAdmin1)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPw = RandomGenerator.alphaNumeric(10);
  const orgAdmin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPw,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin1);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPw,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // List audit logs of org1 as orgAdmin1 (with filter)
  const auditPage1 =
    await api.functional.healthcarePlatform.organizationAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: org.id,
          user_id: orgAdmin1.id,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformFinancialAuditLog.IRequest,
      },
    );
  typia.assert(auditPage1);
  // Results must only belong to org.id and orgAdmin1.id, or empty
  TestValidator.predicate(
    "all audit logs belong to correct org and user",
    auditPage1.data.every(
      (audit) =>
        audit.organization_id === org.id &&
        (audit.user_id ?? undefined) === orgAdmin1.id,
    ),
  );

  // Search with unrelated/random org/user - expect empty
  const randOrgId = typia.random<string & tags.Format<"uuid">>();
  const auditPageWrongOrg =
    await api.functional.healthcarePlatform.organizationAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: randOrgId,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformFinancialAuditLog.IRequest,
      },
    );
  typia.assert(auditPageWrongOrg);
  TestValidator.equals(
    "no logs for unrelated org",
    auditPageWrongOrg.data.length,
    0,
  );

  const randUserId = typia.random<string & tags.Format<"uuid">>();
  const auditPageWrongUser =
    await api.functional.healthcarePlatform.organizationAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: org.id,
          user_id: randUserId,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformFinancialAuditLog.IRequest,
      },
    );
  typia.assert(auditPageWrongUser);
  TestValidator.equals(
    "no logs for unrelated user",
    auditPageWrongUser.data.length,
    0,
  );

  // Register/login 2nd org admin
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2Pw = RandomGenerator.alphaNumeric(10);
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdmin2Pw,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin2Email,
      password: orgAdmin2Pw,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Try to access org1 audit logs as unrelated orgAdmin2
  const auditPageByOtherAdmin =
    await api.functional.healthcarePlatform.organizationAdmin.financialAuditLogs.index(
      connection,
      {
        body: {
          organization_id: org.id,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformFinancialAuditLog.IRequest,
      },
    );
  typia.assert(auditPageByOtherAdmin);
  TestValidator.equals(
    "other org admin cannot see org1 logs",
    auditPageByOtherAdmin.data.length,
    0,
  );
}
