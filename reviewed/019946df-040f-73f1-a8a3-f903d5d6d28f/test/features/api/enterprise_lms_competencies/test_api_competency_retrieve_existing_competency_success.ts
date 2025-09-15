import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_competency_retrieve_existing_competency_success(
  connection: api.IConnection,
) {
  // Step 1: organizationAdmin join with tenant and valid email/password
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // Step 2: login to verify
  const loggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loggedIn);
  TestValidator.equals(
    "joined user id equals logged in user id",
    loggedIn.id,
    organizationAdmin.id,
  );

  // Step 3: create competency
  const code = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 10,
  });
  const name = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 15,
  });
  const description = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const competency: IEnterpriseLmsCompetencies =
    await api.functional.enterpriseLms.organizationAdmin.competencies.create(
      connection,
      {
        body: {
          tenant_id: tenantId,
          code: code,
          name: name,
          description: description,
        } satisfies IEnterpriseLmsCompetencies.ICreate,
      },
    );
  typia.assert(competency);
  TestValidator.equals(
    "competency tenant_id matches join tenant",
    competency.tenant_id,
    tenantId,
  );
  TestValidator.equals("competency code matches", competency.code, code);
  TestValidator.equals("competency name matches", competency.name, name);

  // Step 4: retrieve competency by id
  const competencyRetrieved =
    await api.functional.enterpriseLms.organizationAdmin.competencies.at(
      connection,
      {
        competencyId: competency.id,
      },
    );
  typia.assert(competencyRetrieved);

  TestValidator.equals(
    "retrieved competency id matches",
    competencyRetrieved.id,
    competency.id,
  );
  TestValidator.equals(
    "retrieved tenant_id matches",
    competencyRetrieved.tenant_id,
    competency.tenant_id,
  );
  TestValidator.equals(
    "retrieved code matches",
    competencyRetrieved.code,
    competency.code,
  );
  TestValidator.equals(
    "retrieved name matches",
    competencyRetrieved.name,
    competency.name,
  );

  // Step 5: verify timestamps presence
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof competencyRetrieved.created_at === "string" &&
      competencyRetrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof competencyRetrieved.updated_at === "string" &&
      competencyRetrieved.updated_at.length > 0,
  );

  // Step 6: retrieve non-existent competency - expect failure
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent competency throws error",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.competencies.at(
        connection,
        { competencyId: randomUuid },
      );
    },
  );
}
