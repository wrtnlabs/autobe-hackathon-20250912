import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_competency_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: organizationAdmin user signs up
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const joinBody = {
    tenant_id: tenantId,
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Step 2: organizationAdmin user logs in
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  const loggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  TestValidator.equals("tenant_id after login", loggedIn.tenant_id, tenantId);

  // Step 3: Create a new competency with unique code
  const code = `COMP-${RandomGenerator.alphaNumeric(8)}`;
  const competencyCreateBody = {
    tenant_id: tenantId,
    code,
    name: RandomGenerator.name(2),
    description: `Description for competency ${code}`,
  } satisfies IEnterpriseLmsCompetencies.ICreate;

  const competency: IEnterpriseLmsCompetencies =
    await api.functional.enterpriseLms.organizationAdmin.competencies.create(
      connection,
      {
        body: competencyCreateBody,
      },
    );
  typia.assert(competency);

  TestValidator.equals("competency tenant_id", competency.tenant_id, tenantId);
  TestValidator.equals("competency code", competency.code, code);
  TestValidator.equals(
    "competency name",
    competency.name,
    competencyCreateBody.name,
  );
  TestValidator.equals(
    "competency description",
    competency.description ?? null,
    competencyCreateBody.description ?? null,
  );

  // Step 4: Attempt to create duplicate competency with the same code - expect error
  await TestValidator.error(
    "creating duplicate competency code should throw",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.competencies.create(
        connection,
        {
          body: {
            tenant_id: tenantId,
            code,
            name: RandomGenerator.name(2),
          } satisfies IEnterpriseLmsCompetencies.ICreate,
        },
      );
    },
  );
}
