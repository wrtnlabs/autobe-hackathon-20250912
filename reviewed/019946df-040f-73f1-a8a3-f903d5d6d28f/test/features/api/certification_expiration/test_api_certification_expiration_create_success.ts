import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import type { IEnterpriseLmsCertificationExpiration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertificationExpiration";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_certification_expiration_create_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as an Organization Admin user to obtain authorization context
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: typia.random<string & tags.Format<"uuid">>(),
        email: `orgadmin+${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "TestPassword123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(organizationAdmin);

  // 2. Create a new certification within the tenant organization
  const certificationBody = {
    tenant_id: organizationAdmin.tenant_id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsCertification.ICreate;

  const certification: IEnterpriseLmsCertification =
    await api.functional.enterpriseLms.organizationAdmin.certifications.createCertification(
      connection,
      { body: certificationBody },
    );
  typia.assert(certification);

  // 3. Create a certification expiration policy linked to the created certification
  const expirationBody = {
    certification_id: certification.id,
    expiration_period_days: Math.floor(Math.random() * 365) + 30,
    renewal_required: RandomGenerator.pick([true, false]),
    notification_period_days: Math.floor(Math.random() * 60),
  } satisfies IEnterpriseLmsCertificationExpiration.ICreate;

  const expiration: IEnterpriseLmsCertificationExpiration =
    await api.functional.enterpriseLms.organizationAdmin.certifications.certificationExpirations.createCertificationExpirationPolicy(
      connection,
      { certificationId: certification.id, body: expirationBody },
    );
  typia.assert(expiration);

  // Validate that returned expiration policy matches input values
  TestValidator.equals(
    "certification_id matches input",
    expiration.certification_id,
    certification.id,
  );
  TestValidator.equals(
    "expiration_period_days matches input",
    expiration.expiration_period_days,
    expirationBody.expiration_period_days,
  );
  TestValidator.equals(
    "renewal_required matches input",
    expiration.renewal_required,
    expirationBody.renewal_required,
  );
  TestValidator.equals(
    "notification_period_days matches input",
    expiration.notification_period_days,
    expirationBody.notification_period_days,
  );

  // Validate timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    typeof expiration.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
        expiration.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    typeof expiration.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
        expiration.updated_at,
      ),
  );
}
