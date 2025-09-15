import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This test performs E2E validation of the competency update process for an
 * organizationAdmin user. It covers creation, authenticated update, and
 * negative cases for non-existent ids.
 */
export async function test_api_competency_update_existing_competency_success(
  connection: api.IConnection,
) {
  // 1. Join as organizationAdmin
  const adminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: `AdminPass123!`,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a competency belonging to the tenant of the admin
  const competencyCreateBody = {
    tenant_id: admin.tenant_id,
    code: `CODE${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    name: `Competency ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEnterpriseLmsCompetencies.ICreate;

  const createdCompetency: IEnterpriseLmsCompetencies =
    await api.functional.enterpriseLms.organizationAdmin.competencies.create(
      connection,
      {
        body: competencyCreateBody,
      },
    );
  typia.assert(createdCompetency);

  // 3. Update the competency with new code, name, and description
  const competencyUpdateBody = {
    code: `NEWCODE${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    name: `Updated Competency ${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 })}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
  } satisfies IEnterpriseLmsCompetencies.IUpdate;

  const updatedCompetency: IEnterpriseLmsCompetencies =
    await api.functional.enterpriseLms.organizationAdmin.competencies.update(
      connection,
      {
        competencyId: createdCompetency.id,
        body: competencyUpdateBody,
      },
    );
  typia.assert(updatedCompetency);

  // Validate that the updated competency reflects the changes
  TestValidator.equals(
    "tenant_id remains unchanged after update",
    updatedCompetency.tenant_id,
    createdCompetency.tenant_id,
  );
  TestValidator.equals(
    "code updated correctly",
    updatedCompetency.code,
    competencyUpdateBody.code,
  );
  TestValidator.equals(
    "name updated correctly",
    updatedCompetency.name,
    competencyUpdateBody.name,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedCompetency.description,
    competencyUpdateBody.description,
  );

  // 4. Attempt to update a non-existent competency id, expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update on non-existent competency should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.competencies.update(
        connection,
        {
          competencyId: nonExistentId,
          body: competencyUpdateBody,
        },
      );
    },
  );
}
