import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new corporate learner user account with necessary details including
 * email, password hash, first name, last name, and status.
 *
 * The operation performs server-side password hashing before storing. Returns
 * the full corporate learner info including IDs and timestamps.
 *
 * @param props - Object containing the authenticated organization admin and
 *   request body for creation.
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the creation.
 * @param props.body - The corporate learner creation payload.
 * @returns The newly created corporate learner user record.
 * @throws {Error} If password hashing or database insertion fails.
 */
export async function postenterpriseLmsOrganizationAdminCorporatelearners(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCorporateLearner.ICreate;
}): Promise<IEnterpriseLmsCorporateLearner> {
  const { organizationAdmin, body } = props;

  const hashedPassword = await MyGlobal.password.hash(body.password);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_corporatelearner.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: hashedPassword,
      first_name: body.first_name,
      last_name: body.last_name,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
