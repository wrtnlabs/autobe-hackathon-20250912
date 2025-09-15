import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_certifications_get_detail_as_department_manager(
  connection: api.IConnection,
) {
  // 1. Department Manager user sign-up
  const departmentManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: "validPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. Department Manager login
  const departmentManagerLoggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: {
        email: departmentManagerEmail,
        password: "validPassword123!",
      } satisfies IEnterpriseLmsDepartmentManager.ILogin,
    });
  typia.assert(departmentManagerLoggedIn);
  // Verify auth user id same
  TestValidator.equals(
    "department manager id matches on login",
    departmentManagerLoggedIn.id,
    departmentManager.id,
  );

  // 3. Organization Admin user sign-up (to create certification)
  const organizationAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();

  // Generate a tenant id for organization admin and department manager to share
  // In real scenario, would be same tenant to test tenant isolation
  // Use departmentManager.tenant_id for tenant consistency
  const tenantId: string & tags.Format<"uuid"> = departmentManager.tenant_id;

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: organizationAdminEmail,
        password: "validPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 4. Organization Admin login
  const organizationAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: organizationAdminEmail,
        password: "validPassword123!",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(organizationAdminLoggedIn);

  // 5. Create a certification by organization admin
  const certificationCreateBody = {
    tenant_id: tenantId,
    code: `CERT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: `Certification ${RandomGenerator.name()}`,
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      { body: certificationCreateBody },
    );
  typia.assert(certification);

  // 6. Switch to department manager authentication token
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: departmentManagerEmail,
      password: "validPassword123!",
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 7. Department manager reads certification detail
  const certificationDetail: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.departmentManager.certifications.atCertification(
      connection,
      { certificationId: certification.id },
    );
  typia.assert(certificationDetail);

  TestValidator.equals(
    "certification id matches",
    certificationDetail.id,
    certification.id,
  );
  TestValidator.equals(
    "certification tenant id matches",
    certificationDetail.tenant_id,
    certification.tenant_id,
  );
  TestValidator.equals(
    "certification code matches",
    certificationDetail.code,
    certification.code,
  );
  TestValidator.equals(
    "certification name matches",
    certificationDetail.name,
    certification.name,
  );
  TestValidator.equals(
    "certification status matches",
    certificationDetail.status,
    certification.status,
  );

  // 8. Test invalid certification ID access by department manager
  await TestValidator.error(
    "department manager access invalid certification id should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.certifications.atCertification(
        connection,
        {
          certificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 9. Test unauthorized access: create a unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.enterpriseLms.departmentManager.certifications.atCertification(
      unauthenticatedConnection,
      { certificationId: certification.id },
    );
  });
}
